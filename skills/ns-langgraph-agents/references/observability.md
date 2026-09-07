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
| `llm_logs` | model id + **prompt version**, tokens, latency, truncated prompt/response, **`stage`** |
| `tool_executions` | capability_id, fingerprint, status, duration |
| `turn_decisions` | JSONB audit per checkpoint — route, bypass, budget exit, decision reason |

`initDb()` + migrations before `getGraph()` on HTTP startup.

### llm_logs.stage

Every `logLlmCall` tagged:

| Stage | Typical node |
| ----- | -------------- |
| `analyst` | JSON planner |
| `executor` | Tool/MCP hop |
| `composer` | Sole user-facing writer |
| `summarize` | Context compaction |

Cost/latency breakdown without LangSmith.

### turn_decisions

Required in prod. Ephemeral `turnDecisions[]` flushes into `turn_decisions` JSONB on checkpoint anchor via **merge/append**. Route, bypass reason, budget hit, error codes, planner `raciocinio` when present. HITL resume appends; does not replace.

Acceptance: a reviewer with Postgres only can reconstruct **what ran and why** — nodes, tools, route, stop/HITL, **who approved**, **model id**, **prompt version**, **confidence score + threshold**, retrieved RAG ids when used. Truncate bodies; keep the decision fields. `llm_logs`, `tool_executions`, `hitl_decisions` = **INSERT-only**. Corrections = new events, never UPDATE/DELETE of history.

`turn_decisions` JSONB on the turn checkpoint is a **flush of an event array**. Resume after `interrupt()` **MUST merge/append** — **FORBIDDEN** replace of the pre-interrupt array (clobber). See `mergeTurnDecisions`.

Canonical HITL / Gateway fields: `ns-agent-architecture` `gateway-calibration.md` (`decision_actor`, `approver_id`, `approver_role`, `decided_at` plus prior set).

Regulated tenants: no audit opt-out. Legal WORM / e-sign / 21 CFR Part 11 / EU AI Act Art. 12 storage = **external SoT** — this runtime reconstructs the turn; it does not claim legal immutability. MVP skip: document in `graph-spec.md`.

Prod metadata: copy `decision_record` from `graph-spec.md` (`docs/specs/agent-architecture.md`) onto invoke `metadata` / tags. Runtime audit explains the turn; that path explains **why this graph exists**. Do not dump the Why table into Postgres.

Log provider reasoning blocks (redacted) into `llm_logs` or `turn_decisions`. Opt-out only with a written retention/PII reason in spec. Never stream that text to end-user chat.

### Costs by thread

`view_costs_by_thread` (or equivalent):

- Sum priced `llm_logs` per `thread_id`
- `unpriced_calls` — NULL pricing ≠ zero cost
- ILIKE specific unpriced patterns before generic bucket

Tenant/turn **budget:** check and reserve **before** the LLM/tool call, same sync step — no `await` between check and debit. After-the-fact sum only documents an overrun.

Wire into stop conditions: `max_cost_per_turn` / `AGENT_MAX_COST_PER_TURN` in `templates/contracts/rules-contract.md` and `references/error-and-reliability.md`. On reservation miss, stop new work (`turn_cost_budget_exceeded`); not a soft log-only signal.

## LLM instrumentation

Centralize `llm/json-output.ts` (or equivalent):

- Log before/after with **`stage`**
- Input/output token estimates
- **`prompt_raw`**: structured HumanMessage payload (truncated) — not user question string only
- Never log raw secrets from `configurable`
- **SoT redaction**: secrets in Postgres `llm_logs` inputs — not only tracer/LangSmith

Every LLM node sets `llm_log_id` on triggered tool executions — no orphan `tool_executions`. Persist reasoning blocks with the call (see above) — not only `prompt_raw`.

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
- HITL reject rate / accept-without-edit (quality — infra green can hide model drift)
- Fidelity alert rate (observability-only — `evidence-and-fidelity.md`)

`trace.json` export when full APM missing.

## Privacy

- Anonymize PII when required
- Truncate bodies in `llm_logs`
- Separate retention checkpoints vs audit
