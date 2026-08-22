import { describe, expect, it } from "vitest";
import {
  resolveToolBudget,
  TurnToolBudget,
} from "../../src/capability/tool-budget.js";

describe("tool-budget", () => {
  it("resolves defaults from env", () => {
    const b = resolveToolBudget();
    expect(b.maxToolCallsPerTurn).toBeGreaterThan(0);
    expect(b.maxMcpCallsPerTurn).toBeGreaterThan(0);
  });

  it("skips duplicate fingerprints in the same turn", () => {
    const budget = new TurnToolBudget({
      maxToolCallsPerTurn: 10,
      maxMcpCallsPerTurn: 10,
    });
    expect(budget.recordCall("mcp", "mcp__s__t", "abc").allowed).toBe(true);
    const dup = budget.recordCall("mcp", "mcp__s__t", "abc");
    expect(dup.allowed).toBe(false);
    expect(dup.reason).toBe("duplicate_skip");
    expect(budget.getCounts().toolCalls).toBe(1);
    expect(budget.getCounts().duplicateSkips).toBe(1);
  });

  it("exhausts MCP budget separately", () => {
    const budget = new TurnToolBudget({
      maxToolCallsPerTurn: 20,
      maxMcpCallsPerTurn: 2,
    });
    expect(budget.recordCall("mcp", "a", "1").allowed).toBe(true);
    expect(budget.recordCall("mcp", "b", "2").allowed).toBe(true);
    const third = budget.recordCall("mcp", "c", "3");
    expect(third.allowed).toBe(false);
    expect(third.reason).toBe("budget_exhausted");
    expect(budget.isExhausted()).toBe(true);
  });

  it("tracks lastRoundAllDuplicates when every call is skipped", () => {
    const budget = new TurnToolBudget({
      maxToolCallsPerTurn: 10,
      maxMcpCallsPerTurn: 10,
    });
    budget.recordCall("local", "t", "fp");
    budget.beginRound();
    budget.recordCall("local", "t", "fp");
    budget.recordCall("local", "t", "fp");
    budget.endRound(2);
    expect(budget.allCallsWereDuplicates()).toBe(true);
  });
});
