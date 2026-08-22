import { describe, expect, it, beforeEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";
import {
  getGraph,
  resetGraphForTests,
  routeAfterAnalyst,
  routeAfterGuard,
} from "../../src/graph/graph.js";
import type { AgentStateType } from "../../src/state.js";

describe("plan_execute graph", () => {
  beforeEach(() => {
    resetGraphForTests();
  });

  it("runs guard → … → respond", async () => {
    const graph = await getGraph();
    const result = await graph.invoke(
      { messages: [new HumanMessage("hello")] },
      { configurable: { thread_id: "test-ds-1" } },
    );
    expect(result.plan).toBe("done");
    expect(result.responseMarkdown).toBeTruthy();
    expect(result.analystStatus).toBe("complete");
    expect(result.mcpCatalog?.catalogVersion).toBe("stub");
    expect(result.turnLocale).toBe("en-US");
  });

  it("observes Portuguese locale from conversation", async () => {
    const graph = await getGraph();
    const result = await graph.invoke(
      { messages: [new HumanMessage("Olá, preciso de ajuda")] },
      { configurable: { thread_id: "test-ds-pt" } },
    );
    expect(result.turnLocale).toBe("pt-BR");
    expect(result.responseMarkdown).toMatch(/evidência|Olá|esclarecer/i);
  });

  it("routes need_more_data + actions to executor", () => {
    const state = {
      analystStatus: "need_more_data",
      executionPlan: { status: "need_more_data", actions: [{ tool: "x" }] },
    } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("executor");
  });

  it("routes need_more_data + empty actions back to analyst", () => {
    const state = {
      analystStatus: "need_more_data",
      executionPlan: { status: "need_more_data", actions: [] },
    } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("analyst");
  });

  it("routes complete to composer", () => {
    const state = { analystStatus: "complete" } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("composer");
  });

  it("routes guard block to respond", () => {
    expect(routeAfterGuard({ guardRoute: "respond" } as AgentStateType)).toBe(
      "respond",
    );
    expect(routeAfterGuard({ guardRoute: "agent" } as AgentStateType)).toBe(
      "context_manager",
    );
  });
});
