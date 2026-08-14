# Project-local skill authoring

Create or improve **project-local** agent skills in a harness consumer project — not in the `nextstage-brasil/skills` catalog repo.

## Prerequisites — Anthropics skill-creator

Workflow, eval loop, scripts, and description optimization come from upstream **skill-creator** ([anthropics/skills](https://github.com/anthropics/skills)).

Install into this project:

```bash
npx skills add https://github.com/anthropics/skills --skill skill-creator -y
```

`npx @nextstage-brasil/harness --preset full --yes` also installs `skill-creator` automatically.

Read the full workflow from `.agents/skills/skill-creator/SKILL.md` (or `~/.agents/skills/skill-creator/SKILL.md` when installed globally). Apply the **path overrides** and **post-create sync** below on top of upstream instructions.

## Path overrides (consumer projects)

| Artifact | Path | Notes |
| -------- | ---- | ----- |
| New/edited skill | `.agents/skills/<kebab-case-name>/` | `name` frontmatter must match directory |
| `SKILL.md` | `.agents/skills/<name>/SKILL.md` | English unless team defines otherwise in `AGENTS.md` |
| `references/`, `scripts/`, `evals/` | Under the skill directory | `evals/evals.json` — 2–3 realistic prompts when evals add value |
| Eval workspace | `skill-creator-workspace/` | `iteration-N/eval-<id>/` per upstream |
| Upstream tooling | `.agents/skills/skill-creator/` | `scripts/`, `eval-viewer/` from anthropics bundle |

**Never** save project skills to `skills/` at repo root — that layout is for the **nextstage-brasil/skills** maintainer catalog only.

## Frontmatter

```yaml
---
name: my-skill-name
description: What it does and when to trigger (pushy).
depends:
  - ns-harness
---
```

Declare `depends:` only when the skill references other installed skills.

## Post-create — harness sync

After skill files are written or materially updated, run from the repo root:

```bash
npx @nextstage-brasil/harness sync
```

Regenerates Claude skill symlinks (`.claude/skills/`). Cursor reads `.agents/skills/` directly.

Use `npx @nextstage-brasil/harness sync --check` after editing canonical rules to verify adapters match before committing `.nextstage-harness/` changes.

Report sync results. Do not claim the skill is discoverable until sync completes successfully.

## Description optimization

After the skill is stable, offer upstream description optimization per `skill-creator` (`run_loop.py`). Update `.agents/skills/<name>/SKILL.md` frontmatter, then run `harness sync` if adapters need refresh.
