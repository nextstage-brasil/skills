import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import {
  analystNode,
  executionHasToolError,
} from "../../src/graph/nodes/analyst.node.js";
import type { AgentStateType } from "../../src/state.js";
import { AGENT_ERROR } from "../../src/shared/error-codes.js";

vi.mock("../../src/llm/json-output.js", () => ({
  invokeJsonSchema: vi.fn(),
}));

vi.mock("../../src/llm/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/llm/config.js")>();
  return {
    ...actual,
    resolveLlmConfigForRole: vi.fn(),
  };
});

import { invokeJsonSchema } from "../../src/llm/json-output.js";
import { resolveLlmConfigForRole } from "../../src/llm/config.js";

const invokeMock = vi.mocked(invokeJsonSchema);
const resolveMock = vi.mocked(resolveLlmConfigForRole);

describe("executionHasToolError", () => {
  it("trips only when error === true", () => {
    expect(executionHasToolError([{ error: true }])).toBe(true);
    expect(executionHasToolError([{ error: false }])).toBe(false);
    expect(executionHasToolError([{ error: "boom" }])).toBe(false);
    expect(executionHasToolError([{}])).toBe(false);
  });
});

describe("analystNode tool-error breaker", () => {
  beforeEach(() => {
    resolveMock.mockReturnValue(null);
    invokeMock.mockReset();
  });

  afterEach(() => {
    resolveMock.mockReturnValue(null);
  });

  it("error: false does not trip breaker", async () => {
    const out = await analystNode({
      messages: [new HumanMessage("hi")],
      executionResults: [{ tool: "x", error: false }],
      analystIteration: 0,
      analystNarration: [],
      turnLocale: "en-US",
    } as AgentStateType);
    expect(out.analysis?.intent).not.toBe("tool_error_breaker");
    expect(out.turnDecisions?.[0]?.outcome).not.toBe("tool_error_complete");
  });

  it("error: true → complete + empty actions + tool_error decision", async () => {
    const out = await analystNode({
      messages: [new HumanMessage("hi")],
      executionResults: [{ tool: "x", error: true }],
      analystIteration: 0,
      analystNarration: [],
      turnLocale: "en-US",
    } as AgentStateType);
    expect(out.analystStatus).toBe("complete");
    expect(out.executionPlan).toEqual({ status: "complete", actions: [] });
    expect(out.analysis?.intent).toBe("tool_error_breaker");
    expect(out.turnDecisions?.[0]?.outcome).toBe("tool_error_complete");
  });
});

describe("analystNode LLM path", () => {
  const llmCfg = {
    role: "analyst" as const,
    provider: "openai" as const,
    apiKey: "sk",
    model: "gpt",
    baseURL: "https://api.openai.com/v1",
    temperature: 0,
    stage: "analyst" as const,
  };

  beforeEach(() => {
    invokeMock.mockReset();
    resolveMock.mockReturnValue(llmCfg);
  });

  afterEach(() => {
    resolveMock.mockReturnValue(null);
  });

  it("parses LLM plan into need_more_data actions", async () => {
    invokeMock.mockResolvedValue({
      intent: "fetch",
      userFacingIntent: "Looking up…",
      executionPlan: {
        status: "need_more_data",
        actions: [{ tool: "get_x", args: { id: "1" } }],
      },
    });
    const out = await analystNode({
      messages: [new HumanMessage("hi")],
      executionResults: [],
      analystIteration: 0,
      analystNarration: [],
      turnLocale: "en-US",
      mcpCatalog: { tools: [], catalogVersion: "v1" },
    } as AgentStateType);
    expect(out.analystStatus).toBe("need_more_data");
    expect(out.executionPlan?.actions).toEqual([
      { tool: "get_x", args: { id: "1" } },
    ]);
    expect(invokeMock).toHaveBeenCalled();
  });

  it("sets errorCode on LLM failure", async () => {
    invokeMock.mockRejectedValue(new Error("boom"));
    const out = await analystNode({
      messages: [new HumanMessage("hi")],
      executionResults: [],
      analystIteration: 0,
      analystNarration: [],
      turnLocale: "en-US",
    } as AgentStateType);
    expect(out.errorCode).toBe(AGENT_ERROR.LLM_FAILURE);
    expect(out.turnDecisions?.[0]?.outcome).toBe("llm_failure");
  });

  it("records planParseError when actions invalid", async () => {
    invokeMock.mockResolvedValue({
      intent: "x",
      userFacingIntent: "ok",
      executionPlan: {
        status: "need_more_data",
        actions: [{ name: "bad" }],
      },
    });
    const out = await analystNode({
      messages: [new HumanMessage("hi")],
      executionResults: [],
      analystIteration: 0,
      analystNarration: [],
      turnLocale: "en-US",
    } as AgentStateType);
    expect(out.analystStatus).toBe("complete");
    expect(out.turnDecisions?.[0]?.notes?.planParseError).toBeTruthy();
  });
});
