import { describe, expect, it } from "vitest";
import { parseSkillMarkdown } from "../../src/skills/loader.js";

describe("skills loader", () => {
  it("parses front-matter and body", () => {
    const skill = parseSkillMarkdown(
      `---
id: research-brief
when_to_use: When researching.
classification: read
---

# Body

Do the thing.
`,
      "/tmp/research-brief.md",
    );
    expect(skill.id).toBe("research-brief");
    expect(skill.when_to_use).toBe("When researching.");
    expect(skill.classification).toBe("read");
    expect(skill.body).toContain("# Body");
  });

  it("defaults id from filename when front-matter omits id", () => {
    const skill = parseSkillMarkdown("# Only body\n", "/skills/my-skill.md");
    expect(skill.id).toBe("my-skill");
    expect(skill.classification).toBe("read");
  });
});
