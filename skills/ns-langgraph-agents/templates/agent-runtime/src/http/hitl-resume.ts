import { AGENT_ERROR } from "../shared/error-codes.js";
import { asRecord } from "../shared/records.js";
import {
  collectInterruptBuckets,
  interruptValue,
} from "./pending-interrupt.js";

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

export function canonicalDecisionOutcome(decision: string | undefined): string {
  const raw = (decision ?? "approved").toLowerCase();
  if (raw === "approve" || raw === "approved") {
    return "approved";
  }
  if (raw === "reject" || raw === "rejected") {
    return "rejected";
  }
  return raw;
}

function payloadAlwaysEscalate(item: unknown): boolean {
  const value = interruptValue(item);
  return value?.always_escalate === true;
}

/** Interrupt snapshot is SoT. Client `always_escalate` flag is not sufficient. */
export function interruptRequiresApprover(state: unknown): boolean {
  return collectInterruptBuckets(state).some((item) =>
    payloadAlwaysEscalate(item),
  );
}

export function alwaysEscalateEffective(
  body: HitlResumeBody,
  graphState: unknown,
): boolean {
  return interruptRequiresApprover(graphState) || body.always_escalate === true;
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

export function resolveHitlDecision(body: HitlResumeBody): string {
  return canonicalDecisionOutcome(body.decision);
}

export function buildHitlResumePayload(
  body: HitlResumeBody,
  alwaysEscalate: boolean,
): Record<string, unknown> {
  const nested = asRecord(body.resume) ?? {};
  const decision = resolveHitlDecision(body);
  return {
    ...nested,
    decision,
    approver_id: body.approver_id ?? nested.approver_id ?? null,
    approver_role: body.approver_role ?? nested.approver_role ?? null,
    intent_category: body.intent_category ?? nested.intent_category ?? null,
    always_escalate: alwaysEscalate,
    edited_args: body.edited_args ?? nested.edited_args ?? null,
  };
}

export function hitlTurnDecisionEvent(
  resumePayload: Record<string, unknown>,
  decidedAt: Date,
): Record<string, unknown> {
  return {
    decision_actor: "human",
    approver_id: resumePayload.approver_id ?? null,
    approver_role: resumePayload.approver_role ?? null,
    decided_at: decidedAt.toISOString(),
    decision_outcome: resumePayload.decision ?? null,
    always_escalate: resumePayload.always_escalate === true,
    intent_category: resumePayload.intent_category ?? null,
  };
}
