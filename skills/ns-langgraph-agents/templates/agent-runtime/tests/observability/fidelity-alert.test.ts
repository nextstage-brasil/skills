import { describe, expect, it, vi, afterEach } from "vitest";
import {
  checkFidelityAlert,
  emitFidelityAlert,
} from "../../src/observability/fidelity-alert.js";

describe("fidelity-alert", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when numbers appear without dataBundle", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const alert = checkFidelityAlert({
      responseMarkdown: "Total was 1,234 units.",
      dataBundle: null,
      discoveryBrief: null,
    });
    expect(alert?.code).toBe("FIDELITY_NUMERIC_WITHOUT_EVIDENCE");
    expect(spy).toHaveBeenCalled();
  });

  it("is silent when evidence exists", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const alert = checkFidelityAlert({
      responseMarkdown: "Total was 10.",
      dataBundle: { kind: "kpi", payload: { total: 10 } },
      discoveryBrief: null,
    });
    expect(alert).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("emitFidelityAlert never throws", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      emitFidelityAlert({ code: "X", detail: "y" }),
    ).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
