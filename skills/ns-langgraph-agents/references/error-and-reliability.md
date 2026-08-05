# Error handling and reliability

## Error taxonomy

| Layer | Example | Agent behavior |
| ----- | ------- | -------------- |
| Tool execution | "Issue not found" | `ToolMessage` `status: "error"` — model recovers |
| Tool transport | MCP timeout, 502 | Log + retry policy; may abort turn |
| LLM provider | Rate limit, invalid JSON | Retry/backoff; fallback prompt |
| Planner/guard | Invalid action enum | Circuit breaker — stop or correct |
| Graph | Uncaught exception | SSE/HTTP `failed` + checkpoint preserved |

MCP adapters: distinguish `CallToolResult(isError=true)` from protocol failure. Only the latter should crash the run without a tool message.

## Circuit breaker (structured planners)

When the model must return JSON plans (actions, tool names):

1. Parse JSON
2. Validate action enum and tool exists in allowlist
3. On failure: one auto-repair prompt with explicit error
4. On second failure: stop with user-visible error — do not infinite loop

## Retries

| Operation | Retry |
| --------- | ----- |
| Idempotent reads | 2–3 with exponential backoff |
| Writes | No blind retry — use idempotency keys or HITL |
| LLM JSON parse | Once without JSON mode |
| MCP connect | On startup only — not per message |

## Stop conditions

Enforce in `rules` contract (see `templates/contracts/rules-contract.md`):

- `max_steps` / `max_tool_calls` / `max_mcp_calls` per turn
- `max_duration_seconds`
- `TURN_LATENCY_BUDGET_MS` — wall-clock cap at HTTP layer (distinct from tool budget)
- No progress detection (same tool+args repeated)
- Human denial on sensitive tools

### Turn latency budget

| Env | Default | On exceed |
| --- | ------- | --------- |
| `TURN_LATENCY_BUDGET_MS` | 60000 | SSE/HTTP `failed` with `error_code: turn_latency_budget_exceeded` |

Tool budget OK but turn still slow → user must see explicit timeout — not silent stall or client-only `cancelled`.

### Gather LLM failure

Never silent `break` on gather `invoke` failure. Set `errorCode` (or `externalError`) on state; route to composer apology or terminal `failed`. See `references/anti-patterns.md`.

## Graceful degradation

| Failure | Degrade to |
| ------- | ---------- |
| MCP server down | Inform user; offer local-only tools |
| Summarizer light model fails | Trim only — no crash |
| OTel exporter down | Continue — Postgres audit still works |
| LangSmith off | `buildRunConfig` still sets `thread_id` |

## Idempotency

- Tool nodes that create resources should accept client-supplied idempotency keys in `configurable`.
- Log fingerprints to detect duplicate executions across retries.

## Testing errors

- Unit: transport throws → handler returns structured failure
- Unit: `isError` tool result → `ToolMessage` with `status: "error"`
- Integration: circuit breaker stops after N invalid planner outputs

Snippet: `templates/snippets/tool-error-handling.ts.snippet`.
