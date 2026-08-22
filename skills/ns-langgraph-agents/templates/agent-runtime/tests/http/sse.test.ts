import { describe, expect, it } from "vitest";
import {
  envelope,
  isTerminalStatus,
  endSse,
} from "../../src/http/sse.js";
import type { ServerResponse } from "node:http";

describe("sse envelope", () => {
  it("marks completed/failed/cancelled as terminal", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("thinking")).toBe(false);
  });

  it("builds default envelope fields", () => {
    const e = envelope("thinking", "…");
    expect(e.error_code).toBeNull();
    expect(e.usage).toBeNull();
    expect(e.message).toBe("…");
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
});
