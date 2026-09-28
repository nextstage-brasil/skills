/** Analyst hop cap — router SoT (`routeAfterExecutor`). */

import { readPositiveNumberEnv } from "../../shared/env-number.js";

function maxAnalystIterations(): number {
  return readPositiveNumberEnv("AGENT_MAX_ANALYST_ITERATIONS", 3);
}

/** True when `analystIteration` already at/above cap — next hop must be composer. */
export function analystCapReached(iteration: number): boolean {
  return iteration >= maxAnalystIterations();
}
