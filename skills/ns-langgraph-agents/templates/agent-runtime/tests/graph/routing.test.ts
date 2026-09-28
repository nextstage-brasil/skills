import { describe, expect, it } from "vitest";
import {
  routeAfterAnalyst,
  routeAfterExecutor,
} from "../../src/graph/nodes/analyst.node.js";
import type { AgentStateType } from "../../src/state.js";

describe("routing", () => {
  it("need_more_data + actions → executor", () => {
    const state = {
      analystStatus: "need_more_data",
      executionPlan: { status: "need_more_data", actions: [{ tool: "x", args: {} }] },
    } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("executor");
  });

  it("need_more_data + empty actions → composer (no self-loop)", () => {
    const state = {
      analystStatus: "need_more_data",
      executionPlan: { status: "need_more_data", actions: [] },
    } as AgentStateType;
    expect(routeAfterAnalyst(state)).toBe("composer");
  });

  it("complete → composer", () => {
    expect(
      routeAfterAnalyst({ analystStatus: "complete" } as AgentStateType),
    ).toBe("composer");
  });

  it("executor → analyst when need_more_data under cap", () => {
    const state = {
      analystStatus: "need_more_data",
      analystIteration: 1,
      executionPlan: { status: "need_more_data", actions: [{ tool: "a", args: {} }] },
    } as AgentStateType;
    expect(routeAfterExecutor(state)).toBe("analyst");
  });

  it("executor → composer when actions empty", () => {
    const state = {
      analystStatus: "need_more_data",
      analystIteration: 1,
      executionPlan: { status: "need_more_data", actions: [] },
    } as AgentStateType;
    expect(routeAfterExecutor(state)).toBe("composer");
  });

  it("executor → composer when iteration at cap", () => {
    const state = {
      analystStatus: "need_more_data",
      analystIteration: 3,
      executionPlan: { status: "need_more_data", actions: [{ tool: "a", args: {} }] },
    } as AgentStateType;
    expect(routeAfterExecutor(state)).toBe("composer");
  });
});
