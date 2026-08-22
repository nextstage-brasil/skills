/**
 * Opt-in fidelity alert — observability only.
 * NEVER blocks the turn; NEVER writes error_logs / fails HTTP.
 *
 * Product may extend heuristics (entity names not in dataBundle, etc.).
 */

export type FidelityAlertInput = {
  responseMarkdown: string;
  dataBundle: unknown;
  discoveryBrief: unknown;
};

export type FidelityAlert = {
  code: string;
  detail: string;
};

/**
 * Generic heuristic stub: warn when response looks numeric-heavy but evidence is null.
 */
export function checkFidelityAlert(
  input: FidelityAlertInput,
): FidelityAlert | null {
  const md = input.responseMarkdown?.trim() ?? "";
  if (!md) {
    return null;
  }
  const looksNumeric = /\d/.test(md) && /(\d+[.,]\d+|\b\d{2,}\b)/.test(md);
  if (looksNumeric && input.dataBundle == null) {
    const alert: FidelityAlert = {
      code: "FIDELITY_NUMERIC_WITHOUT_EVIDENCE",
      detail: "Response contains numbers but dataBundle is null",
    };
    emitFidelityAlert(alert);
    return alert;
  }
  return null;
}

export function emitFidelityAlert(alert: FidelityAlert): void {
  console.warn(`[fidelity-alert] ${alert.code}: ${alert.detail}`);
}
