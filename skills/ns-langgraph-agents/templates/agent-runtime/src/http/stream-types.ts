import type { AgentStreamUsage } from "../shared/usage.js";

export type { AgentStreamUsage } from "../shared/usage.js";

export type AgentStreamStatus =
  | "thinking"
  | "accessing_data"
  | "tool_started"
  | "tool_finished"
  | "response_streaming"
  | "completed"
  | "failed"
  | "cancelled"
  | "interrupted";

export type InterruptOption = {
  id: string;
  label: string;
};

export type InterruptPayload = {
  kind: string;
  question: string;
  options: InterruptOption[];
  always_escalate?: boolean;
};

export type AgentStreamEnvelope = {
  status: AgentStreamStatus;
  message: string;
  error_code: string | null;
  usage: AgentStreamUsage | null;
  tool_name?: string;
  tool_kind?: "local" | "mcp" | "skill";
  interrupt?: InterruptPayload;
  render_spec?: unknown;
  paint?: unknown;
};
