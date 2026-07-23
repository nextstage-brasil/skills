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

1. If repo has `AGENTS.md` → use repo root (or monorepo product folder) as `{product_root}`
2. Load canonical rules from `{harness_root}/rules/*.md` (`.nextstage-harness/rules/`)
3. Read `architecture-rules.md` first; layer rules by changed files
4. **Legacy:** `.cursor/rules/*.mdc` only when `{harness_root}/` is absent — migrate with `npx @nextstage-brasil/harness migrate-rules`
5. Regenerate adapters with `npx @nextstage-brasil/harness sync` after editing canonical rules

See `skills/nextstage-harness/references/harness-discovery.md` and `rules-sync.md`.

## Canonical variables

| Variable | Default / resolution |
|----------|----------------------|
| `{product_root}` | Product folder (e.g. `apps/my-product/`) or repo root in standalone mode |
| `{harness_root}` | `{product_root}/.nextstage-harness/` |
| `{rules_canonical}` | `{harness_root}/rules/*.md` |
| `{skills_canonical}` | `{product_root}/.agents/skills/` |
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
| SDD consumers (`pm-clarify-requirements`, `pm-requirements-generator`, `pm-analyze-consistency`, `pm-task-generator`, `execution-handoff-generator`, `pm-version-partitioner`, `harness-bootstrap-brownfield`, `pm-living-spec-consolidator`, `code-coder`, `code-investigator`) | `nextstage-harness` |
| `harness-architecture-rules` | `nextstage-harness` |
| `harness-agents-md` | `nextstage-harness` |
| `mcp-gitlab-usage` | `nextstage-harness` |
| `code-reviewer` | `nextstage-harness`, `mcp-gitlab-usage` |
| `execution-gitlab-issue` | `nextstage-harness`, `mcp-gitlab-usage`, `code-reviewer`, `code-autonomous` (calls it internally for Phase 2) |
| `code-autonomous` | `nextstage-harness`, `code-reviewer` |
| `gitlab-board-sync` | `mcp-gitlab-usage` |

SDD workflow ordering (`pm-clarify-requirements` → `pm-requirements-generator` → …) and planning/execution pairs (`pm-e2e-test-generator` ↔ `code-e2e-tests`) stay as "Related skills" text only — separate install phases.

## Install

```bash
npx @nextstage-brasil/harness
```

Or manually:

```bash
npx skills add nextstage-brasil/skills@<skill-name> --full-depth -y
```

When CLI supports `depends`, transitive deps install automatically. Until then (`skills@1.5.14`), use `@nextstage-brasil/harness` or install peers explicitly — see `README.md`.

## Breaking change — domain prefix rename (2026-07)

Skills were renamed with domain prefixes (`pm-`, `code-`, `execution-`, `harness-`). Old install paths no longer exist in the catalog.

| Old name | New name |
| -------- | -------- |
| `clarify-requirements` | `pm-clarify-requirements` |
| `requirements-generator` | `pm-requirements-generator` |
| `analyze-consistency` | `pm-analyze-consistency` |
| `version-partitioner` | `pm-version-partitioner` |
| `task-generator` | `pm-task-generator` |
| `unit-test-task-generator` | `pm-unit-test-task-generator` |
| `e2e-test-generator` | `pm-e2e-test-generator` |
| `living-spec-consolidator` | `pm-living-spec-consolidator` |
| `create-e2e-tests` | `code-e2e-tests` |
| `create-backend-tests` | `code-backend-tests` |
| `execute-gitlab-issue` | `execution-gitlab-issue` |
| `agents-md-generator` | `harness-agents-md` |
| `architecture-rules-generator` | `harness-architecture-rules` |
| `bootstrap-brownfield` | `harness-bootstrap-brownfield` |
| `codebase-reverse-spec` | `harness-codebase-reverse-spec` |

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@<new-name>`. After install, `harness init` automatically removes retired directories when the replacement skill is present. Preview cleanup with `npx @nextstage-brasil/harness prune-retired-skills --dry-run`.
