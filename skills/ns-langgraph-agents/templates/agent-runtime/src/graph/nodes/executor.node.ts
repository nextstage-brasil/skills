import type { AgentStateType } from "../../state.js";
import { TurnToolBudget } from "../../capability/tool-budget.js";
import { parsePlanActions } from "../analyst/plan-actions.js";

/**
 * Executor validates plan action shape before tool dispatch.
 * Deterministic tool/MCP runner — no user Markdown.
 * Optional HITL: product may call interrupt() here when graph-spec locks it
 * (default compile has no interrupt node).
 */
export async function executorNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const budget = new TurnToolBudget();
  let actionCount = 0;
  let parseError: string | null = null;
  try {
    const actions = parsePlanActions(state.executionPlan?.actions ?? []);
    actionCount = actions.length;
  } catch (err) {
    parseError = err instanceof Error ? err.message : "plan_actions_invalid";
  }
  return {
    turnDecisions: [
      {
        route: "executor",
        outcome: parseError ? "plan_actions_invalid" : "skeleton",
        notes: {
          actionCount,
          parseError,
          budget: budget.getCounts(),
        },
      },
    ],
  };
}
