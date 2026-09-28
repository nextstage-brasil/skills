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

  it("routes need_more_data + empty actions to composer", () => {
    const state = {
      analystStatus: "need_more_data",
      executionPlan: { status: "need_more_data", actions: [] },
    } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("composer");
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

  it("resets turn channels between invocations on same thread", async () => {
    const graph = await getGraph();
    const cfg = { configurable: { thread_id: "test-turn-reset" } };
    const turn1 = await graph.invoke(
      { messages: [new HumanMessage("hello")] },
      cfg,
    );
    // Simulate product nodes writing paint/evidence that must not leak.
    await graph.updateState(cfg, {
      paint: { kind: "stale" },
      render_spec: { kind: "stale" },
      dataBundle: { kind: "prior", payload: 1 },
      discoveryBrief: { found: true, summary: "prior" },
      analysis: { intent: "prior", userFacingIntent: "stale intent" },
    });
    expect(turn1.responseMarkdown).toBeTruthy();

    const turn2 = await graph.invoke(
      { messages: [new HumanMessage("next turn")] },
      cfg,
    );
    expect(turn2.paint).toBeNull();
    expect(turn2.render_spec).toBeNull();
    expect(turn2.dataBundle).toBeNull();
    expect(turn2.discoveryBrief).toBeNull();
    // analysis is rewritten by analyst this turn — must not keep prior intent
    expect(turn2.analysis?.intent).not.toBe("prior");
  });
});
