import type { AgentStateType } from "../../state.js";
import { TurnToolBudget } from "../../capability/tool-budget.js";

/**
 * Deterministic tool/MCP runner — no user Markdown.
 * Optional HITL: product may call interrupt() here when graph-spec locks it
 * (default compile has no interrupt node).
 */
export async function executorNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const budget = new TurnToolBudget();
  return {
    turnDecisions: [
      {
        route: "executor",
        outcome: "skeleton",
        notes: {
          actionCount: state.executionPlan?.actions?.length ?? 0,
          budget: budget.getCounts(),
        },
      },
    ],
  };
}
