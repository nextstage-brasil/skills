import { AsyncLocalStorage } from "node:async_hooks";
import type { AgentStreamUsage } from "../shared/usage.js";

export type RunCtx = {
  threadId: string;
  tenantId: string;
  /** Authenticated end user — owner of user memory. Absent → memory off this turn. */
  userId?: string;
  /** Rendered user-memory block, loaded once per turn. Never copied into graph state. */
  userMemoryBlock?: string;
  nodeName?: string;
  checkpointId?: string;
  /** Accumulated LLM usage for this HTTP turn (SSE completed.usage). */
  turnUsage?: AgentStreamUsage;
};

export const runStorage = new AsyncLocalStorage<RunCtx>();

export function getRunCtx(): RunCtx | undefined {
  return runStorage.getStore();
}

export function setNodeName(name: string): void {
  const ctx = runStorage.getStore();
  if (ctx) {
    ctx.nodeName = name;
  }
}

export function setCheckpointId(id: string): void {
  const ctx = runStorage.getStore();
  if (ctx) {
    ctx.checkpointId = id;
  }
}

/** Add token counts from one LLM hop onto the turn accumulator. */
export function accumulateTurnUsage(delta: {
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
}): void {
  const ctx = runStorage.getStore();
  if (!ctx) {
    return;
  }
  const prev = ctx.turnUsage ?? {
    prompt_tokens: 0,
    cached_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  const prompt = prev.prompt_tokens + (delta.promptTokens || 0);
  const cached = prev.cached_tokens + (delta.cachedTokens || 0);
  const completion = prev.completion_tokens + (delta.completionTokens || 0);
  ctx.turnUsage = {
    prompt_tokens: prompt,
    cached_tokens: cached,
    completion_tokens: completion,
    total_tokens: prompt + completion,
  };
}
