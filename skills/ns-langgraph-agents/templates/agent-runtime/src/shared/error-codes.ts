/** Canonical agent HTTP / SSE error codes. */

export const AGENT_ERROR = {
  LATENCY_BUDGET: "AGENT-LATENCY-BUDGET",
  CLIENT_CANCEL: "AGENT-CLIENT-CANCEL",
  LLM_FAILURE: "AGENT-LLM-FAILURE",
  INTERNAL: "AGENT-INTERNAL",
  HITL_APPROVER_REQUIRED: "AGENT-HITL-APPROVER-REQUIRED",
  HITL_NOT_PENDING: "AGENT-HITL-NOT-PENDING",
} as const;

export type AgentErrorCode =
  (typeof AGENT_ERROR)[keyof typeof AGENT_ERROR];

/** Stable code from thrown errors that carry `.code`. */
export function errorCodeOf(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" || typeof code === "number"
      ? String(code)
      : undefined;
  }
  return undefined;
}
