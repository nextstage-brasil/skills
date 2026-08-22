import type { BaseMessage } from "@langchain/core/messages";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import {
  countMessagesTokens,
  resolveContextConfig,
  shouldSummarize,
  trimMessagesForLlm,
} from "./context-window.js";
import { summarizeOlderMessages } from "./summarizer.js";

export type PrepareLlmMessagesResult = {
  messages: BaseMessage[];
  summarized: boolean;
  summary: BaseMessage | null;
};

/**
 * Prune stale tool noise → trim → conditional summarize.
 * Used by the `context_manager` graph node before expensive reasoning.
 */
export async function prepareLlmMessages(
  messages: BaseMessage[],
  model: BaseLanguageModel,
): Promise<PrepareLlmMessagesResult> {
  const cfg = resolveContextConfig();
  const pruned = pruneStaleToolMessages(messages);
  const trimmed = await trimMessagesForLlm(pruned, cfg.maxTokens, model);
  const totalTokens = await countMessagesTokens(pruned, model);

  if (!shouldSummarize(totalTokens, cfg.maxTokens, cfg.summarizeMultiplier)) {
    return { messages: trimmed, summarized: false, summary: null };
  }

  const keepFromIndex = Math.max(0, pruned.length - trimmed.length);
  const summary = await summarizeOlderMessages(pruned, keepFromIndex);
  if (!summary) {
    return { messages: trimmed, summarized: false, summary: null };
  }

  return {
    messages: [summary, ...trimmed],
    summarized: true,
    summary,
  };
}

/**
 * Drop orphan ToolMessages whose parent AI tool_calls are no longer in window.
 */
export function pruneStaleToolMessages(
  messages: BaseMessage[],
): BaseMessage[] {
  const toolCallIds = new Set<string>();
  for (const m of messages) {
    if (m._getType() !== "ai") {
      continue;
    }
    const calls = (m as { tool_calls?: Array<{ id?: string }> }).tool_calls;
    if (!calls) {
      continue;
    }
    for (const c of calls) {
      if (c.id) {
        toolCallIds.add(c.id);
      }
    }
  }

  return messages.filter((m) => {
    if (m._getType() !== "tool") {
      return true;
    }
    const toolCallId = (m as { tool_call_id?: string }).tool_call_id;
    if (toolCallId && toolCallIds.size > 0 && !toolCallIds.has(toolCallId)) {
      return false;
    }
    return true;
  });
}
