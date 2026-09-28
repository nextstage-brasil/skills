import type { InterruptPayload, InterruptOption } from "./stream-types.js";
import { asRecord } from "../shared/records.js";

export function collectInterruptBuckets(state: unknown): unknown[] {
  const rec = asRecord(state);
  if (!rec) {
    return [];
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
  return buckets;
}

export function interruptValue(item: unknown): Record<string, unknown> | null {
  const rec = asRecord(item);
  if (!rec) {
    return null;
  }
  return asRecord(rec.value) ?? rec;
}

const DEFAULT_INTERRUPT_OPTIONS: InterruptOption[] = [
  { id: "approved", label: "Approve" },
  { id: "rejected", label: "Reject" },
];

function normalizeOptions(raw: unknown): InterruptOption[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_INTERRUPT_OPTIONS;
  }
  const out: InterruptOption[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    const id = typeof rec.id === "string" ? rec.id : null;
    const label = typeof rec.label === "string" ? rec.label : id;
    if (id && label) {
      out.push({ id, label });
    }
  }
  return out.length > 0 ? out : DEFAULT_INTERRUPT_OPTIONS;
}

/** First pending interrupt shaped for the SSE `interrupted` envelope. */
export function extractPendingInterrupt(
  graphState: unknown,
): InterruptPayload | null {
  const buckets = collectInterruptBuckets(graphState);
  for (const item of buckets) {
    const value = interruptValue(item);
    if (!value) {
      continue;
    }
    const kind =
      typeof value.kind === "string" && value.kind.trim()
        ? value.kind.trim()
        : "hitl";
    const question =
      typeof value.question === "string" && value.question.trim()
        ? value.question.trim()
        : typeof value.message === "string" && value.message.trim()
          ? value.message.trim()
          : "Approval required";
    const payload: InterruptPayload = {
      kind,
      question,
      options: normalizeOptions(value.options),
    };
    if (value.always_escalate === true) {
      payload.always_escalate = true;
    }
    return payload;
  }
  return null;
}
