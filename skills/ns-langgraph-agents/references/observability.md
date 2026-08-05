# Observability

Production agents need **audit-grade** logs without optional tracing.

## Layers

| Layer | Purpose | Default |
| ----- | ------- | ------- |
| Postgres audit | Threads, LLM calls, tools, checkpoints | Required prod |
| Run context | `threadId`, `tenantId`, `nodeName` via AsyncLocalStorage | Required |
| LangSmith | Trace debug, datasets | Opt-in `LANGSMITH_ENABLED=true` |
| OpenTelemetry | GenAI spans | Opt-in `OTEL_ENABLED=true` |

Postgres = SoT when OTel/LangSmith off.

## Run context

Wrap every `graph.invoke` / `stream`:

```typescript
await runStorage.run({ threadId, tenantId }, async () => {
  await graph.invoke(input, buildRunConfig(threadId, { tenantId }));
});
```

LLM + tools inside run context — logs attach `thread_id`.

## buildRunConfig

Second arg to invoke always:

```typescript
{
  configurable: { thread_id: threadId, ...secrets },
  metadata: { tenant_id: tenantId },
  tags: ["agent-api", tenantId],
}
```

Required for checkpointer resume + LangSmith threading.

## Postgres schema (minimum)

| Table | Holds |
| ----- | ----- |
| `tenants` | tenant registry |
| `threads` | conversation metadata |
| `agent_checkpoints` | long-term store namespaces |
| `llm_logs` | model, tokens, latency, truncated prompt/response, **`stage`** |
| `tool_executions` | capability_id, fingerprint, status, duration |
| `turn_decisions` | JSONB audit per checkpoint — route, bypass, budget exit (optional migration) |

`initDb()` + migrations before `getGraph()` on HTTP startup.

### llm_logs.stage

Every `logLlmCall` tagged:

| Stage | Typical node |
| ----- | -------------- |
| `intent` | Light router |
| `gather` / `analyst` | Bounded ReAct loop |
| `composer` | Sole user-facing writer |
| `summarize` | Context compaction |

Cost/latency breakdown without LangSmith.

### turn_decisions

Ephemeral `turnDecisions[]` → `turn_decisions` JSONB on checkpoint anchor (UPDATE turn end). Route, bypass reason, budget hit, error codes.

### Costs by thread

`view_costs_by_thread` (or equivalent):

- Sum priced `llm_logs` per `thread_id`
- `unpriced_calls` — NULL pricing ≠ zero cost
- ILIKE specific unpriced patterns before generic bucket

## LLM instrumentation

Centralize `llm/json-output.ts` (or equivalent):

- Log before/after with **`stage`**
- Input/output token estimates
- **`prompt_raw`**: structured HumanMessage payload (truncated) — not user question string only
- Never log raw secrets from `configurable`
- **SoT redaction**: secrets in Postgres `llm_logs` inputs — not only tracer/LangSmith

Every LLM node sets `llm_log_id` on triggered tool executions — no orphan `tool_executions`.

## Tool instrumentation

Every MCP/local/skill execution → `logToolExecution` with redacted args.

## Dev vs prod

| | Tests | Dev/Prod |
| - | ----- | -------- |
| Checkpointer | `memory` | `postgres` |
| DATABASE_URL | unset | required |
| LLM | disabled/stub | live |
| Tracing | off | optional |

## Dashboards

Minimum KPIs:

- Tokens per thread/tenant (`view_costs_by_thread`)
- Unpriced LLM calls per thread
- Tool error rate by `capability_id`
- P95 latency per node + per `llm_logs.stage`
- Interrupt rate (HITL)
- Fidelity alert rate (observability-only — `evidence-and-fidelity.md`)

`trace.json` export when full APM missing.

## Privacy

- Anonymize PII when required
- Truncate bodies in `llm_logs`
- Separate retention checkpoints vs audit
