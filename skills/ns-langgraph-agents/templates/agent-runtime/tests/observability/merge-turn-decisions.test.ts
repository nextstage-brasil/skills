import { describe, expect, it } from "vitest";
import { mergeTurnDecisions } from "../../src/observability/merge-turn-decisions.js";

describe("mergeTurnDecisions", () => {
  it("appends resume events onto the pre-interrupt flush", () => {
    const preInterrupt = [
      { decision_outcome: "escalated", always_escalate: true },
    ];
    const resume = {
      decision_outcome: "approved",
      decision_actor: "human",
      approver_id: "user-123",
    };
    expect(mergeTurnDecisions(preInterrupt, resume)).toEqual([
      preInterrupt[0],
      resume,
    ]);
  });

  it("does not drop the prior array when incoming is also an array", () => {
    expect(mergeTurnDecisions([{ a: 1 }], [{ b: 2 }])).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it("treats null existing as empty", () => {
    expect(mergeTurnDecisions(null, { x: 1 })).toEqual([{ x: 1 }]);
  });
});
