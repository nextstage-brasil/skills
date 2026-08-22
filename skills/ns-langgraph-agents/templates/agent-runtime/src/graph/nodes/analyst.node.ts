import type { AgentStateType } from "../../state.js";

/**
 * JSON planner hop — no bindTools. Writes executionPlan + userFacingIntent.
 * Stub completes with empty actions so unit tests skip executor.
 */
export async function analystNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const iteration = (state.analystIteration ?? 0) + 1;
  const lastHuman = [...state.messages]
    .reverse()
    .find((m) => m._getType() === "human");
  const text =
    typeof lastHuman?.content === "string" ? lastHuman.content.trim() : "";
  const isPt = (state.turnLocale ?? "").startsWith("pt");
  const userFacingIntent = isPt ? "Planejando…" : "Planning…";

  return {
    analystIteration: iteration,
    analystStatus: "complete",
    executionPlan: { status: "complete", actions: [] },
    analysis: {
      intent: "audit_only_english",
      userFacingIntent,
    },
    analystNarration: [...(state.analystNarration ?? []), userFacingIntent],
    turnDecisions: [
      {
        route: "analyst",
        outcome: "complete",
        notes: { iteration, questionLen: text.length },
      },
    ],
  };
}

export function routeAfterAnalyst(
  state: AgentStateType,
): "executor" | "composer" | "analyst" {
  if (state.analystStatus === "need_more_data") {
    const actions = state.executionPlan?.actions ?? [];
    if (actions.length === 0) {
      return "analyst";
    }
    return "executor";
  }
  return "composer";
}
