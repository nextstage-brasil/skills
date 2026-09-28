import type { AgentStateType } from "../../state.js";
import { lastHumanText } from "../../shared/messages.js";

const SCHEMA_TRUNCATE = 2000;

function truncateSchema(schema: unknown): unknown {
  if (schema === undefined || schema === null) {
    return undefined;
  }
  const raw = JSON.stringify(schema);
  if (raw.length <= SCHEMA_TRUNCATE) {
    return schema;
  }
  return { _truncated: true, preview: raw.slice(0, SCHEMA_TRUNCATE) };
}

/** Analyst user payload: current message, catalog+inputSchema, prior results. */
export function buildAnalystUserPayload(state: AgentStateType): string {
  const lines: string[] = [];
  lines.push("## Current user message");
  lines.push(lastHumanText(state.messages) || "(empty)");
  lines.push("");
  lines.push("## Tool catalog");
  const tools = state.mcpCatalog?.tools ?? [];
  if (tools.length === 0) {
    lines.push("(empty)");
  } else {
    for (const t of tools) {
      const schema = truncateSchema(t.inputSchema);
      lines.push(
        `- ${t.name}: ${t.description}${
          schema !== undefined
            ? `\n  inputSchema: ${JSON.stringify(schema)}`
            : ""
        }`,
      );
    }
  }
  lines.push("");
  lines.push("## Prior execution results");
  const results = state.executionResults ?? [];
  if (results.length === 0) {
    lines.push("(none)");
  } else {
    lines.push(JSON.stringify(results, null, 2));
  }
  if (state.dataBundle) {
    lines.push("");
    lines.push("## dataBundle");
    lines.push(JSON.stringify(state.dataBundle, null, 2));
  }
  const narration = state.analystNarration ?? [];
  if (narration.length > 0) {
    lines.push("");
    lines.push("## Lines already narrated this turn");
    for (const n of narration) {
      lines.push(`- ${n}`);
    }
  }
  return lines.join("\n");
}
