import { readPositiveNumberEnv } from "./env-number.js";

/** @env TURN_LATENCY_BUDGET_MS — wall-clock abort for graph stream/invoke (default 60000) */
export function readLatencyBudgetMs(): number {
  return readPositiveNumberEnv("TURN_LATENCY_BUDGET_MS", 60_000);
}
