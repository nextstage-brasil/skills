import { describe, expect, it } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import { buildAnalystUserPayload } from "../../src/graph/analyst/payload.js";
import { parsePlanAction } from "../../src/graph/analyst/plan-actions.js";
import type { AgentStateType } from "../../src/state.js";

describe("analyst payload", () => {
  it("includes current user message, catalog inputSchema, prior results", () => {
    const state = {
      messages: [new HumanMessage("What is the balance?")],
      mcpCatalog: {
        tools: [
          {
            name: "get_balance",
            description: "Fetch balance",
            inputSchema: { type: "object", required: ["account_id"] },
          },
        ],
        catalogVersion: "v1",
      },
      executionResults: [{ tool: "get_balance", data: { found: false } }],
      dataBundle: null,
      analystNarration: ["Planning…"],
    } as unknown as AgentStateType;

    const payload = buildAnalystUserPayload(state);
    expect(payload).toContain("## Current user message");
    expect(payload).toContain("What is the balance?");
    expect(payload).toContain("inputSchema");
    expect(payload).toContain("account_id");
    expect(payload).toContain("## Prior execution results");
    expect(payload).toContain("found");
    expect(payload).toContain("Lines already narrated");
  });

  it("rejects plan action aliases", () => {
    expect(() => parsePlanAction({ name: "x", arguments: {} })).toThrow(
      /forbidden_alias/,
    );
    expect(parsePlanAction({ tool: "x", args: { a: 1 } })).toEqual({
      tool: "x",
      args: { a: 1 },
    });
  });
});
