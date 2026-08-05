# Context window and token management

The checkpointer stores **full** graph state. Context management decides **what the LLM sees** — never conflate them.

## Environment

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `CONTEXT_MAX_TOKENS` | 12000 | Sliding window budget for LLM input |
| `CONTEXT_SUMMARIZE_MULTIPLIER` | 2 | Summarize when history tokens > max × multiplier |
| `CONTEXT_TOOL_OUTPUT_MAX_CHARS` | 4000 | Cap tool/MCP text before `ToolMessage` |
| `CONTEXT_SKILL_BODY_MAX_CHARS` | 12000 | Cap skill procedure bodies (auto-inject and `use_skill`) — **not** the tool cap |
| `LLM_LIGHT_*` | falls back to main | Cheaper model for summarization |

Do not reuse `CONTEXT_TOOL_OUTPUT_MAX_CHARS` for skill doctrine — that silently truncates procedures. Auto-inject and `use_skill` share the same skill-body cap and truncation fidelity. See `references/prompt-and-capability-injection.md`.

## normalizeMcpToolResult (before truncate)

MCP adapters often return `{ content, structuredContent }`. Stringifying the wrapper **before** extract cuts totals and breaks fidelity.

```
raw MCP result
  → normalizeMcpToolResult(raw)   // extract LLM-visible text
  → truncateToolOutput(text, CONTEXT_TOOL_OUTPUT_MAX_CHARS)
  → ToolMessage
```

Snippet: `normalizeMcpToolResult` in `templates/snippets/context-window.ts.snippet`. Full wire patterns: `references/mcp-complex-access.md`.

## context_compact (MCP-heavy graphs)

Dedicated node or `prepareLlmMessages` helper **before** intent/gather:

```
state.messages
  → prune stale tool noise
  → compress intra-turn discovery ToolMessages (after analytical evidence exists)
  → trimMessagesForLlm
  → optional summarizeOlderMessages (SSE thinking only when summarize runs)
```

Snippet: `templates/snippets/prepare-llm-messages.ts.snippet`. Run once per turn early — not only inside gather loop.

## Pipeline (agent node)

```
state.messages
  → count tokens
  → if shouldSummarize: summarizeOlderMessages(trimmed-off tail) → SystemMessage
  → trimMessagesForLlm(messages, maxTokens, model)
  → bound.invoke(trimmed) or bound.stream(trimmed)
  → if summary produced: persist compaction (see below)
  → append AIMessage / tool loop
```

## trimMessagesForLlm

Use LangChain `trimMessages`:

- `strategy: "last"`
- `startOn: "human"`
- `includeSystem: true` — keeps persisted summary at index 0
- `tokenCounter: model`

If trim drops all human messages (long tool loop), anchor from last human in full history.

## truncateToolOutput

Apply in **tool/MCP nodes** before pushing `ToolMessage`:

```typescript
const safe = truncateToolOutput(raw, config.toolOutputMaxChars);
```

Audit logs may store a separate truncated copy — do not rely on messages for audit.

## Skill body truncation

When injecting or returning skill markdown, truncate with `CONTEXT_SKILL_BODY_MAX_CHARS` (or `config.skillBodyMaxChars`). Keep enough of the procedure that the model can follow steps — prefer head+tail preservation over naive head-only cut when the body is long.

## Summarization persistence (critical)

If summarization only feeds the prompt once but never rewrites `state.messages`, the same raw history grows forever and summarization re-runs every turn.

When `summarizeOlderMessages()` returns a summary, the agent node must return:

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

| Store in state | Store outside state |
| -------------- | ------------------- |
| Message history (compacted) | Full API responses, file contents |
| Tool result summaries | Raw JSON blobs > cap |
| Refs (`artifact_id`, `tenant_id`) | Secrets, tokens |
| Checkpoint-friendly scalars | Embeddings matrices |

Market pattern: graph state holds **references**; MCP/tools resolve data on demand. Cache hot refs in memory store if needed.

## Token accounting

Track per-phase tokens in observability (`logLlmCall` with input/output counts). Compare:

- Main model vs light model spend
- Planner-only evals vs full graph evals
- Tool-selection accuracy vs token cost

## Testing

In `tests/setup.ts`:

- `LLM_DISABLED=true` — stub LLM responses
- `CHECKPOINTER=memory` — no Postgres
- Unit-test `trimMessagesForLlm`, `truncateToolOutput`, `shouldSummarize` without network

Snippet: `templates/snippets/context-window.ts.snippet`, `templates/snippets/agent-node-context.ts.snippet`.
