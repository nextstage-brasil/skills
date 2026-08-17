# NextStage Skills — repository guide

This file is for **maintainers of this repository**. It tells agents how to work on the skills catalog and harness package.

Consumer projects get a different `AGENTS.md` — scaffolded from `packages/harness/templates/AGENTS.md` when they run `npx @nextstage-brasil/harness`. Do not copy consumer-project rules here.

## Language

**English only — no exceptions.**

All artifacts in this repository must be written in English:

- `AGENTS.md`, `README.md`, and every other markdown file
- Skill instructions (`SKILL.md`), references, checklists, and scripts
- Commit messages, PR descriptions, and issue text
- Agent responses and deliverables produced while working in this repository

## Repository layout

```
skills/
├── <name>/             # Canonical skill source (SKILL.md + references/, scripts/, evals/)
├── ns-harness/         # Base harness skill (alwaysInstall)
└── _meta/              # Migration notes
packages/harness/       # @nextstage-brasil/harness CLI (install wizard, catalog, templates)
.cursor/skills/         # Maintainer-only project skills (not in harness catalog)
```

Skill ID = directory name (`ns-coder`). Install path: `skills/<name>/` — see `skills/_meta/MIGRATION.md`.

See `README.md` for the skill catalog and install instructions aimed at end users.

## Creating or editing a skill

Before drafting or changing anything under `skills/`, **read and follow** the user's `skill-creator` skill:

`~/.agents/skills/skill-creator/SKILL.md`

Use it for structure, frontmatter, description triggering, bundled resources, evals, and iteration. Save catalog skills to `skills/<name>/` and update `packages/harness/templates/catalog.json` per conventions below.

### Conventions (summary)

| Item | Rule |
|------|------|
| Directory | `skills/<kebab-case-name>/` |
| Frontmatter `name` | Must match directory name |
| `SKILL.md` | Under 500 lines; workflow in body, details in `references/` |
| Templates / checklists | `references/` |
| Scripts | `scripts/` |
| Evals | `evals/evals.json` — 2–3 realistic prompts |
| Harness coupling | Declare `depends: ns-harness` when referencing `./skills/ns-harness/` |
| Catalog | Add or update `depends` in `packages/harness/templates/catalog.json` for every new skill |

Full migration and path rules: `skills/_meta/MIGRATION.md`.

## Harness package

`packages/harness/` publishes `@nextstage-brasil/harness`. When changing install behavior, presets, or scaffolding:

- Keep `templates/catalog.json` in sync with `skills/` (validated by CI).
- Consumer `AGENTS.md` lives in `packages/harness/templates/AGENTS.md` — update there, not in this file.
- Run `npm test` in `packages/harness` before opening a PR.

See `packages/harness/README.md` for CLI flags and release notes.

## Validation

CI (`.github/workflows/validate-skills.yml`) runs on changes under `skills/` and `packages/harness/`:

- No legacy `_shared` or `harness-init` references
- `ns-harness` skill present
- Harness references declare `depends` in frontmatter
- Catalog matches skill directories (`node packages/harness/scripts/validate-catalog.js`)
- Harness CLI smoke tests

Run the catalog validator locally before pushing when adding or renaming skills.

## Maintainer-only project skills

Skills under `.cursor/skills/` guide work **in this repository** only. They are **not** listed in `catalog.json` and are **not** installed by harness. Example: `code-routing-diagram` — update the code routing Mermaid after changing routing in catalog skills.
