# Streaming and human-in-the-loop

## Interaction modes

| Mode | HTTP | Graph |
| ---- | ---- | ----- |
| `sync_json` | JSON response after `invoke` | standard |
| `streaming_sse` | `text/event-stream` | `stream` / `streamEvents` v3 |

Lock mode in `graph-spec.md` header.

## SSE envelope

Statuses (in order of a typical turn):

| Status | Meaning |
| ------ | ------- |
| `thinking` | Model started |
| `accessing_data` | Optional progress hint |
| `tool_started` | Tool name + args summary |
| `tool_finished` | Truncated result summary |
| `response_streaming` | Cumulative markdown text (replace prior) |
| `completed` | Terminal success |
| `failed` | Terminal error |
| `cancelled` | Client abort |

Rules:

- Terminal status must be **last** event
- `response_streaming` sends full cumulative text each tick (UI replaces)
- Do not leak raw reasoning blocks in user stream

Snippet: `templates/snippets/sse-envelope.ts.snippet`.

## HITL with interrupt()

Preferred over static breakpoints:

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

- Compiled graph with **checkpointer**
- `thread_id` in config
- Resume: `graph.stream(new Command({ resume: userInput }), config)`

## Detecting interrupts

With `streamEvents` v3:

- Check `stream.interrupted` and read `stream.interrupts`
- Resume loop until not interrupted

With `invoke`: call `graph.getState(config)` to read interrupt payload.

## HTTP routes (minimum)

```
POST /threads              → create thread_id
POST /threads/:id/message  → run graph (sync or SSE)
POST /threads/:id/resume   → HITL resume with Command
GET  /health
```

Optional: `GET /dev-chat` gated by `DEV_CHAT_ENABLED` for internal QA.

## Postman

Keep collection in sync with routes — executable contract for integrators.

## UX notes

- Show tool progress without dumping full JSON
- On interrupt, render approval UI with editable args when safe
- Preserve `thread_id` client-side for resume
