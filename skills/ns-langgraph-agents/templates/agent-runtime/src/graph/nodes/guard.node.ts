import type { RunnableConfig } from "@langchain/core/runnables";
import type { AgentStateType } from "../../state.js";
import {
  readLocaleHint,
  resolveConversationLocale,
} from "../../shared/locale.js";

/**
 * Entry guard — fail-open. Optional LLM classifier is product wiring.
 * Resolves conversation-observed locale this turn (no dedicated intent hop).
 */
export async function guardNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const humanTexts = state.messages
    .filter((m) => m._getType() === "human")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter((t) => t.trim().length > 0);
  const localeRes = resolveConversationLocale({
    texts: humanTexts.slice(-4),
    localeHint: readLocaleHint(
      config?.configurable as Record<string, unknown> | undefined,
    ),
  });

  return {
    guardRoute: "agent",
    turnDecisions: [],
    errorCode: null,
    responseMarkdown: null,
    externalError: null,
    executionPlan: null,
    executionResults: [],
    analystStatus: null,
    analystIteration: 0,
    analystNarration: [],
    turnLocale: localeRes.locale,
    turnCurrency: localeRes.currency ?? null,
  };
}

export function routeAfterGuard(
  state: AgentStateType,
): "context_manager" | "respond" {
  return state.guardRoute === "respond" ? "respond" : "context_manager";
}
