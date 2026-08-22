import { describe, expect, it } from "vitest";
import { normalizeMcpToolResult } from "../../src/mcp/to-langchain-tool.js";
import { truncateToolOutput } from "../../src/memory/context-window.js";

describe("normalizeMcpToolResult", () => {
  it("extracts text blocks without stringifying the envelope", () => {
    const raw = {
      content: [{ type: "text", text: "total: 42" }],
      structuredContent: { total: 42 },
    };
    expect(normalizeMcpToolResult(raw)).toBe("total: 42");
  });

  it("uses structuredContent when content has no text", () => {
    const raw = {
      content: [],
      structuredContent: { rows: [1, 2] },
    };
    expect(normalizeMcpToolResult(raw)).toBe(JSON.stringify({ rows: [1, 2] }));
  });

  it("normalize then truncate preserves leading totals", () => {
    const payload = { total: 999, rows: Array.from({ length: 50 }, (_, i) => i) };
    const raw = {
      content: [{ type: "text", text: JSON.stringify(payload) }],
    };
    const normalized = normalizeMcpToolResult(raw);
    const truncated = truncateToolOutput(normalized, 40);
    expect(truncated.startsWith('{"total":999')).toBe(true);
    expect(truncated).toContain("[truncated");
  });

  it("does not double-stringify content+structuredContent", () => {
    const raw = {
      content: [{ type: "text", text: "ok" }],
      structuredContent: { a: 1 },
    };
    const out = normalizeMcpToolResult(raw);
    expect(out).toBe("ok");
    expect(out.includes("structuredContent")).toBe(false);
  });
});
