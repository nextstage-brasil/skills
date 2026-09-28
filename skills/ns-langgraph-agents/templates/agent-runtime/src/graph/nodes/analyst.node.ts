import type { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import type { AgentStateType, AnalystStatus } from "../../state.js";
import { lastHumanText } from "../../shared/messages.js";
import { AGENT_ERROR } from "../../shared/error-codes.js";
import { asRecord } from "../../shared/records.js";
import { progressMessage } from "../../conversation/presentation/progress.js";
import { buildAnalystUserPayload } from "../analyst/payload.js";
import { parsePlanActions } from "../analyst/plan-actions.js";
import { analystCapReached } from "../analyst/iterations.js";
import { composeSystemPrompt } from "../../conversation/system-prompt.js";
import { loadRolePromptMeta } from "../../conversation/load-role-prompt.js";
import { resolveLlmConfigForRole } from "../../llm/config.js";
import { invokeJsonSchema } from "../../llm/json-output.js";

const AnalystLlmSchema = z.object({
  intent: z.string().optional(),
  userFacingIntent: z.string(),
  executionPlan: z.object({
    status: z.string(),
    actions: z.array(z.unknown()),
  }),
});

export function executionHasToolError(results: unknown[]): boolean {
  return results.some((item) => asRecord(item)?.error === true);
}

function analystResult(params: {
  iteration: number;
  /** Raw planner status from LLM or stub — normalized once here. */
  planStatus: string;
  actions: unknown[];
  intent: string;
  userFacingIntent: string;
  priorNarration: string[];
  outcome: string;
  notes: Record<string, unknown>;
  errorCode?: string | null;
}): Partial<AgentStateType> {
  const status: Exclude<AnalystStatus, null> =
    params.planStatus === "need_more_data" && params.actions.length > 0
      ? "need_more_data"
      : "complete";
  const out: Partial<AgentStateType> = {
    analystIteration: params.iteration,
    analystStatus: status,
    executionPlan: {
      status,
      actions: status === "need_more_data" ? params.actions : [],
    },
    analysis: {
      intent: params.intent,
      userFacingIntent: params.userFacingIntent,
    },
    analystNarration: [...params.priorNarration, params.userFacingIntent],
    turnDecisions: [
      {
        route: "analyst",
        outcome: params.outcome,
        notes: params.notes,
      },
    ],
  };
  if (params.errorCode !== undefined) {
    out.errorCode = params.errorCode;
  }
  return out;
}

/**
 * JSON planner hop — no bindTools. Writes executionPlan + userFacingIntent.
 * LLM when analyst stage configured; else deterministic stub (offline tests).
 * Cap enforced by `routeAfterExecutor` only.
 */
export async function analystNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const iteration = (state.analystIteration ?? 0) + 1;
  const text = lastHumanText(state.messages);
  const locale = state.turnLocale;
  const configurable = config?.configurable as Record<string, unknown> | undefined;
  const userPayload = buildAnalystUserPayload(state);
  const system = composeSystemPrompt({ role: "analyst", configurable });
  const promptMeta = loadRolePromptMeta("analyst");
  const priorNarration = state.analystNarration ?? [];

  if (executionHasToolError(state.executionResults ?? [])) {
    return analystResult({
      iteration,
      planStatus: "complete",
      actions: [],
      intent: "tool_error_breaker",
      userFacingIntent: progressMessage("wrapping_up", locale),
      priorNarration,
      outcome: "tool_error_complete",
      notes: {
        iteration,
        reason: "execution_result_error",
        payloadChars: userPayload.length,
        prompt_version: promptMeta.promptVersion,
      },
    });
  }

  const llm = resolveLlmConfigForRole("analyst");
  if (llm) {
    try {
      const parsed = await invokeJsonSchema(llm, AnalystLlmSchema, {
        system,
        user: userPayload,
        jsonShapeHint:
          '{"intent":"english audit","userFacingIntent":"operator line","executionPlan":{"status":"complete|need_more_data","actions":[{"tool":"…","args":{}}]}}',
        promptVersion: promptMeta.promptVersion,
      });
      let actions: unknown[] = [];
      let planParseError: string | null = null;
      try {
        actions = parsePlanActions(parsed.executionPlan.actions);
      } catch (err) {
        planParseError = err instanceof Error ? err.message : String(err);
        actions = [];
      }
      const userFacingIntent =
        parsed.userFacingIntent.trim() || progressMessage("planning", locale);
      const planStatus = parsed.executionPlan.status;
      return analystResult({
        iteration,
        planStatus,
        actions,
        intent: parsed.intent ?? "llm_plan",
        userFacingIntent,
        priorNarration,
        outcome:
          planStatus === "need_more_data" && actions.length > 0
            ? "need_more_data"
            : "complete",
        notes: {
          iteration,
          questionLen: text.length,
          prompt_version: promptMeta.promptVersion,
          actionCount: actions.length,
          ...(planParseError ? { planParseError } : {}),
        },
      });
    } catch (err) {
      return analystResult({
        iteration,
        planStatus: "complete",
        actions: [],
        intent: "llm_failure",
        userFacingIntent: progressMessage("wrapping_up", locale),
        priorNarration,
        outcome: "llm_failure",
        notes: {
          iteration,
          error: err instanceof Error ? err.message : String(err),
          prompt_version: promptMeta.promptVersion,
        },
        errorCode: AGENT_ERROR.LLM_FAILURE,
      });
    }
  }

  return analystResult({
    iteration,
    planStatus: "complete",
    actions: [],
    intent: "audit_only_english",
    userFacingIntent: progressMessage("planning", locale),
    priorNarration,
    outcome: "complete",
    notes: {
      iteration,
      questionLen: text.length,
      stub: true,
      payloadChars: userPayload.length,
      prompt_version: promptMeta.promptVersion,
    },
  });
}

/** need_more_data + actions → executor; else composer. No analyst self-loop. */
export function routeAfterAnalyst(
  state: AgentStateType,
): "executor" | "composer" {
  if (state.analystStatus === "need_more_data") {
    const actions = state.executionPlan?.actions ?? [];
    if (actions.length > 0) {
      return "executor";
    }
  }
  return "composer";
}

/**
 * After executor: still need_more_data with remaining actions and under cap → analyst;
 * else composer. Cap SoT.
 */
export function routeAfterExecutor(
  state: AgentStateType,
): "analyst" | "composer" {
  if (analystCapReached(state.analystIteration ?? 0)) {
    return "composer";
  }
  if (state.analystStatus !== "need_more_data") {
    return "composer";
  }
  const actions = state.executionPlan?.actions ?? [];
  if (actions.length === 0) {
    return "composer";
  }
  return "analyst";
}
