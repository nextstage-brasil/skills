# Observability

Production agents need **audit-grade** logs independent of optional tracing products.

## Layers

| Layer | Purpose | Default |
| ----- | ------- | ------- |
| Postgres audit | Threads, LLM calls, tool executions, checkpoints | Required in prod |
| Run context | `threadId`, `tenantId`, `nodeName` via AsyncLocalStorage | Required |
| LangSmith | Trace debugging, datasets | Opt-in `LANGSMITH_ENABLED=true` |
| OpenTelemetry | GenAI spans to Tempo/Datadog | Opt-in `OTEL_ENABLED=true` |

Postgres remains source of truth when OTel/LangSmith are off.

## Run context

Wrap every `graph.invoke` / `stream` in HTTP handlers:

```typescript
await runStorage.run({ threadId, tenantId }, async () => {
  await graph.invoke(input, buildRunConfig(threadId, { tenantId }));
});
```

Instrument LLM and tools inside run context so logs auto-attach `thread_id`.

## buildRunConfig

Always pass second argument to invoke:

```typescript
{
  configurable: { thread_id: threadId, ...secrets },
  metadata: { tenant_id: tenantId },
  tags: ["agent-api", tenantId],
}
```

Required for checkpointer resume and LangSmith threading.

## Postgres schema (minimum)

| Table | Holds |
| ----- | ----- |
| `tenants` | tenant registry |
| `threads` | conversation metadata |
| `agent_checkpoints` | long-term store namespaces |
| `llm_logs` | model, tokens, latency, truncated prompt/response, **`stage`** |
| `tool_executions` | capability_id, fingerprint, status, duration |
| `turn_decisions` | JSONB audit per checkpoint — route, bypass, budget exit (optional migration) |

Run `initDb()` + migrations before `getGraph()` on HTTP startup.

### llm_logs.stage

Tag every `logLlmCall` with pipeline stage:

| Stage | Typical node |
| ----- | ------------ |
| `intent` | Light router |
| `gather` / `analyst` | Bounded ReAct tool loop |
| `composer` | Sole user-facing writer |
| `summarize` | Context compaction |

Enables cost/latency breakdown without LangSmith.

### turn_decisions

Ephemeral state channel `turnDecisions[]` → persist to `turn_decisions` JSONB on checkpoint anchor (UPDATE on turn end). Fields: route taken, bypass reason, budget hit, error codes.

### Costs by thread

View `view_costs_by_thread` (or equivalent):

- Sum priced `llm_logs` per `thread_id`
- `unpriced_calls` column — NULL model/pricing ≠ zero cost
- Match ILIKE specific unpriced patterns before generic bucket

## LLM instrumentation

Centralize in `llm/json-output.ts` (or equivalent):

- Log before/after each call with **`stage`**
- Record input/output token estimates
- **`prompt_raw`**: log structured HumanMessage payload (truncated) — not only user question string
- Never log raw secrets from `configurable`
- **SoT redaction**: redact secrets in Postgres `llm_logs` inputs — not only tracer/LangSmith

Every LLM-calling node sets `llm_log_id` on tool executions it triggers — avoid orphan `tool_executions`.

## Tool instrumentation

Every MCP/local/skill execution → `logToolExecution` with redacted args.

## Dev vs prod

| | Tests | Dev/Prod |
| - | ----- | -------- |
| Checkpointer | `memory` | `postgres` |
| DATABASE_URL | unset | required |
| LLM | disabled/stub | live |
| Tracing | off | optional on |

## Dashboards

Minimum KPIs:

- Tokens per thread / tenant (`view_costs_by_thread`)
- Unpriced LLM calls per thread
- Tool error rate by `capability_id`
- P95 latency per node and per `llm_logs.stage`
- Interrupt rate (HITL)
- Fidelity alert rate (observability-only — see `evidence-and-fidelity.md`)

Use `trace.json`-style export for offline analysis when full APM is not wired.

## Privacy

- Anonymize PII in logs when required
- Truncate message bodies in `llm_logs`
- Separate retention policy for checkpoints vs audit
