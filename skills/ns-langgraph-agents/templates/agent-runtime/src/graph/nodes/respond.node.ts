import type { AgentStateType } from "../../state.js";
import { AIMessage } from "@langchain/core/messages";
import { upsertTurnDecisions } from "../../observability/postgres.js";
import { runStorage } from "../../observability/run-context.js";

/** Terminal respond — push composer markdown into messages; flush turn_decisions. */
export async function respondNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const md = state.responseMarkdown ?? "";
  const ctx = runStorage.getStore();
  if (ctx?.threadId && state.turnDecisions.length > 0) {
    try {
      await upsertTurnDecisions(ctx.threadId, state.turnDecisions);
    } catch {
      // Observability must not fail the turn in template stub.
    }
  }

  return {
    messages: md ? [new AIMessage(md)] : [],
    plan: "done",
    turnDecisions: [],
  };
}
