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
| Path coupling | Use `ns-harness` (`depends` + `../ns-harness/references/harness-discovery.md`); never hardcode legacy factory skill paths |
| Skill dependencies | Declare `depends:` in frontmatter — resolved by `@nextstage-brasil/harness` and Skills CLI ([skills#861](https://github.com/vercel-labs/skills/pull/861)) |

## Harness discovery (summary)

1. If repo has `AGENTS.md` → use repo root (or monorepo product folder) as `{product_root}`
2. Load canonical rules from `{harness_root}/rules/*.md` (`.nextstage-harness/rules/`)
3. Read `architecture-rules.md` first; layer rules by changed files
4. **Legacy:** `.cursor/rules/*.mdc` only when `{harness_root}/` is absent — migrate with `npx @nextstage-brasil/harness migrate-rules`
5. Regenerate adapters with `npx @nextstage-brasil/harness sync` after editing canonical rules

See `skills/ns-harness/references/harness-discovery.md` and `rules-sync.md`.

## Canonical variables

| Variable | Default / resolution |
|----------|----------------------|
| `{product_root}` | Product folder (e.g. `apps/my-product/`) or repo root in standalone mode |
| `{harness_root}` | `{product_root}/.nextstage-harness/` (on-disk harness root — **not** the skill name) |
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
| `ns-harness` | — (base dependency) |
| SDD consumers (`ns-sdd-clarify-requirements`, `ns-sdd-requirements-generator`, `ns-sdd-analyze-consistency`, `ns-sdd-task-generator`, `ns-sdd-execution-handoff-generator`, `ns-sdd-version-partitioner`, `ns-harness-bootstrap-brownfield`, `ns-sdd-living-spec-consolidator`, `ns-code-coder`, `ns-code-investigator`) | `ns-harness` |
| `ns-harness-architecture-rules` | `ns-harness` |
| `ns-harness-agents-md` | `ns-harness` |
| `mcp-gitlab-usage` | `ns-harness` |
| `ns-code-reviewer` | `ns-harness`, `mcp-gitlab-usage` |
| `ns-execution-gitlab-issue` | `ns-harness`, `mcp-gitlab-usage`, `ns-code-reviewer`, `ns-code-autonomous` (calls it internally for Phase 2) |
| `ns-code-autonomous` | `ns-harness`, `ns-code-reviewer` |
| `ns-gitlab-board-sync` | `mcp-gitlab-usage` |

SDD workflow ordering (`ns-sdd-clarify-requirements` → `ns-sdd-requirements-generator` → …) and planning/execution pairs (`ns-pm-e2e-test-task-generator` ↔ `ns-code-e2e-tests`) stay as "Related skills" text only — separate install phases.

## Install

```bash
npx @nextstage-brasil/harness
```

Or manually:

```bash
npx skills add nextstage-brasil/skills@<skill-name> --full-depth -y
```

When CLI supports `depends`, transitive deps install automatically. Until then (`skills@1.5.14`), use `@nextstage-brasil/harness` or install peers explicitly — see `README.md`.

## Breaking change — `ns-` prefix + SDD workers (2026-07-25)

All catalog skills were renamed with a global `ns-` prefix. Six SDD planning workers dropped the `pm-` domain prefix in favor of `sdd-`. The human PM face skill was renamed to `ns-project-manager`.

| Change | Detail |
| ------ | ------ |
| Global prefix | Every skill directory/frontmatter `name` is now `ns-<…>` (34 skills) |
| Face / base short names | `nextstage-harness` → `ns-harness`; `nextstage-spec-driven` → `ns-spec-driven` |
| SDD workers | `pm-clarify-requirements` → `ns-sdd-clarify-requirements` (also: requirements-generator, analyze-consistency, version-partitioner, task-generator, living-spec-consolidator) |
| PM face | `pm-requirements-copilot` → `ns-project-manager` |
| Harness on-disk root | Unchanged: still `{product_root}/.nextstage-harness/` |
| `alwaysInstall` | Only `ns-harness` — Spec-Driven / prepare come from presets (`spec-driven`, `brownfield`, …) |
| `project-manager` preset | `ns-project-manager` + `ns-requirements-enricher` (no SDD/code workers) |
| `ns-skill-creator` | NextStage wrapper installs as `ns-skill-creator`; upstream anthropics bundle remains at `.agents/skills/skill-creator/` (not pruned) |

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@<new-name>`. After install, `harness init` / `harness update` removes retired directories when the replacement skill is present (`packages/harness/templates/retired-skills.json`). Preview: `npx @nextstage-brasil/harness prune-retired-skills --dry-run`.

New preset: `--preset project-manager` (`ns-project-manager`, `ns-requirements-enricher`).

## New skill — `ns-commercial-budget` (2026-08-03)

Client-facing commercial budget (Features + FP + COSMIC CFP + hours; macro-activity table; risk-based error + safety margin %). Same path `commercial-budget.md`; header **Sequência** + **Gerado em** (date/time) on each regenerate. Custo (R$) only with human rates. Loads reverse-spec/brownfield when present. Presets `project-manager` and `full`. Depends on `ns-harness`.

## Rename — `ns-mcp-gitlab-usage` → `mcp-gitlab-usage` (2026-07-27)

GitLab MCP usage skill drops the `ns-` prefix (exception to the global `ns-` catalog convention). Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-execution-handoff-generator` → `ns-sdd-execution-handoff-generator` (2026-07-25)

Aligned with other SDD planning workers (`ns-sdd-*`). Bridge planning → implementation unchanged; only the skill id moved. Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-pm-e2e-test-generator` → `ns-pm-e2e-test-task-generator` (2026-07-25)

Aligned with sibling `ns-pm-unit-test-task-generator`: the `-task-` segment clarifies the skill produces planning task markdown, not Cypress code (that's `ns-code-e2e-tests`). Retired in `packages/harness/templates/retired-skills.json`.

## Breaking change — preset consolidation (2026-07-25)

Presets that bundled `ns-spec-driven` for a single add-on (`gitlab`, `implementation`, `complements`) produced near-duplicate, confusing skill lists (21-23 overlapping skills each) because `--preset` only accepts one value. Renamed and merged for clarity:

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `delivery` | `spec-driven` | Same skills, clearer name |
| `recommended` | *(removed)* | Was a dead alias of `delivery` |
| `gitlab` | `spec-driven-gitlab` | Name now signals it's additive on top of `spec-driven` |
| `implementation`, `complements`, `spec-driven-quality` | *(removed)* | Near-duplicates of `spec-driven`; install quality skills via `--skill` or `--preset full` |
| `project-manager`, `brownfield`, `full`, `agents-api` | Unchanged | |

**Consumer action:** update any scripted `--preset delivery` / `--preset gitlab` / `--preset implementation` / `--preset complements` / `--preset recommended` / `--preset spec-driven-quality` calls. Use `spec-driven`, `spec-driven-gitlab`, `--skill …`, or `full`.

## Breaking change — domain prefix rename (2026-07)

Skills were renamed with domain prefixes (`pm-`, `code-`, `execution-`, `harness-`). Those mid-names are themselves retired in favor of the `ns-` names above; the table below is historical.

| Old name | Mid name (pre-`ns-`) |
| -------- | -------------------- |
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
| `frontend-design` | `code-frontend-design` |
| `docs-writer` | `code-docs-writer` |
| `best-practices` | `code-best-practices` |
