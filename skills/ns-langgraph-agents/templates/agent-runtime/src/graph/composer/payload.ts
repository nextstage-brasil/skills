import type { AgentStateType } from "../../state.js";
import { lastHumanText } from "../../shared/messages.js";

/** Composer user payload: current message + evidence channels + memory notices. */
export function buildComposerUserPayload(state: AgentStateType): string {
  const lines: string[] = [];
  lines.push("## Current user message");
  lines.push(lastHumanText(state.messages) || "(empty)");
  lines.push("");
  lines.push("## Evidence channels");
  if (state.dataBundle) {
    lines.push("### dataBundle");
    lines.push(JSON.stringify(state.dataBundle, null, 2));
  }
  if (state.discoveryBrief) {
    lines.push("### discoveryBrief");
    lines.push(JSON.stringify(state.discoveryBrief, null, 2));
  }
  if (state.externalError) {
    lines.push("### externalError");
    lines.push(JSON.stringify(state.externalError, null, 2));
  }
  const results = state.executionResults ?? [];
  if (results.length > 0) {
    lines.push("### executionResults");
    lines.push(JSON.stringify(results, null, 2));
  }
  if (
    !state.dataBundle &&
    !state.discoveryBrief &&
    !state.externalError &&
    results.length === 0
  ) {
    lines.push("(no evidence)");
  }
  const notices = state.memoryNotices ?? [];
  if (notices.length > 0) {
    lines.push("");
    lines.push("## Memory notices (acknowledge each in one short line)");
    lines.push(JSON.stringify(notices, null, 2));
  }
  return lines.join("\n");
}
