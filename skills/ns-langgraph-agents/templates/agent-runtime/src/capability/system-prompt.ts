import { assertConfigurableSecret } from "./governance.js";

/** Canonical configurable keys — never mirror these into graph state / checkpointer. */
export const PRODUCT_SYSTEM_PROMPT_KEY = "product_system_prompt";
export const GATHER_PRODUCT_PROMPT_KEY = "gather_product_prompt";
export const COMPOSER_PRODUCT_PROMPT_KEY = "composer_product_prompt";

export type SystemPromptRole = "analyst" | "composer";

/**
 * Motor-owned invariants. Not overridable by the application.
 * Product persona is appended via composeSystemPrompt — never replaces these.
 */
export const MOTOR_INVARIANTS: Record<SystemPromptRole, string> = {
  analyst:
    "JSON planner hop: emit executionPlan + userFacingIntent (same language as the current user message). Do not bind tools. Do not emit user-facing Markdown. Machine intent stays English for audit only.",
  composer:
    "You are the sole writer of user-facing Markdown. Narrate evidence channels in state only — never invent numbers, entities, or tool outcomes. If externalError is set, explain it; do not ask for data the tools already failed to fetch. Match the user's language this turn; present numbers and dates for the conversation-observed locale — do not invent thousand/decimal separators (formatting is applied in code).",
};

/**
 * Reads product persona from RunnableConfig.configurable.
 * Role-specific keys override the shared product_system_prompt when present.
 */
export function readProductSystemPrompt(
  configurable: Record<string, unknown> | undefined,
  role?: SystemPromptRole,
): string | undefined {
  if (role === "analyst") {
    const gather = assertConfigurableSecret(configurable, GATHER_PRODUCT_PROMPT_KEY);
    if (gather) {
      return gather;
    }
  }
  if (role === "composer") {
    const composer = assertConfigurableSecret(configurable, COMPOSER_PRODUCT_PROMPT_KEY);
    if (composer) {
      return composer;
    }
  }
  return assertConfigurableSecret(configurable, PRODUCT_SYSTEM_PROMPT_KEY);
}

/**
 * Final system text = motor base_invariant(role) + optional product injection.
 * Allowlist / HITL / bind_tools are independent — this string MUST NOT grant capabilities.
 */
export function composeSystemPrompt(params: {
  role: SystemPromptRole;
  productPrompt?: string | null;
  configurable?: Record<string, unknown>;
}): string {
  const invariant = MOTOR_INVARIANTS[params.role];
  const injected =
    (typeof params.productPrompt === "string" && params.productPrompt.trim().length > 0
      ? params.productPrompt.trim()
      : undefined) ?? readProductSystemPrompt(params.configurable, params.role);

  if (!injected) {
    return invariant;
  }
  return `${invariant}\n\n${injected}`;
}
