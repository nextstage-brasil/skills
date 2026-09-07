import { AGENT_ERROR } from "../shared/error-codes.js";

export type HitlResumeBody = {
  decision?: string;
  approver_id?: string;
  approver_role?: string;
  always_escalate?: boolean;
  intent_category?: string;
  edited_args?: unknown;
  resume?: unknown;
};

export class HitlResumeError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "HitlResumeError";
    this.code = code;
  }
}

/** Always-escalate HITL resume MUST identify the human approver. */
export function assertHitlResumeApprover(body: HitlResumeBody): void {
  if (body.always_escalate !== true) {
    return;
  }
  const id = body.approver_id?.trim();
  const role = body.approver_role?.trim();
  if (!id || !role) {
    throw new HitlResumeError(AGENT_ERROR.HITL_APPROVER_REQUIRED);
  }
}

export function buildHitlResumePayload(body: HitlResumeBody): Record<string, unknown> {
  if (body.resume && typeof body.resume === "object" && !Array.isArray(body.resume)) {
    return body.resume as Record<string, unknown>;
  }
  return {
    decision: body.decision ?? "approve",
    approver_id: body.approver_id ?? null,
    approver_role: body.approver_role ?? null,
    intent_category: body.intent_category ?? null,
    always_escalate: body.always_escalate === true,
    edited_args: body.edited_args ?? null,
  };
}
