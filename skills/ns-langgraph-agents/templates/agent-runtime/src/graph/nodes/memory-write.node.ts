import type { AgentStateType } from "../../state.js";
import { getRunCtx } from "../../observability/run-context.js";
import { applyMemoryOps, getUserMemoryRepo } from "../../memory/user-memory.js";
import {
  currentMemoryOwner,
  invalidateUserMemoryBlock,
} from "../../memory/user-memory-context.js";

/**
 * Deterministic writer for analyst `memoryOps`. No confirmation gate — the user is
 * informed by the composer via `memoryNotices`. Fail-open: a store error never
 * fails the turn. Routing after this node is `routeAfterAnalyst` (state-only).
 */
export async function memoryWriteNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const ops = state.memoryOps ?? [];
  if (ops.length === 0) {
    return {};
  }
  const owner = currentMemoryOwner();
  if (!owner) {
    return {
      memoryOps: [],
      turnDecisions: [
        { route: "memory_write", outcome: "skipped_no_user", notes: { opCount: ops.length } },
      ],
    };
  }
  try {
    const notices = await applyMemoryOps({
      repo: getUserMemoryRepo(),
      owner,
      ops,
      threadId: getRunCtx()?.threadId ?? null,
    });
    invalidateUserMemoryBlock();
    return {
      memoryOps: [],
      memoryNotices: [...(state.memoryNotices ?? []), ...notices],
      turnDecisions: [
        {
          route: "memory_write",
          outcome: "applied",
          notes: {
            opCount: ops.length,
            outcomes: notices.map((n) => `${n.outcome}:${n.kind}:${n.key}`),
          },
        },
      ],
    };
  } catch (err) {
    return {
      memoryOps: [],
      turnDecisions: [
        {
          route: "memory_write",
          outcome: "store_error",
          notes: { error: err instanceof Error ? err.message : String(err) },
        },
      ],
    };
  }
}
