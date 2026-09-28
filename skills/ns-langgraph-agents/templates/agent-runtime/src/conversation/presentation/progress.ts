/** Human-readable operator progress copy — never raw status names in SSE message. */

import { isPtLocale } from "../../shared/locale.js";

export type ProgressKind =
  | "thinking"
  | "accessing_data"
  | "tool_started"
  | "tool_finished"
  | "planning"
  | "wrapping_up";

export function progressMessage(
  kind: ProgressKind,
  locale?: string | null,
): string {
  const pt = isPtLocale(locale);
  switch (kind) {
    case "thinking":
    case "planning":
      return pt ? "Planejando…" : "Planning…";
    case "accessing_data":
    case "tool_started":
      return pt ? "Coletando dados…" : "Fetching data…";
    case "tool_finished":
      return pt ? "Analisando…" : "Analyzing…";
    case "wrapping_up":
      return pt ? "Concluindo…" : "Wrapping up…";
    default:
      return pt ? "Planejando…" : "Planning…";
  }
}
