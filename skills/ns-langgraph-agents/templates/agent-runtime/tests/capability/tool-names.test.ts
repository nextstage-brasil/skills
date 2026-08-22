import { describe, expect, it } from "vitest";
import {
  assertWireToolName,
  mcpToolName,
  parseWireToolName,
  skillToolName,
  WIRE_TOOL_NAME_RE,
} from "../../src/capability/tool-names.js";

describe("tool-names", () => {
  it("builds Claude-safe skill and mcp wire names", () => {
    expect(skillToolName("research-brief")).toBe("use_skill__research-brief");
    expect(mcpToolName("analytics", "query")).toBe("mcp__analytics__query");
    expect(WIRE_TOOL_NAME_RE.test(skillToolName("x"))).toBe(true);
    expect(WIRE_TOOL_NAME_RE.test("use_skill:x")).toBe(false);
  });

  it("parses new and legacy wire names", () => {
    expect(parseWireToolName("use_skill__a")).toEqual({
      kind: "skill",
      skillId: "a",
    });
    expect(parseWireToolName("use_skill:a")).toEqual({
      kind: "skill",
      skillId: "a",
    });
    expect(parseWireToolName("mcp__srv__tool")).toEqual({
      kind: "mcp",
      serverId: "srv",
      toolName: "tool",
    });
    expect(parseWireToolName("mcp:srv:tool")).toEqual({
      kind: "mcp",
      serverId: "srv",
      toolName: "tool",
    });
    expect(parseWireToolName("search")).toEqual({
      kind: "local",
      name: "search",
    });
  });

  it("assertWireToolName rejects colon", () => {
    expect(() => assertWireToolName("use_skill:x")).toThrow(
      /invalid_wire_tool_name/,
    );
  });
});
