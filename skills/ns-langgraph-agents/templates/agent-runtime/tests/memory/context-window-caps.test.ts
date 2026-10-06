import { describe, expect, it } from "vitest";
import {
  compactTargetTokens,
  resolveContextConfig,
  shouldSummarize,
  summaryMaxTokens,
  truncateSkillBody,
  truncateToolOutput,
} from "../../src/memory/context-window.js";

describe("context-window caps", () => {
  it("skill body cap is independent of tool output cap", () => {
    const cfg = resolveContextConfig();
    expect(cfg.skillBodyMaxChars).not.toBe(cfg.toolOutputMaxChars);
    expect(cfg.skillBodyMaxChars).toBeGreaterThan(cfg.toolOutputMaxChars);
  });

  it("truncateSkillBody uses skill cap by default", () => {
    const long = "x".repeat(20_000);
    const out = truncateSkillBody(long);
    expect(out.length).toBeLessThan(long.length);
    expect(out).toContain("[truncated");
  });

  it("summarizes above 80% of the raw window and compacts to 50%", () => {
    const window = 12000;
    expect(shouldSummarize(window * 0.8, window)).toBe(false);
    expect(shouldSummarize(window * 0.8 + 1, window)).toBe(true);
    expect(compactTargetTokens(window)).toBe(6000);
    expect(summaryMaxTokens(window)).toBe(1200);
  });

  it("tool truncate does not use skill cap", () => {
    const cfg = resolveContextConfig();
    const long = "y".repeat(cfg.toolOutputMaxChars + 100);
    const out = truncateToolOutput(long, cfg.toolOutputMaxChars);
    expect(out.length).toBeLessThan(cfg.skillBodyMaxChars);
  });
});
