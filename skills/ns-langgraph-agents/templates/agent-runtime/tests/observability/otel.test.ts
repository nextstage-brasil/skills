import { describe, expect, it, beforeEach } from "vitest";
import {
  recordToolCallMetric,
  recordBudgetKilled,
  getOtelRobustnessMetrics,
  resetOtelMetricsForTests,
  isOtelEnabled,
} from "../../src/observability/otel.js";

describe("otel metrics", () => {
  beforeEach(() => {
    resetOtelMetricsForTests();
  });

  it("counts repeated arg fingerprints", () => {
    recordToolCallMetric("aaaa");
    recordToolCallMetric("aaaa");
    recordToolCallMetric("bbbb");
    recordBudgetKilled();
    const m = getOtelRobustnessMetrics();
    expect(m.toolCalls).toBe(3);
    expect(m.repeatedArgFingerprints).toBe(1);
    expect(m.budgetKilled).toBe(1);
  });

  it("is disabled unless OTEL_ENABLED=true", () => {
    const prev = process.env.OTEL_ENABLED;
    delete process.env.OTEL_ENABLED;
    expect(isOtelEnabled()).toBe(false);
    process.env.OTEL_ENABLED = "true";
    expect(isOtelEnabled()).toBe(true);
    if (prev === undefined) {
      delete process.env.OTEL_ENABLED;
    } else {
      process.env.OTEL_ENABLED = prev;
    }
  });
});
