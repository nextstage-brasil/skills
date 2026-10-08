import { getRunCtx } from "../observability/run-context.js";
import { readPositiveNumberEnv } from "../shared/env-number.js";
import {
  getUserMemoryRepo,
  isUserMemoryEnabled,
  renderUserMemoryBlock,
  type MemoryOwner,
} from "./user-memory.js";

/** Owner for this turn, or null when memory is off / user unknown. */
export function currentMemoryOwner(): MemoryOwner | null {
  const ctx = getRunCtx();
  if (!ctx?.userId || !isUserMemoryEnabled()) {
    return null;
  }
  return { tenantId: ctx.tenantId, userId: ctx.userId };
}

/**
 * Rendered user-memory block for this turn (cached on RunCtx after first load).
 * Fail-open: a store outage yields "" — the turn continues without personalization.
 */
export async function loadUserMemoryBlock(): Promise<string> {
  const ctx = getRunCtx();
  const owner = currentMemoryOwner();
  if (!ctx || !owner) {
    return "";
  }
  if (ctx.userMemoryBlock !== undefined) {
    return ctx.userMemoryBlock;
  }
  try {
    const memories = await getUserMemoryRepo().list(owner);
    ctx.userMemoryBlock = renderUserMemoryBlock(
      memories,
      readPositiveNumberEnv("USER_MEMORY_PROMPT_MAX_CHARS", 4000),
    );
  } catch (err) {
    console.warn(
      `[user-memory] load failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    ctx.userMemoryBlock = "";
  }
  return ctx.userMemoryBlock;
}

/** Drop the cached block after a write so the composer sees fresh memory. */
export function invalidateUserMemoryBlock(): void {
  const ctx = getRunCtx();
  if (ctx) {
    ctx.userMemoryBlock = undefined;
  }
}
