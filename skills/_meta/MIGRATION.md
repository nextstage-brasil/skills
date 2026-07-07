# NextStage Skills Migration

Migration notes for skills promoted into this repository as the canonical home for agent-agnostic workflows.

## Conventions

| Item | Rule |
|------|------|
| Directory names | `kebab-case` under `skills/<name>/` |
| Frontmatter `name` | Must match directory name |
| Language | English only for all artifacts |
| `SKILL.md` | Under 500 lines; workflow in body, details in `references/` |
| Templates / checklists | `references/` |
| Scripts | `scripts/` |
| Evals | `evals/evals.json` — 2–3 realistic prompts per skill |
| Path coupling | Use `nextstage-harness` (`depends` + `../nextstage-harness/references/harness-discovery.md`); never hardcode legacy factory skill paths |
| Skill dependencies | Declare `depends:` in frontmatter — resolved by `@nextstage-brasil/harness` and Skills CLI ([skills#861](https://github.com/vercel-labs/skills/pull/861)) |

## Harness discovery (summary)

1. If repo has `.cursor/rules/` or `AGENTS.md` → use repo root as `{product_root}`
2. Load project rules from `.cursor/rules/*.mdc` when they exist; never assume Grogoo/Laravel unless detected

## Canonical variables

| Variable | Default / resolution |
|----------|----------------------|
| `{product_root}` | Product folder (e.g. `apps/my-product/`) or repo root in standalone mode |
| `{specs_root}` | `{product_root}/docs/specs/` |
| `{version_san}` | Sanitized version id (e.g. `1.0.0`) |
| Version artifacts | `{product_root}/docs/versions/{version_san}/` |

## Skill catalog

See root `README.md` for the full catalog and `packages/harness/templates/catalog.json` for install presets and `depends`.

## Cross-skill dependencies

Declared in frontmatter `depends` (install-time) and referenced in skill bodies (runtime):

| Skill | `depends` |
|-------|-----------|
| `nextstage-harness` | — (base dependency) |
| SDD consumers (`clarify-requirements`, `requirements-generator`, `analyze-consistency`, `task-generator`, `execution-handoff-generator`, `version-partitioner`, `bootstrap-brownfield`, `living-spec-consolidator`, `coder`, `code-investigator`) | `nextstage-harness` |
| `architecture-rules-generator` | `nextstage-harness` |
| `mcp-gitlab-usage` | `nextstage-harness` |
| `code-reviewer` | `nextstage-harness`, `mcp-gitlab-usage` |
| `execute-gitlab-issue` | `nextstage-harness`, `mcp-gitlab-usage`, `code-reviewer` |
| `gitlab-board-sync` | `mcp-gitlab-usage` |

SDD workflow ordering (`clarify-requirements` → `requirements-generator` → …) and planning/execution pairs (`e2e-test-generator` ↔ `create-e2e-tests`) stay as "Related skills" text only — separate install phases.

## Install

```bash
npx @nextstage-brasil/harness
```

Or manually:

```bash
npx skills add nextstage-brasil/skills@<skill-name> --full-depth -y
```

When CLI supports `depends`, transitive deps install automatically. Until then (`skills@1.5.14`), use `@nextstage-brasil/harness` or install peers explicitly — see `README.md`.
