# Error handling and reliability

## Error taxonomy

| Layer | Example | Agent behavior |
| ----- | ------- | -------------- |
| Tool execution | "Issue not found" | `ToolMessage` `status: "error"` — model recovers |
| Tool transport | MCP timeout, 502 | Log + retry; may abort turn |
| LLM provider | Rate limit, invalid JSON | Retry/backoff; fallback prompt |
| Planner/guard | Invalid action enum | Circuit breaker |
| Graph | Uncaught exception | SSE/HTTP `failed` + checkpoint preserved |

MCP: distinguish `CallToolResult(isError=true)` from protocol failure. Only latter may crash without tool message.

## Circuit breaker (structured planners)

Model returns JSON plans:

1. Parse JSON
2. Validate action enum + tool in allowlist
3. Fail: one auto-repair prompt
4. Second fail: user-visible error — no infinite loop

## Retries

| Operation | Retry |
| --------- | ----- |
| Idempotent reads | 2–3 exponential backoff |
| Writes | No blind retry — idempotency keys or HITL |
| LLM JSON parse | Once without JSON mode |
| MCP connect | Startup only — not per message |

## Stop conditions

`rules` contract (`templates/contracts/rules-contract.md`):

- `max_steps` / `max_tool_calls` / `max_mcp_calls` per turn
- `max_duration_seconds`
- `TURN_LATENCY_BUDGET_MS` — HTTP wall-clock (distinct from tool budget)
- No progress (same tool+args repeated)
- Human denies sensitive tools

### Turn latency budget

| Env | Default | On exceed |
| --- | ------- | --------- |
| `TURN_LATENCY_BUDGET_MS` | 60000 | SSE/HTTP `failed`, `error_code: turn_latency_budget_exceeded` |

Tool budget OK but turn slow: explicit timeout — not silent stall or client-only `cancelled`.

### Gather LLM failure

No silent `break` on gather `invoke` fail. Set `errorCode` or `externalError`; route composer apology or terminal `failed`. `references/anti-patterns.md`.

## Graceful degradation

| Failure | Degrade to |
| ------- | ---------- |
| MCP server down | Inform user; local-only tools |
| Summarizer light model fails | Trim only |
| OTel exporter down | Postgres audit continues |
| LangSmith off | `buildRunConfig` still sets `thread_id` |

## Idempotency

- Create tools: client idempotency keys in `configurable`
- Fingerprints detect duplicate executions across retries

## Testing errors

- Unit: transport throws → structured failure
- Unit: `isError` → `ToolMessage` `status: "error"`
- Integration: circuit breaker after N invalid planner outputs

Snippet: `tool-error-handling.ts.snippet`.
