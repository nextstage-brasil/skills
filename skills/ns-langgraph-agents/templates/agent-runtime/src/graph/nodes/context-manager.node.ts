import type { AgentStateType } from "../../state.js";

/**
 * Compacts history when over budget. Stub: no LLM — product wires prepareLlmMessages.
 * Durable `summary` stays off `messages`.
 */
export async function contextManagerNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  return {
    turnDecisions: [
      {
        route: "context_manager",
        outcome: "skipped_no_model",
        notes: { messageCount: state.messages.length },
      },
    ],
  };
}
