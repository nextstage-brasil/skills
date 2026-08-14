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
| `thinking` | Model started |
| `accessing_data` | Optional progress |
| `tool_started` | Tool name + args summary |
| `tool_finished` | Truncated result summary |
| `response_streaming` | Cumulative markdown (replace prior) |
| `completed` | Terminal success |
| `failed` | Terminal error |
| `cancelled` | Client abort |

Rules:

- Terminal status **last** event
- `response_streaming` full cumulative text each tick
- No raw reasoning in user stream

Snippet: `sse-envelope.ts.snippet`.

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

### Dev-chat (greenfield)

| Context | Requirement |
| ------- | ----------- |
| Greenfield `streaming_sse` agent-api | **MUST** `GET /dev-chat` + `DEV_CHAT_ENABLED=true` (local-only; prod only with explicit product decision) |
| Brownfield | **RECOMMENDED** if missing — same SSE as production |

Dev-chat = same SSE envelope as `POST /threads/:id/message`. Without it, human MCP iteration impractical.

### Turn latency budget

`TURN_LATENCY_BUDGET_MS` (default 60000) at HTTP layer. Exceed: SSE `failed` + `error_code: turn_latency_budget_exceeded` — not client `cancelled`. `references/error-and-reliability.md`.

## Postman

Collection synced with routes — executable contract.

## UX notes

- Tool progress without full JSON dump
- Interrupt UI: editable args when safe
- Client keeps `thread_id` for resume
