# Streaming and human-in-the-loop

## Interaction modes

| Mode | HTTP | Graph |
| ---- | ---- | ----- |
| `sync_json` | JSON after `invoke` | standard |
| `streaming_sse` | `text/event-stream` | `stream` / `streamEvents` v3 |

Lock in `graph-spec.md` header.

## SSE envelope

Typical turn order:

| Status | Meaning |
| ------ | ------- |
| `thinking` | Operator progress — hop 0 generic copy; later hops `userFacingIntent` from state. Not raw model reasoning |
| `accessing_data` | Optional progress |
| `tool_started` | Tool name + args summary (executor) |
| `tool_finished` | Truncated result summary (executor) |
| `response_streaming` | Cumulative markdown (replace prior) — **composer only** |
| `completed` | Terminal success |
| `failed` | Terminal error |
| `cancelled` | Client abort |

Rules:

- Terminal status **last** event
- `response_streaming` full cumulative text each tick
- No raw reasoning in user stream
- Operator progress is `thinking` (or `tool_*`), never `response_streaming`

Snippet: `sse-envelope.ts.snippet`.

## Operator progress (JSON planner hops)

Greenfield `streaming_sse` + planner/analyst structured JSON (no `bindTools` on that hop): **MUST**.

1. Planner LLM returns `executionPlan` + `userFacingIntent` in one JSON object — `templates/contracts/planner-contract.md`. **`userFacingIntent` MUST be in the same language as the current user message** (not English unless that message is English).
2. Persist both on `AgentState`. Do **not** append the intent line to `messages`.
3. At **planner node entry**, before the next invoke:
   - hop 0 (`analystIteration === 0` or equivalent): emit `thinking` with generic copy from `conversation/presentation/` (product language)
   - later hops: emit `thinking` with `state` `userFacingIntent` (or `analysis.userFacingIntent`) from the **previous** hop
4. After tools run, executor emits `tool_started` then `tool_finished` (presentation copy, not tool JSON dump).
5. Composer remains the only writer of `response_streaming`.

Open ReAct + `ToolNode`: skip `userFacingIntent`; `tool_started` / `tool_finished` is enough.

Static strings (“planning…”, “fetching data…”) live in `src/conversation/presentation/` or locale — not in `graph/` and not in `base_invariant` as product copy.

## HITL with interrupt()

Prefer over static breakpoints:

```typescript
import { interrupt } from "@langchain/langgraph";

const approval = interrupt({
  kind: "tool_approval",
  tool: call.name,
  args: call.args,
});
// resume value becomes `approval`
```

Requirements:

- Compiled graph + **checkpointer**
- `thread_id` in config
- Resume: `graph.stream(new Command({ resume: userInput }), config)`

## Detecting interrupts

`streamEvents` v3: `stream.interrupted`, `stream.interrupts` — resume until clear.

`invoke`: `graph.getState(config)` for interrupt payload.

## HTTP routes (minimum)

```
POST /threads              → create thread_id
POST /threads/:id/message  → run graph (sync or SSE)
POST /threads/:id/resume   → HITL resume with Command
GET  /health
GET  /dev-chat             → human train/test UI (greenfield streaming_sse MUST)
```

### Who is the HTTP client

| `product_class` | Client | Rule |
| --------------- | ------ | ---- |
| `agent_runtime` | Direct HTTP client (CLI, Postman, dev-chat, integrator) | Browser may hit agent-api when product is the runtime itself |
| `intelligent_saas` | **Application** on internal network | Browser **never** calls agent-api; App owns `thread_id`, relays SSE envelope unchanged |

`intelligent_saas` SoT: `ns-spec-driven/references/stacks/intelligent-saas.md` Conversation hop.

### Dev-chat (greenfield)

| Context | Requirement |
| ------- | ----------- |
| Greenfield `streaming_sse` agent-api | **MUST** `GET /dev-chat` + `DEV_CHAT_ENABLED=true` (local-only; prod only with explicit product decision) |
| Brownfield | **RECOMMENDED** if missing — same SSE as production |
| `intelligent_saas` product | **FORBIDDEN** — `/dev-chat` is operator training on agent-api, not end-user chat; product chat goes through Application |

Dev-chat = same SSE envelope as `POST /threads/:id/message`. Without it, human MCP iteration impractical. Not a substitute for Application relay in intelligent SaaS.

### Turn latency budget

`TURN_LATENCY_BUDGET_MS` (default 60000) at HTTP layer. Exceed: stop new work; partial composer if evidence exists, else `failed` + `turn_latency_budget_exceeded`. Not client `cancelled`. `references/error-and-reliability.md`.

## Postman

Collection synced with routes — executable contract.

## UX notes

- Tool progress without full JSON dump
- Planner operator line via `thinking`, not as streamed Markdown
- Interrupt UI: editable args when safe
- `thread_id` for resume: `agent_runtime` — HTTP client keeps `thread_id`; `intelligent_saas` — Application owns and maps `thread_id` (browser never holds it)
