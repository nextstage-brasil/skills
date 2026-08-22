/** Canonical agent HTTP / SSE error codes. */

export const AGENT_ERROR = {
  LATENCY_BUDGET: "AGENT-LATENCY-BUDGET",
  CLIENT_CANCEL: "AGENT-CLIENT-CANCEL",
  LLM_FAILURE: "AGENT-LLM-FAILURE",
  INTERNAL: "AGENT-INTERNAL",
} as const;

export type AgentErrorCode =
  (typeof AGENT_ERROR)[keyof typeof AGENT_ERROR];
