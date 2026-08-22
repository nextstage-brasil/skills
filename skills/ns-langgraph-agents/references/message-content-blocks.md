# Message content blocks (cross-provider)

LangChain v1 standardizes provider-specific message shapes via **content blocks**. Use them so graph nodes stay provider-agnostic.

## Message types in agent loops

| Type | Role | Persists in checkpointer |
| ---- | ---- | ------------------------ |
| `HumanMessage` | User input | Yes |
| `AIMessage` | Model output; may include `tool_calls`, reasoning blocks | Yes |
| `ToolMessage` | Tool/MCP result; links via `tool_call_id` | Yes |
| `SystemMessage` | **Summary** (or short hygiene text) at index 0 — **not** full composed system/persona | Yes (keep index 0 when summarizing) |

Full motor+product system text (`base_invariant + injected`) is **invoke-only** — rebuild for LLM; do **not** write into durable `messages` / checkpointer. See `prompt-and-capability-injection.md`.

## Reading model output

Prefer `message.contentBlocks` (JS) / `content_blocks` (Python) over parsing raw `content`:

```typescript
for (const block of response.contentBlocks ?? []) {
  switch (block.type) {
    case "text":
      // block.text — user-visible reply
      break;
    case "reasoning":
      // block.reasoning — chain-of-thought; usually not shown to end users
      break;
    case "tool_call":
      // block.name, block.args, block.id
      break;
    case "tool_call_chunk":
      // streaming partial tool args
      break;
  }
}
```

## Provider differences (handle in adapter, not nodes)

| Provider | Raw `content` quirks | Normalized block |
| -------- | -------------------- | ---------------- |
| OpenAI reasoning models | `reasoning` items in content array | `type: "reasoning"` |
| Anthropic | `thinking` blocks | `type: "reasoning"` |
| OpenAI tools | `tool_calls` on AIMessage | `type: "tool_call"` |
| Multimodal | `image_url`, `input_audio` | `image`, `audio`, `video` blocks |

Enable `outputVersion: "v1"` (or provider equivalent) when you want serialized v1 content in `message.content`.

## Constructing multimodal human messages

```typescript
import { HumanMessage } from "@langchain/core/messages";

const message = new HumanMessage({
  contentBlocks: [
    { type: "text", text: "Describe this image." },
    { type: "image", url: "https://example.com/x.jpg" },
  ],
});
```

## Tool messages and errors

**Execution error** (tool ran, business failure): MCP `CallToolResult(isError=true)` → `ToolMessage` with `status: "error"` and error text in `content`. Model can self-correct.

**Transport error** (timeout, 5xx, protocol): Log + optional retry; may surface as HTTP/SSE `failed` without poisoning state with fake success.

```typescript
import { ToolMessage } from "@langchain/core/messages";

return new ToolMessage({
  content: truncatedOutput,
  tool_call_id: call.id,
  name: call.name,
  status: isError ? "error" : "success",
});
```

## Reasoning in UX

- **Do not** stream raw reasoning to end-user chat by default.
- **Do** persist reasoning blocks in Postgres audit (`observability.md`). Spec opt-out only.
- **Do** include reasoning in developer `dev-chat` when debugging.

## State hygiene

- Do not store duplicate copies of large multimodal blobs in custom state fields — reference URLs or artifact ids.
- When trimming history, use `includeSystem: true` so a persisted **summary** `SystemMessage` at index 0 survives `startOn: "human"`.
- That summary slot ≠ full composed system/persona (`base_invariant + injected`) — full system rebuilds per invoke; never durable in `messages`.
- Strip provider-specific junk from custom reducers — keep `messages` reducer as the single chat history source.

## JSON structured turns

For qualification or extraction nodes:

1. Prefer `response_format: { type: "json_object" }` + Zod parse.
2. Retry once without JSON mode on provider errors.
3. Avoid `withStructuredOutput` / tool-calling for local OpenAI-compatible servers (LM Studio, etc.).

See snippet: `templates/snippets/json-output.ts.snippet`.
