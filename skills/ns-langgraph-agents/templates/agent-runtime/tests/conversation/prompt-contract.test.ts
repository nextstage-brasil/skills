import { describe, expect, it, afterEach } from "vitest";
import {
  clearRolePromptCache,
  loadRolePrompt,
  loadRolePromptMeta,
  parseRolePromptSource,
} from "../../src/conversation/load-role-prompt.js";

describe("role prompt contract", () => {
  afterEach(() => {
    clearRolePromptCache();
  });

  it("analyst prompt asserts {tool, args} and planner discipline", () => {
    const text = loadRolePrompt("analyst");
    expect(text).toMatch(/\{ ?"tool"/);
    expect(text.toLowerCase()).toContain("bindtools");
    expect(text.toLowerCase()).toMatch(/userfacingintent|operator/);
    expect(text).toMatch(/inputSchema/);
  });

  it("composer prompt is Markdown-only sole writer", () => {
    const text = loadRolePrompt("composer");
    expect(text.toLowerCase()).toContain("markdown");
    expect(text.toLowerCase()).toContain("sole writer");
    expect(text.toLowerCase()).toMatch(/evidence/);
  });

  it("exposes prompt_version per role from frontmatter", () => {
    expect(loadRolePromptMeta("analyst").promptVersion).toBe("1");
    expect(loadRolePromptMeta("composer").promptVersion).toBe("1");
  });

  it("throws when prompt_version frontmatter missing", () => {
    expect(() =>
      parseRolePromptSource("analyst", "# no frontmatter\n\nbody\n"),
    ).toThrow(/prompt_version_missing:analyst/);
  });
});
