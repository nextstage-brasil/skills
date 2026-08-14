# Project-local skill authoring

Create/improve **project-local** agent skills in harness consumer — not `nextstage-brasil/skills` catalog.

## Prerequisites — Anthropics skill-creator

Workflow/evals/scripts/description optimization from upstream **skill-creator** ([anthropics/skills](https://github.com/anthropics/skills)).

```bash
npx skills add https://github.com/anthropics/skills --skill skill-creator -y
```

`npx @nextstage-brasil/harness --preset full --yes` also installs `skill-creator`.

Read `.agents/skills/skill-creator/SKILL.md` (or `~/.agents/skills/skill-creator/SKILL.md`). Apply **path overrides** + **post-create sync** below.

## Path overrides (consumer)

| Artifact | Path | Notes |
| -------- | ---- | ----- |
| New/edited skill | `.agents/skills/<kebab-case-name>/` | `name` frontmatter = directory |
| `SKILL.md` | `.agents/skills/<name>/SKILL.md` | English unless `AGENTS.md` says otherwise |
| `references/`, `scripts/`, `evals/` | Under skill dir | `evals/evals.json` — 2–3 prompts when useful |
| Eval workspace | `skill-creator-workspace/` | `iteration-N/eval-<id>/` |
| Upstream tooling | `.agents/skills/skill-creator/` | `scripts/`, `eval-viewer/` |

**Never** save project skills to repo-root `skills/` — maintainer catalog only.

## Frontmatter

```yaml
---
name: my-skill-name
description: What it does and when to trigger (pushy).
depends:
  - ns-harness
---
```

`depends:` only when referencing other installed skills.

## Post-create — harness sync

```bash
npx @nextstage-brasil/harness sync
```

Regenerates Claude skill symlinks. Cursor reads `.agents/skills/` directly.

`harness sync --check` after canonical rule edits before commit.

Report sync results. Do not claim discoverable until sync succeeds.

## Description optimization

Stable skill → offer upstream description optimization (`run_loop.py`). Update frontmatter, then `harness sync` if adapters need refresh.
