# Project-local skill layout (harness)

Reference for skill-creator when authoring skills in a consumer project.

## Directory tree

```
{product_root}/
├── AGENTS.md
├── .nextstage-harness/           # Harness rules (not skill storage)
├── .agents/
│   ├── skills/
│   │   ├── skill-creator/        # Upstream bundle + this wrapper
│   │   └── <your-skill>/
│   │       ├── SKILL.md
│   │       ├── references/
│   │       ├── scripts/
│   │       └── evals/
│   │           └── evals.json
│   └── agents/
│       └── <persona>.md          # Optional thin wrappers
├── .cursor/skills/               # Symlinked — harness sync
├── .claude/skills/               # Symlinked — harness sync
└── skill-creator-workspace/      # Eval runs (optional; gitignore locally)
```

## Frontmatter

```yaml
---
name: my-skill-name
description: What it does and when to trigger (pushy).
depends:
  - nextstage-harness
---
```

`name` must match the directory name under `.agents/skills/`.

## After create or edit

```bash
npx @nextstage-brasil/harness sync
```

Syncs `.agents/skills/` → `.cursor/skills/`, `.claude/skills/` so agents discover the skill in the menu.

## Not this layout

The **nextstage-brasil/skills** git repository uses `skills/<name>/` at repo root and `packages/harness/templates/catalog.json` — that is maintainer-only. Do not use those paths in consumer projects.
