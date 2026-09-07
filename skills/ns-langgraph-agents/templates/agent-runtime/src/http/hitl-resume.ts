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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function payloadAlwaysEscalate(value: unknown): boolean {
  const rec = asRecord(value);
  if (!rec) {
    return false;
  }
  const inner = rec.value ?? rec;
  const innerRec = asRecord(inner) ?? rec;
  return innerRec.always_escalate === true;
}

/** Interrupt snapshot is SoT. Client `always_escalate` flag is not sufficient. */
export function interruptRequiresApprover(state: unknown): boolean {
  const rec = asRecord(state);
  if (!rec) {
    return false;
  }
  const buckets: unknown[] = [];
  if (Array.isArray(rec.interrupts)) {
    buckets.push(...rec.interrupts);
  }
  if (Array.isArray(rec.tasks)) {
    for (const task of rec.tasks) {
      const t = asRecord(task);
      if (t && Array.isArray(t.interrupts)) {
        buckets.push(...t.interrupts);
      }
    }
  }
  return buckets.some((item) => payloadAlwaysEscalate(item));
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
  body: HitlResumeBody,
  alwaysEscalate: boolean,
  decidedAt: Date,
): Record<string, unknown> {
  return {
    decision_actor: "human",
    approver_id: body.approver_id ?? null,
    approver_role: body.approver_role ?? null,
    decided_at: decidedAt.toISOString(),
    decision_outcome: resolveHitlDecision(body),
    always_escalate: alwaysEscalate,
    intent_category: body.intent_category ?? null,
  };
}
