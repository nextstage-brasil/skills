import { describe, expect, it } from "vitest";
import { AGENT_ERROR } from "../../src/shared/error-codes.js";
import {
  alwaysEscalateEffective,
  assertHitlResumeApprover,
  buildHitlResumePayload,
  canonicalDecisionOutcome,
  HitlResumeError,
  interruptRequiresApprover,
} from "../../src/http/hitl-resume.js";

describe("assertHitlResumeApprover", () => {
  it("rejects always-escalate resume without approver identity", () => {
    expect(() =>
      assertHitlResumeApprover({
        decision: "approve",
        always_escalate: true,
      }),
    ).toThrow(HitlResumeError);
    try {
      assertHitlResumeApprover({ always_escalate: true, approver_id: "x" });
    } catch (err) {
      expect(err).toBeInstanceOf(HitlResumeError);
      expect((err as HitlResumeError).code).toBe(
        AGENT_ERROR.HITL_APPROVER_REQUIRED,
      );
    }
  });

  it("accepts always-escalate when approver_id and approver_role are set", () => {
    expect(() =>
      assertHitlResumeApprover({
        always_escalate: true,
        approver_id: "user-123",
        approver_role: "regulatory-reviewer",
      }),
    ).not.toThrow();
  });

  it("does not require approver when always_escalate is not true", () => {
    expect(() =>
      assertHitlResumeApprover({ decision: "approve" }),
    ).not.toThrow();
  });
});

describe("interruptRequiresApprover", () => {
  const alwaysEscalateInterrupt = {
    tasks: [
      {
        interrupts: [
          { value: { kind: "tool_approval", always_escalate: true } },
        ],
      },
    ],
  };

  it("treats interrupt always_escalate as required even if body omits the flag", () => {
    expect(interruptRequiresApprover(alwaysEscalateInterrupt)).toBe(true);
    expect(
      alwaysEscalateEffective({ decision: "approve" }, alwaysEscalateInterrupt),
    ).toBe(true);
    expect(() =>
      assertHitlResumeApprover({
        decision: "approve",
        always_escalate: alwaysEscalateEffective(
          { decision: "approve" },
          alwaysEscalateInterrupt,
        ),
      }),
    ).toThrow(HitlResumeError);
  });

  it("does not require approver when interrupt is not always-escalate", () => {
    const midBand = {
      interrupts: [{ value: { kind: "tool_approval", always_escalate: false } }],
    };
    expect(interruptRequiresApprover(midBand)).toBe(false);
  });
});

describe("buildHitlResumePayload", () => {
  it("maps approve to canonical approved and keeps outer identity over nested resume", () => {
    const payload = buildHitlResumePayload(
      {
        decision: "approve",
        approver_id: "user-123",
        approver_role: "regulatory-reviewer",
        resume: { decision: "approve", foo: 1 },
      },
      true,
    );
    expect(payload.decision).toBe("approved");
    expect(payload.approver_id).toBe("user-123");
    expect(payload.approver_role).toBe("regulatory-reviewer");
    expect(payload.always_escalate).toBe(true);
    expect(payload.foo).toBe(1);
  });
});

describe("canonicalDecisionOutcome", () => {
  it("normalizes approve/reject", () => {
    expect(canonicalDecisionOutcome("approve")).toBe("approved");
    expect(canonicalDecisionOutcome("reject")).toBe("rejected");
  });
});
