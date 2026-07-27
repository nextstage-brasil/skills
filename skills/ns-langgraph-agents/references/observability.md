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
| `llm_logs` | model, tokens, latency, truncated prompt/response |
| `tool_executions` | capability_id, fingerprint, status, duration |

Run `initDb()` + migrations before `getGraph()` on HTTP startup.

## LLM instrumentation

Centralize in `llm/json-output.ts` (or equivalent):

- Log before/after each call
- Record input/output token estimates
- Never log raw secrets from `configurable`

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

- Tokens per thread / tenant
- Tool error rate by `capability_id`
- P95 latency per node
- Interrupt rate (HITL)

Use `trace.json`-style export for offline analysis when full APM is not wired.

## Privacy

- Anonymize PII in logs when required
- Truncate message bodies in `llm_logs`
- Separate retention policy for checkpoints vs audit
