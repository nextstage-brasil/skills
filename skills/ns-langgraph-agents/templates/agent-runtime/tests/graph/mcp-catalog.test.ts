import { describe, expect, it } from "vitest";
import { toCatalogTools } from "../../src/graph/nodes/mcp-catalog.node.js";

describe("toCatalogTools", () => {
  it("passes inputSchema when catalog populated", () => {
    const tools = toCatalogTools([
      {
        name: "get_x",
        description: "x",
        inputSchema: { type: "object", required: ["id"] },
      },
      { name: "no_schema", description: "y" },
    ]);
    expect(tools[0]?.inputSchema).toEqual({
      type: "object",
      required: ["id"],
    });
    expect(tools[1]?.inputSchema).toBeUndefined();
  });
});
