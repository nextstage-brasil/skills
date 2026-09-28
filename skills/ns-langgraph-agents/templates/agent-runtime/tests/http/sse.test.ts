import { describe, expect, it, vi } from "vitest";
import {
  envelope,
  isTerminalStatus,
  endSse,
  initSse,
  writeSseEvent,
} from "../../src/http/sse.js";
import type { ServerResponse } from "node:http";
import type { Socket } from "node:net";

describe("sse envelope", () => {
  it("marks completed/failed/cancelled/interrupted as terminal", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("interrupted")).toBe(true);
    expect(isTerminalStatus("thinking")).toBe(false);
  });

  it("builds default envelope fields", () => {
    const e = envelope("thinking", "…");
    expect(e.error_code).toBeNull();
    expect(e.usage).toBeNull();
    expect(e.message).toBe("…");
    expect(e.render_spec).toBeUndefined();
    expect(e.paint).toBeUndefined();
    expect(e.interrupt).toBeUndefined();
  });

  it("serializes optional fields only when present", () => {
    const withPaint = envelope("completed", "done", {
      paint: { kind: "chart" },
      render_spec: { version: 1 },
    });
    expect(JSON.stringify(withPaint)).toContain('"paint"');
    expect(JSON.stringify(withPaint)).toContain('"render_spec"');

    const plain = envelope("completed", "done");
    expect(JSON.stringify(plain)).not.toContain("paint");
    expect(JSON.stringify(plain)).not.toContain("render_spec");
  });

  it("interrupted carries interrupt payload without paint", () => {
    const e = envelope("interrupted", "Approve?", {
      interrupt: {
        kind: "hitl",
        question: "Approve?",
        options: [{ id: "approved", label: "Yes" }],
      },
    });
    expect(e.interrupt?.kind).toBe("hitl");
    expect(e.paint).toBeUndefined();
    expect(e.render_spec).toBeUndefined();
  });

  it("rejects non-terminal endSse", () => {
    const chunks: string[] = [];
    const res = {
      write: (c: string) => {
        chunks.push(c);
        return true;
      },
      end: () => undefined,
    } as unknown as ServerResponse;

    expect(() => endSse(res, envelope("thinking"))).toThrow(
      /sse_end_requires_terminal/,
    );
    endSse(res, envelope("completed", "done"));
    expect(chunks.join("")).toContain("event: completed");
    expect(chunks.join("")).toContain('"status":"completed"');
  });

  it("initSse sets leave-now headers and setNoDelay", () => {
    const headers: Record<string, string> = {};
    const setNoDelay = vi.fn();
    const res = {
      writeHead: (_code: number, h: Record<string, string>) => {
        Object.assign(headers, h);
      },
      socket: { setNoDelay } as unknown as Socket,
    } as unknown as ServerResponse;

    initSse(res);
    expect(headers["Content-Type"]).toContain("text/event-stream");
    expect(headers["X-Accel-Buffering"]).toBe("no");
    expect(setNoDelay).toHaveBeenCalledWith(true);
  });

  it("writeSseEvent calls flush after write", () => {
    const chunks: string[] = [];
    const flush = vi.fn();
    const res = {
      write: (c: string) => {
        chunks.push(c);
        return true;
      },
      flush,
    } as unknown as ServerResponse;

    writeSseEvent(res, envelope("response_streaming", "Hi"));
    expect(chunks.join("")).toContain("event: response_streaming");
    expect(flush).toHaveBeenCalled();
  });
});
