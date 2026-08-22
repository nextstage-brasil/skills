import { describe, expect, it } from "vitest";
import { buildRunConfig } from "../../src/observability/langsmith.js";

describe("buildRunConfig", () => {
  it("sets thread_id and tenant metadata for LangGraph", () => {
    const cfg = buildRunConfig("thread_test", {
      op: "invoke",
      tenant_id: "demo",
      tags: ["demo"],
    });
    expect(cfg.configurable?.thread_id).toBe("thread_test");
    expect(cfg.runName).toBe("agent-invoke-demo");
    expect(cfg.metadata?.tenant_id).toBe("demo");
    expect(cfg.tags).toContain("invoke");
    expect(cfg.tags).toContain("demo");
  });
});
