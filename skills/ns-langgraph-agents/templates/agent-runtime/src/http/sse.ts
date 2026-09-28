import type { ServerResponse } from "node:http";
import type {
  AgentStreamEnvelope,
  AgentStreamStatus,
  InterruptPayload,
  InterruptOption,
  AgentStreamUsage,
} from "./stream-types.js";

export type {
  AgentStreamEnvelope,
  AgentStreamStatus,
  InterruptPayload,
  InterruptOption,
  AgentStreamUsage,
} from "./stream-types.js";

const TERMINAL: ReadonlySet<AgentStreamStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
  "interrupted",
]);

export function isTerminalStatus(status: AgentStreamStatus): boolean {
  return TERMINAL.has(status);
}

/** Flush nginx/proxy + Nagle so each SSE tick leaves immediately. */
function flushSse(res: ServerResponse): void {
  const flushable = res as ServerResponse & { flush?: () => void };
  flushable.flush?.();
}

export function initSse(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  if (typeof res.socket?.setNoDelay === "function") {
    res.socket.setNoDelay(true);
  }
}

export function writeSseEvent(
  res: ServerResponse,
  envelope: AgentStreamEnvelope,
): void {
  res.write(`event: ${envelope.status}\n`);
  res.write(`data: ${JSON.stringify(envelope)}\n\n`);
  flushSse(res);
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
  const out: AgentStreamEnvelope = {
    status,
    message,
    error_code: extra?.error_code ?? null,
    usage: extra?.usage ?? null,
  };
  if (extra?.tool_name !== undefined) {
    out.tool_name = extra.tool_name;
  }
  if (extra?.tool_kind !== undefined) {
    out.tool_kind = extra.tool_kind;
  }
  if (extra?.interrupt !== undefined) {
    out.interrupt = extra.interrupt;
  }
  if (extra?.render_spec !== undefined) {
    out.render_spec = extra.render_spec;
  }
  if (extra?.paint !== undefined) {
    out.paint = extra.paint;
  }
  return out;
}

export function wantsSse(req: { headers: { accept?: string | string[] } }): boolean {
  const raw = req.headers.accept;
  const accept = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  return accept.includes("text/event-stream");
}
