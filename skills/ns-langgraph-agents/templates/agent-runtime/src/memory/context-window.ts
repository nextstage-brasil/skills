import { trimMessages, type BaseMessage } from "@langchain/core/messages";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";

export type ContextConfig = {
  /** Model raw context window (`CONTEXT_MAX_TOKENS`). Ratios below are not env. */
  maxTokens: number;
  toolOutputMaxChars: number;
  /** Skill procedure body — MUST stay independent of tool/MCP wire cap. */
  skillBodyMaxChars: number;
};

/** Prompt + history over this share of the window → compact. */
export const SUMMARIZE_AT_RATIO = 0.8;
/** Compaction lands here so the next one is many turns away. */
export const COMPACT_TO_RATIO = 0.5;
/** Ceiling for the rolling summary so it cannot eat the room compaction frees. */
export const SUMMARY_MAX_RATIO = 0.1;

function readEnvNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @env CONTEXT_MAX_TOKENS, CONTEXT_TOOL_OUTPUT_MAX_CHARS, CONTEXT_SKILL_BODY_MAX_CHARS
 */
export function resolveContextConfig(): ContextConfig {
  return {
    maxTokens: readEnvNumber("CONTEXT_MAX_TOKENS", 12000),
    toolOutputMaxChars: readEnvNumber("CONTEXT_TOOL_OUTPUT_MAX_CHARS", 4000),
    skillBodyMaxChars: readEnvNumber("CONTEXT_SKILL_BODY_MAX_CHARS", 16000),
  };
}

export function compactTargetTokens(window = resolveContextConfig().maxTokens): number {
  return Math.floor(window * COMPACT_TO_RATIO);
}

export function summaryMaxTokens(window = resolveContextConfig().maxTokens): number {
  return Math.floor(window * SUMMARY_MAX_RATIO);
}

/** Sum of `model.getNumTokens` across messages — same approximation trimMessages uses internally. */
export async function countMessagesTokens(
  messages: BaseMessage[],
  model: BaseLanguageModel,
): Promise<number> {
  let total = 0;
  for (const message of messages) {
    total += await model.getNumTokens(message.content);
  }
  return total;
}

/**
 * Sliding window by tokens; starts on a human turn.
 * `includeSystem: true` keeps a persisted summary (a SystemMessage this module
 * places at index 0 of `state.messages` after summarization) from being
 * dropped by `startOn: "human"` on the very next turn.
 * `startOn: "human"` can otherwise drop every message when the kept token window
 * has no human turn inside it (e.g. a long tool-call loop far past the last user
 * message) — anchor on the last human message in that case so the LLM always
 * receives at least one user turn.
 */
export async function trimMessagesForLlm(
  messages: BaseMessage[],
  maxTokens: number,
  model: BaseLanguageModel,
): Promise<BaseMessage[]> {
  const trimmed = await trimMessages(messages, {
    maxTokens,
    tokenCounter: model,
    strategy: "last",
    startOn: "human",
    includeSystem: true,
  });
  if (trimmed.some((m) => m._getType() === "human")) {
    return trimmed;
  }
  const lastHumanIndex = messages.map((m) => m._getType()).lastIndexOf("human");
  return lastHumanIndex === -1 ? trimmed : messages.slice(lastHumanIndex);
}

/** True once used tokens exceed 80% of the raw context window. */
export function shouldSummarize(
  usedTokens: number,
  window = resolveContextConfig().maxTokens,
): boolean {
  return usedTokens > window * SUMMARIZE_AT_RATIO;
}

/** Truncates MCP/tool output before it enters `state.messages`. */
export function truncateToolOutput(output: string, maxChars: number): string {
  if (output.length <= maxChars) {
    return output;
  }
  return `${output.slice(0, maxChars)}\n...[truncated ${output.length - maxChars} chars]`;
}

/** Truncates skill procedure body with the skill-specific cap (≠ tool wire). */
export function truncateSkillBody(
  body: string,
  maxChars?: number,
): string {
  const cap = maxChars ?? resolveContextConfig().skillBodyMaxChars;
  return truncateToolOutput(body, cap);
}
