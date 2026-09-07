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

Empty lookup: same success keys, explicit `null`s, short next-step hint — not a generic throw. “Not found” ≠ “does not exist.”

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
- `max_cost_per_turn` / `AGENT_MAX_COST_PER_TURN` — reserved spend before next LLM/tool call (`observability.md` Costs by thread)
- No progress (same tool+args repeated)
- Human denies sensitive tools
- Iteration limit on task that **must complete** → **escalate to Approval Gate** with last observation — not silent partial / `failed`

### Turn latency budget

| Env | Default | On exceed |
| --- | ------- | --------- |
| `TURN_LATENCY_BUDGET_MS` | 60000 | Stop new LLM/tool work; composer on existing evidence, else `failed` + `turn_latency_budget_exceeded` |

Tool budget OK but turn slow: explicit timeout — not silent stall or client-only `cancelled`. Partial reply beats empty `failed` when channels already hold evidence.

### Turn cost budget

| Env / rule | Default | On exceed |
| ---------- | ------- | --------- |
| `max_cost_per_turn` / `AGENT_MAX_COST_PER_TURN` | product-set | Stop new LLM/tool work; composer on existing evidence, else `failed` + `turn_cost_budget_exceeded` |

Reserve **before** the call (same sync step as debit check — `observability.md`). After-the-fact sum documents overrun only; not a stop gate by itself.

### Gather LLM failure

No silent `break` on gather `invoke` fail. Set `errorCode` or `externalError`; route composer apology or terminal `failed`. `references/anti-patterns.md`.

## Availability vs consistency

Worker or MCP server stops answering: decide **per block**, not globally.

| Choice | When | Record |
| ------ | ---- | ------ |
| **Block** (consistency) | Wrong/partial answer unsafe; write depends on missing data | Wait / fail turn; reason on `turnDecisions` |
| **Proceed with gap** (availability) | Partial answer OK; gap must be explicit to user/audit | Continue; gap id + missing dependency on `turnDecisions` |

Never silent omit. Composer must surface recorded gaps when proceeding.

## Compensation for multi-write plans

Multi-write plan (create A, update B, notify C): each write declares **compensating action**. On failure mid-plan:

1. Apply compensations in **reverse** order of successful writes
2. Compensations themselves **idempotent**
3. Write with **no possible compensation**: must sit behind **sync gate** (HITL or deterministic confirm) before execute

Checkpoint rollback alone ≠ compensation for external side effects. No compensation and no sync gate = anti-pattern.

## Concurrent turns on one thread

Two turns may race on shared state or artifact.

| Rule | Behavior |
| ---- | -------- |
| Optimistic version | Read version; write only if unchanged |
| Conflict | Reject write; reconcile (retry with merge or HITL) |
| Forbidden | Silent last-write-wins on shared artifact |

Version field on shared records/artifacts. Surface conflict to operator — do not overwrite.

## Parallel producer staleness

Two parallel agents both succeed; one started on stale input — divergence silent without version records.

| Rule | Behavior |
| ---- | -------- |
| Two-version record | Each producer stores **input version at start** and **version current at completion** |
| Mismatch | Output stale even if call succeeded |
| Consistency check | After fan-out joins, **per producer** |
| Compensate | **Only** the stale producer — re-run consistent sibling = waste + new divergence risk |
| Undetectable without both versions | Whole point of the record |

### Fan-out aggregation

Reject-on-first-failure discards sibling good result. **Settle-all** preserves siblings → retry = failed branch only, not both. Doctrine name: settle-all. JS form: `Promise.allSettled`.

## Graceful degradation

| Failure | Degrade to |
| ------- | ---------- |
| MCP server down | Inform user; local-only tools — or block if consistency required for that block |
| Summarizer light model fails | Trim only |
| OTel exporter down | Postgres audit continues |
| LangSmith off | `buildRunConfig` still sets `thread_id` |
| Low confidence / empty evidence | Composer clarify or reduced answer; do not invent; log reason on `turnDecisions` |
| Turn latency budget hit | Composer on current channels; `failed` only if nothing to narrate |
| Turn cost budget hit | Same as latency budget; code `turn_cost_budget_exceeded` |
| Partial multi-write fail | Compensate prior writes; do not blind-replay whole plan |
| Iteration limit, task must complete | Escalate Approval Gate + last observation — not silent partial |
| Parallel producer stale | Compensate stale producer only |

## Idempotency

- Create tools: client idempotency keys in `configurable`
- Fingerprints detect duplicate executions across retries
- Compensating writes: same idempotency discipline

## Testing errors

- Unit: transport throws: structured failure
- Unit: `isError`: `ToolMessage` `status: "error"`
- Integration: circuit breaker after N invalid planner outputs
- Integration: last write fails: earlier writes compensated (not full plan replay)
- Unit/integration: concurrent edit: version conflict, not silent overwrite
- Integration: two parallel producers, one stale — only stale compensated
- Integration: fan-out one branch fails — sibling result survives (settle-all)

Snippet: `tool-error-handling.ts.snippet`.
