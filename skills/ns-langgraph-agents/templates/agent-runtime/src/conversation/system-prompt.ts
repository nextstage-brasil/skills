import { assertConfigurableSecret } from "../capability/governance.js";
import { loadRolePrompt } from "./load-role-prompt.js";

/** Canonical configurable keys — never mirror these into graph state / checkpointer. */
export const PRODUCT_SYSTEM_PROMPT_KEY = "product_system_prompt";
export const GATHER_PRODUCT_PROMPT_KEY = "gather_product_prompt";
export const COMPOSER_PRODUCT_PROMPT_KEY = "composer_product_prompt";

export type SystemPromptRole = "analyst" | "composer";

/**
 * Motor invariants = conversation/prompts/{role}.md (SSoT).
 * Product persona is appended via composeSystemPrompt — never replaces these.
 */
export function motorInvariant(role: SystemPromptRole): string {
  return loadRolePrompt(role);
}

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
 * Final system text = motor base_invariant(role) + optional product injection
 * + optional user-memory block (data, rebuilt per invoke from the user store).
 * Allowlist / HITL / bind_tools are independent — this string MUST NOT grant capabilities.
 */
export function composeSystemPrompt(params: {
  role: SystemPromptRole;
  productPrompt?: string | null;
  configurable?: Record<string, unknown>;
  userMemory?: string | null;
}): string {
  const invariant = motorInvariant(params.role);
  const injected =
    (typeof params.productPrompt === "string" && params.productPrompt.trim().length > 0
      ? params.productPrompt.trim()
      : undefined) ?? readProductSystemPrompt(params.configurable, params.role);
  const userMemory = params.userMemory?.trim() || undefined;

  return [invariant, injected, userMemory].filter(Boolean).join("\n\n");
}
