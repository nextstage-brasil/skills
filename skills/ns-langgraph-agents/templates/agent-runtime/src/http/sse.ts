import type { ServerResponse } from "node:http";

export type AgentStreamStatus =
  | "thinking"
  | "accessing_data"
  | "tool_started"
  | "tool_finished"
  | "response_streaming"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentStreamUsage {
  prompt_tokens: number;
  /** Prompt tokens served from provider prompt cache (cache_read). */
  cached_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AgentStreamEnvelope {
  status: AgentStreamStatus;
  message: string;
  error_code: string | null;
  usage: AgentStreamUsage | null;
  tool_name?: string;
  tool_kind?: "local" | "mcp" | "skill";
}

const TERMINAL: ReadonlySet<AgentStreamStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export function isTerminalStatus(status: AgentStreamStatus): boolean {
  return TERMINAL.has(status);
}

export function initSse(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
}

export function writeSseEvent(
  res: ServerResponse,
  envelope: AgentStreamEnvelope,
): void {
  res.write(`event: ${envelope.status}\n`);
  res.write(`data: ${JSON.stringify(envelope)}\n\n`);
}

export function endSse(
  res: ServerResponse,
  envelope: AgentStreamEnvelope,
): void {
  if (!isTerminalStatus(envelope.status)) {
    throw new Error(`sse_end_requires_terminal:${envelope.status}`);
  }
  writeSseEvent(res, envelope);
  res.end();
}

export function envelope(
  status: AgentStreamStatus,
  message = "",
  extra?: Partial<Omit<AgentStreamEnvelope, "status" | "message">>,
): AgentStreamEnvelope {
  return {
    status,
    message,
    error_code: extra?.error_code ?? null,
    usage: extra?.usage ?? null,
    tool_name: extra?.tool_name,
    tool_kind: extra?.tool_kind,
  };
}
