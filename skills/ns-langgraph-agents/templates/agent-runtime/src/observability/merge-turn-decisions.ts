/** Append-only merge for checkpoint `turn_decisions` JSONB. Resume MUST NOT clobber. */

export function toDecisionEvents(value: unknown): unknown[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

export function mergeTurnDecisions(
  existing: unknown,
  incoming: unknown,
): unknown[] {
  return [...toDecisionEvents(existing), ...toDecisionEvents(incoming)];
}
