# Context window and token management

Checkpointer stores **full** state. Context management = **what LLM sees**. Separate concerns.

## Environment

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `CONTEXT_MAX_TOKENS` | 12000 | LLM input window |
| `CONTEXT_SUMMARIZE_MULTIPLIER` | 2 | Summarize when tokens > max × multiplier |
| `CONTEXT_TOOL_OUTPUT_MAX_CHARS` | 4000 | Cap tool/MCP before `ToolMessage` |
| `CONTEXT_SKILL_BODY_MAX_CHARS` | 12000 | Skill bodies — **not** tool cap |
| `LLM_LIGHT_*` | main fallback | Cheap summarize model |

Do not reuse `CONTEXT_TOOL_OUTPUT_MAX_CHARS` for skill doctrine. Auto-inject + `use_skill` share skill-body cap. `references/prompt-and-capability-injection.md`.

## normalizeMcpToolResult (before truncate)

MCP often returns `{ content, structuredContent }`. Stringify wrapper before extract cuts totals, breaks fidelity.

```
raw MCP result
  → normalizeMcpToolResult(raw)
  → truncateToolOutput(text, CONTEXT_TOOL_OUTPUT_MAX_CHARS)
  → ToolMessage
```

Snippet: `context-window.ts.snippet`. Wire patterns: `references/mcp-complex-access.md`.

## context_compact (MCP-heavy)

Node or `prepareLlmMessages` **before** intent/gather:

```
state.messages
  → prune stale tool noise
  → compress intra-turn discovery ToolMessages (after analytical evidence)
  → trimMessagesForLlm
  → optional summarizeOlderMessages (SSE thinking only when summarize runs)
```

Snippet: `prepare-llm-messages.ts.snippet`. Once per turn early — not only inside gather loop.

## Pipeline (agent node)

```
state.messages
  → count tokens
  → if shouldSummarize: summarizeOlderMessages(tail) → SystemMessage
  → trimMessagesForLlm(messages, maxTokens, model)
  → bound.invoke(trimmed) or bound.stream(trimmed)
  → if summary: persist compaction (below)
  → append AIMessage / tool loop
```

## trimMessagesForLlm

LangChain `trimMessages`:

- `strategy: "last"`
- `startOn: "human"`
- `includeSystem: true` — persisted summary at index 0
- `tokenCounter: model`

Trim drops all humans (long tool loop): anchor from last human in full history.

## truncateToolOutput

Tool/MCP nodes before `ToolMessage`:

```typescript
const safe = truncateToolOutput(raw, config.toolOutputMaxChars);
```

Audit may store separate truncated copy — not messages for audit.

## Skill body truncation

Inject or return skill markdown with `CONTEXT_SKILL_BODY_MAX_CHARS` (`config.skillBodyMaxChars`). Long body: head+tail over head-only cut.

## Summarization persistence (critical)

Summarize once without rewriting `state.messages` = history grows forever; re-summarize every turn.

`summarizeOlderMessages()` return must include:

```typescript
import { RemoveMessage } from "@langchain/core/messages";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

return {
  messages: [
    new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
    summarySystemMessage,
    ...trimmedTail,
    responseMessage,
  ],
};
```

## State size discipline

| In state | Outside state |
| -------- | --------------- |
| Message history (compacted) | Full API responses, file contents |
| Tool result summaries | Raw JSON blobs > cap |
| Refs (`artifact_id`, `tenant_id`) | Secrets, tokens |
| Checkpoint scalars | Embedding matrices |

Graph state = **references**; MCP/tools fetch on demand. Hot refs in memory store if needed.

## Token accounting

`logLlmCall` with input/output counts. Compare main vs light model; planner-only vs full graph evals; tool-selection accuracy vs cost.

## Testing

`tests/setup.ts`:

- `LLM_DISABLED=true`
- `CHECKPOINTER=memory`
- Unit-test `trimMessagesForLlm`, `truncateToolOutput`, `shouldSummarize` — no network

Snippet: `context-window.ts.snippet`, `agent-node-context.ts.snippet`.
