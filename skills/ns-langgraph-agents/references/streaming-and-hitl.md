# Streaming and human-in-the-loop

## Interaction modes

| Mode | HTTP | Graph |
| ---- | ---- | ----- |
| `sync_json` | JSON after `invoke` | standard |
| `streaming_sse` | `text/event-stream` | `stream` modes `values` + `custom` |

Lock in `graph-spec.md` header.

## SSE envelope

Typical turn order:

| Status | Meaning |
| ------ | ------- |
| `thinking` | Operator progress — hop 0 generic copy; later hops `userFacingIntent` from state. Not raw model reasoning |
| `accessing_data` | Optional progress |
| `tool_started` | Tool name + args summary (executor) |
| `tool_finished` | Truncated result summary (executor) |
| `response_streaming` | Cumulative markdown (replace prior) — **composer only**; **draft** until Approval Gate clears when HITL applies |
| `completed` | Terminal success — repeats final message; optional `render_spec` / `paint` |
| `interrupted` | Terminal pause — HITL pending. Payload `interrupt: { kind, question, options: [{ id, label }], always_escalate? }`. No `render_spec`/`paint` |
| `failed` | Terminal error |
| `cancelled` | Client abort |

Rules:

- Terminal status **last** event (`completed` \| `failed` \| `cancelled` \| `interrupted`)
- Tick = one `response_streaming` emit from composer stream chunk (custom writer)
- `response_streaming` full cumulative text each tick — **not** first appear only on `completed`
- Progress envelopes **MUST** carry human-readable `message` (from `conversation/presentation/`); UI never shows raw status name
- Streamed text pending Approval Gate = **draft** — UI must not present as validated output until gate clears
- No raw reasoning in user stream
- Operator progress is `thinking` (or `tool_*`), never `response_streaming`
- After stream: `graph.getState` pending interrupt → emit `interrupted` (not `completed`)

Snippet: `sse-envelope.ts.snippet`.

## Composer token stream (MUST)

| Rule | Detail |
| ---- | ------ |
| LLM reply hop | `streamJsonSchema` → `model.stream()` — **FORBIDDEN** `model.invoke` on composer reply |
| Partial JSON | Peel growing `"markdown"` from incomplete buffer; `onPartialMarkdown` each growth |
| Tick | Custom writer `{ status: "response_streaming", message }` per growth |
| Graph stream | `streamMode: ["values", "custom"]` — HTTP forwards custom ticks as they arrive |
| Stub (no LLM) | May emit **one** `response_streaming` then `completed` |
| `completed` | Repeats final message — **not** first place text appears when LLM streamed |
| SSE leave now | `X-Accel-Buffering: no`, `socket.setNoDelay(true)`, `flush()` after each write |
| Dev-chat paint | Each `response_streaming` before next SSE read (`flushSync`) |

**FORBIDDEN:** single `response_streaming` only on `respond` with full text; buffered SSE; client timer/debounce hide Markdown; client typewriter fake stream; coalesce many ticks into one paint.

Analyst/planner JSON hops may keep `invokeJsonSchema` — not user-facing stream.

## Operator progress (JSON planner hops)

Greenfield `streaming_sse` + planner/analyst structured JSON (no `bindTools` on that hop): **MUST**.

1. Planner LLM returns `executionPlan` + `userFacingIntent` in one JSON object — `templates/contracts/planner-contract.md`. **`userFacingIntent` MUST be in the same language as the current user message** (not English unless that message is English).
2. Persist both on `AgentState`. Do **not** append the intent line to `messages`.
3. At **planner node entry**, before the next invoke:
   - hop 0 (`analystIteration === 0` or equivalent): emit `thinking` with generic copy from `conversation/presentation/` (product language)
   - later hops: emit `thinking` with `state` `userFacingIntent` (or `analysis.userFacingIntent`) from the **previous** hop
4. After tools run, executor emits `tool_started` then `tool_finished` (presentation copy, not tool JSON dump).
5. Composer remains the only writer of `response_streaming` — via stream ticks, not invoke dump.

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
  intent_category: categoryId,
  always_escalate: alwaysEscalate,
});
// resume value = approval payload (decision + approver_id + approver_role)
```

Requirements:

- Compiled graph + **checkpointer**
- `thread_id` in config
- Resume: `graph.stream(new Command({ resume: approval }), config)`
- Always-escalate SoT = `graph.getState` interrupt payload (`always_escalate: true`). Body flag **MUST NOT** be the sole gate
- Always-escalate: HTTP body **MUST** include `approver_id` + `approver_role` or `AGENT-HITL-APPROVER-REQUIRED` — **no** `Command` invoke
- Persist INSERT `hitl_decisions` **before** invoke (fail closed); merge `turn_decisions` — **FORBIDDEN** clobber pre-interrupt flush

Resume JSON (minimum):

```json
{
  "decision": "approve",
  "approver_id": "user-123",
  "approver_role": "regulatory-reviewer",
  "always_escalate": true,
  "intent_category": "regulated_publish"
}
```

## Detecting interrupts

`streamEvents` v3: `stream.interrupted`, `stream.interrupts` — resume until clear.

`invoke`: `graph.getState(config)` for interrupt payload.

## HTTP routes (minimum)

```
POST /threads              → create thread_id
POST /threads/:id/message  → body { message, ...extra }; Accept text/event-stream → SSE else JSON
POST /threads/:id/resume   → HITL resume; same SSE when Accept SSE; option → { decision: option.id }
GET  /health
GET  /dev-chat             → styled shell + React bench (greenfield streaming_sse MUST)
GET  /dev-chat/app.js      → esbuild bundle (503 if missing — run build:dev-chat)
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
| Greenfield `streaming_sse` agent-api | **MUST** styled bench: pico + IBM Plex shell, React in `src/http/dev-chat-app/`, `DEV_CHAT_ENABLED=true` local-only |
| Brownfield | **RECOMMENDED** if missing — same SSE as production |
| `intelligent_saas` product | **FORBIDDEN** — `/dev-chat` is operator training on agent-api, not end-user chat |

**UI rules:** one status slot overwritten in place (`thinking`/`tool_*`); never progress-as-bubbles; first `response_streaming` or any terminal clears slot; paint **each** `response_streaming` before next SSE event (`flushSync`) — **FORBIDDEN** timer delay, coalesce ticks, client typewriter; `interrupted` shows question + option buttons (+ approver fields when `always_escalate`) then `POST .../resume` SSE; Enter send / Shift+Enter newline; send hidden while turn open; auto-scroll; Markdown via bundled `marked`+`dompurify`. Unstyled DOM = fail.

Dev-chat = same SSE envelope as `POST /threads/:id/message` (+ resume). Not a substitute for Application relay in intelligent SaaS.

### Turn latency budget

`TURN_LATENCY_BUDGET_MS` (default 60000) at HTTP layer. Exceed: stop new work; partial composer if evidence exists, else `failed` + `turn_latency_budget_exceeded`. Not client `cancelled`. `references/error-and-reliability.md`.

## Postman

Collection synced with routes — executable contract.

## UX notes

- Tool progress without full JSON dump
- Planner operator line via `thinking`, not as streamed Markdown
- Interrupt UI: editable args when safe
- `thread_id` for resume: `agent_runtime` — HTTP client keeps `thread_id`; `intelligent_saas` — Application owns and maps `thread_id` (browser never holds it)
