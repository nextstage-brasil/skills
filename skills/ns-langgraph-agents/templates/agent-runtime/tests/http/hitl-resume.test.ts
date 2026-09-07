import { describe, expect, it } from "vitest";
import { AGENT_ERROR } from "../../src/shared/error-codes.js";
import {
  assertHitlResumeApprover,
  HitlResumeError,
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
