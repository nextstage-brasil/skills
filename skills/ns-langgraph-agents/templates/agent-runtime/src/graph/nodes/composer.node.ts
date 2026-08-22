import type { AgentStateType } from "../../state.js";
import { DEFAULT_FALLBACK_LOCALE, formatCurrency } from "../../shared/locale.js";

/**
 * Sole writer of user-facing Markdown. Narrates state channels — never invents evidence.
 */
export async function composerNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const md = composeFromState(state);
  return {
    responseMarkdown: md,
    turnDecisions: [{ route: "composer", outcome: "written" }],
  };
}

function composeFromState(state: AgentStateType): string {
  const locale = state.turnLocale ?? DEFAULT_FALLBACK_LOCALE;
  const isPt = locale.startsWith("pt");

  if (state.externalError) {
    if (isPt) {
      return `Encontrei um erro externo (${state.externalError.code}): ${state.externalError.message}`;
    }
    return `I hit an external error (${state.externalError.code}): ${state.externalError.message}`;
  }
  if (state.dataBundle) {
    const kind = state.dataBundle.kind;
    const payload = state.dataBundle.payload;
    const valueLine = formatEvidenceValue(payload, locale, state.turnCurrency);
    if (isPt) {
      return valueLine
        ? `Encontrei isto (${kind}): ${valueLine}.`
        : `Encontrei isto (${kind}).`;
    }
    return valueLine
      ? `Here is what I found (${kind}): ${valueLine}.`
      : `Here is what I found (${kind}).`;
  }
  if (state.discoveryBrief?.absenceConfirmed) {
    return isPt
      ? "Não encontrei itens correspondentes no catálogo."
      : "I could not find matching items in the catalog.";
  }
  if (state.discoveryBrief?.summary) {
    return state.discoveryBrief.summary;
  }
  return isPt
    ? "Ainda não tenho evidência suficiente para responder."
    : "I do not have enough evidence yet to answer.";
}

function formatEvidenceValue(
  payload: unknown,
  locale: string,
  currency: string | null,
): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return formatCurrency(payload, locale, currency ?? undefined);
  }
  if (typeof payload === "object" && payload !== null && "value" in payload) {
    const v = (payload as { value: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) {
      return formatCurrency(v, locale, currency ?? undefined);
    }
  }
  return null;
}
