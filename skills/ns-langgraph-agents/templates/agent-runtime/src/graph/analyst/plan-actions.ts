/** Plan action shape is exactly `{ tool, args }`. Reject aliases. */

import { asRecord } from "../../shared/records.js";

export type PlanAction = {
  tool: string;
  args: Record<string, unknown>;
};

const FORBIDDEN_KEYS = new Set([
  "name",
  "arguments",
  "params",
  "parameters",
]);

export function parsePlanAction(raw: unknown): PlanAction {
  const rec = asRecord(raw);
  if (!rec) {
    throw new Error("plan_action_not_object");
  }
  for (const key of Object.keys(rec)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`plan_action_forbidden_alias:${key}`);
    }
  }
  if (typeof rec.tool !== "string" || !rec.tool.trim()) {
    throw new Error("plan_action_tool_required");
  }
  if (!("args" in rec)) {
    throw new Error("plan_action_args_required");
  }
  const args = asRecord(rec.args);
  if (!args) {
    throw new Error("plan_action_args_must_be_object");
  }
  return { tool: rec.tool.trim(), args };
}

export function parsePlanActions(raw: unknown): PlanAction[] {
  if (!Array.isArray(raw)) {
    throw new Error("plan_actions_not_array");
  }
  return raw.map(parsePlanAction);
}
