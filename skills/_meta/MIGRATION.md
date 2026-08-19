# NextStage Skills Migration

Migration notes for skills promoted into this repository as the canonical home for agent-agnostic workflows.

## Add catalog skill — `ns-postgres-rag` (2026-08-18)

PostgreSQL retrieval doctrine (`pgvector`, hybrid FTS, relational GraphRAG). Frontmatter and catalog `depends`: `ns-harness` (session-boot). **Not** in `alwaysInstall`, **not** in any harness preset (`full` included). Opt-in:

```bash
npx skills add nextstage-brasil/skills@ns-postgres-rag --full-depth -y
```

## Fold business skills into `ns-project-manager` (2026-08-14)

`ns-commercial-budget`, `ns-delivery-schedule`, and `ns-requirements-enricher` are no longer catalog skills. They live under `skills/ns-project-manager/references/<id>/` (own `workflow.md` + `references/` / `assets/`; no evals). Invoke `/ns-project-manager`. Retired aliases in `packages/harness/templates/retired-skills.json` redirect installs to `ns-project-manager`.

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
| Path coupling | Use `ns-harness` (`depends` + `../../ns-harness/references/session-boot.md` from domain skills); never hardcode legacy factory skill paths |
| Skill dependencies | Declare `depends:` in frontmatter — resolved by `@nextstage-brasil/harness` and Skills CLI ([skills#861](https://github.com/vercel-labs/skills/pull/861)) |

## Session boot (summary)

1. Obey `AGENTS.md` already in host context — **never** tool-Read it
2. Read `agents.local.md` when present; load `.nextstage-harness/rules/`
3. Read `architecture-rules.md` first; layer rules by changed files
4. **Legacy:** `.cursor/rules/*.mdc` only when `.nextstage-harness/` is absent — `harness init` then `npx @nextstage-brasil/harness sync` (absorbs orphans)
5. Regenerate adapters with `npx @nextstage-brasil/harness sync` after editing canonical rules (also absorbs orphan `.cursor/rules/*.mdc`)

See `skills/ns-harness/references/session-boot.md` and `rules-sync.md`.

## Canonical paths

| Path | Meaning |
|------|---------|
| `.nextstage-harness/` | On-disk harness root (rules, agents, manifest) — **not** the skill name |
| `.nextstage-harness/rules/*.md` | Canonical rules |
| `.agents/skills/` | Installed skills (Skills CLI) |
| `docs/specs/` | Living domain specs |
| `docs/context/` | Product-wide context |
| `{version_san}` | Sanitized version id (e.g. `1.0.0`) |
| `docs/versions/{version_san}/` | Version planning artifacts |

## Skill catalog

See root `README.md` for the full catalog and `packages/harness/templates/catalog.json` for install presets and `depends`.

## Cross-skill dependencies

Declared in frontmatter `depends` (install-time) and referenced in skill bodies (runtime):

| Skill | `depends` |
|-------|-----------|
| `ns-harness` | — (base dependency) |
| SDD consumers (`ns-living-spec`, `ns-coder`, `ns-investigator`, `ns-spec-driven`) | `ns-harness` |
| `mcp-gitlab-usage` | `ns-harness` |
| `ns-reviewer` | `ns-harness`, `mcp-gitlab-usage` |
| `ns-execution-gitlab-issue` | `ns-harness`, `mcp-gitlab-usage`, `ns-reviewer`, `ns-autonomous` (calls it internally for Phase 2) |
| `ns-autonomous` | `ns-harness`, `ns-reviewer` |
| `ns-gitlab-board-sync` | `mcp-gitlab-usage` |
| `ns-postgres-rag` | `ns-harness` (not in any preset) |

SDD workflow ordering (internal `ns-spec-driven` phases including unit/e2e test-task references) and execution pairs (`ns-e2e-tests`, `ns-backend-tests`) stay as separate install phases.

## Install

```bash
npx @nextstage-brasil/harness
```

Or manually:

```bash
npx skills add nextstage-brasil/skills@<skill-name> --full-depth -y
```

When CLI supports `depends`, transitive deps install automatically. Until then (`skills@1.5.14`), use `@nextstage-brasil/harness` or install peers explicitly — see `README.md`.

## Flatten domain folders (2026-08-14)

Domain folders (`sdd/`, `code/`, `gitlab/`, …) were removed. All catalog skills live at `skills/<name>/` again so cross-skill relative paths resolve correctly after install. Skill IDs unchanged.

**Consumer action:** reinstall skills; run `harness update` if lock files still reference old `skills/<domain>/<name>` paths.

## Domain folders + skill renames (2026-08-14, harness 1.x) — superseded

Catalog skills (except `ns-harness`) moved under domain folders. Several skills dropped redundant category prefixes from their IDs. Skill ID = **leaf directory name** (install path includes domain).

| Old path | New path |
| -------- | -------- |
| `skills/ns-spec-driven` | `skills/sdd/ns-spec-driven` |
| `skills/ns-sdd-living-spec-consolidator` | `skills/sdd/ns-living-spec` |
| `skills/ns-code-coder` | `skills/code/ns-coder` |
| `skills/ns-code-reviewer` | `skills/code/ns-reviewer` |
| `skills/ns-code-investigator` | `skills/code/ns-investigator` |
| `skills/ns-code-autonomous` | `skills/code/ns-autonomous` |
| `skills/ns-gitlab-board-sync` | `skills/gitlab/ns-gitlab-board-sync` |
| `skills/ns-gitlab-ci-generator` | `skills/gitlab/ns-gitlab-ci-generator` |
| `skills/ns-execution-gitlab-issue` | `skills/gitlab/ns-execution-gitlab-issue` |
| `skills/mcp-gitlab-usage` | `skills/gitlab/mcp-gitlab-usage` |
| `skills/ns-pm-unit-test-task-generator` | `skills/testing/ns-pm-unit-test-task-generator` |
| `skills/ns-pm-e2e-test-task-generator` | `skills/testing/ns-pm-e2e-test-task-generator` |
| `skills/ns-code-e2e-tests` | `skills/testing/ns-e2e-tests` |
| `skills/ns-code-backend-tests` | `skills/testing/ns-backend-tests` |
| `skills/ns-code-frontend-design` | `skills/frontend/ns-frontend-design` |
| `skills/ns-proto-creator` | `skills/frontend/ns-proto-creator` |
| `skills/ns-proto-visual-guide` | `skills/frontend/ns-proto-visual-guide` |
| `skills/ns-harness-agents-md` | `skills/docs/ns-agent-generator` |
| `skills/ns-harness-codebase-reverse-spec` | `skills/docs/ns-codebase-reverse-spec` |
| `skills/ns-harness-architecture-rules` | `skills/docs/ns-architecture-rules` |
| `skills/ns-harness-bootstrap-brownfield` | `skills/docs/ns-bootstrap-brownfield` |
| `skills/ns-harness-prepare` | `skills/docs/ns-harness-prepare` |
| `skills/ns-code-docs-writer` | `skills/docs/ns-docs-writer` |
| `skills/ns-code-best-practices` | `skills/docs/ns-best-practices` |
| `skills/ns-project-manager` | `skills/business/ns-project-manager` |
| `skills/ns-pm-delivery-schedule` | `skills/business/ns-delivery-schedule` |
| `skills/ns-commercial-budget` | `skills/business/ns-commercial-budget` |
| `skills/ns-requirements-enricher` | `skills/business/ns-requirements-enricher` |
| `skills/ns-multi-agent-architect` | `skills/labs/ns-multi-agent-architect` |
| `skills/ns-langgraph-agents` | `skills/labs/ns-langgraph-agents` |

**Root (unchanged):** `skills/ns-harness`.

Retired aliases for renamed IDs: `packages/harness/templates/retired-skills.json`. Dependency graph: `docs/dependency-graph.md`.

**Consumer action:** reinstall skills; run `harness update` + `prune-retired-skills`. Until Skills CLI resolves `depends` ([skills#861](https://github.com/vercel-labs/skills/pull/861)), install peers manually — see `docs/dependency-graph.md`.

## Removed `{product_root}` resolution (2026-08)

Harness install dir (`--dir`) **is** the project root. Retired path tokens:

| Old token | Replacement |
| --------- | ----------- |
| `{product_root}/…` | repo-relative `…` |
| `{harness_root}` | `.nextstage-harness/` |
| `{context_root}` | `docs/context/` |
| `{specs_root}` | `docs/specs/` |
| `{product_slug}` | dropped |
| `harness-discovery.md` | collapsed into `session-boot.md` |

Session boot: `skills/ns-harness/references/session-boot.md` (literal paths only). Keep `{version_san}` / `{subversion_san}`.

## Folded prepare workers into `ns-harness` (2026-08)

`ns-harness-prepare`, `ns-architecture-rules`, `ns-agent-generator`, `ns-codebase-reverse-spec`, and `ns-bootstrap-brownfield` are **retired** — workflows live under `skills/ns-harness/references/`. Face: `/ns-harness prepare this repo` or a single-worker prompt (architecture rules, AGENTS.md, reverse-spec, brownfield map). Retired aliases point at `ns-harness`.

## No tool-Read of `AGENTS.md` (2026-08)

Hosts already inject `AGENTS.md` (Cursor) or point at it (`CLAUDE.md`). Session boot, generated First action, and subagent bridges must **obey** it and **never** tool-Read it. Boot loads only `agents.local.md` + `.nextstage-harness/rules/` + `docs/context/` when needed.

## Breaking change — `ns-` prefix + SDD workers (2026-07-25)

All catalog skills were renamed with a global `ns-` prefix. Six SDD planning workers dropped the `pm-` domain prefix in favor of `sdd-`. The human PM face skill was renamed to `ns-project-manager`.

| Change | Detail |
| ------ | ------ |
| Global prefix | Every skill directory/frontmatter `name` is now `ns-<…>` (34 skills) |
| Face / base short names | `nextstage-harness` → `ns-harness`; `nextstage-spec-driven` → `ns-spec-driven` |
| SDD workers | `pm-clarify-requirements` → `ns-sdd-clarify-requirements` (also: requirements-generator, analyze-consistency, version-partitioner, task-generator, living-spec-consolidator) |
| PM face | `pm-requirements-copilot` → `ns-project-manager` |
| Harness on-disk root | Unchanged: still `.nextstage-harness/` at the install / project root |
| `alwaysInstall` | Only `ns-harness` — Spec-Driven / prepare come from presets (`spec-driven`, …) |
| `project-manager` preset | `ns-project-manager` + `ns-delivery-schedule` + `ns-requirements-enricher` + `ns-commercial-budget` (no SDD/code workers) |
| `ns-skill-creator` | **Retired** — use Anthropics `skill-creator`; see `ns-harness` → `references/project-skill-authoring.md` |

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@<new-name>`. After install, `harness init` / `harness update` removes retired directories when the replacement skill is present (`packages/harness/templates/retired-skills.json`). Preview: `npx @nextstage-brasil/harness prune-retired-skills --dry-run`.

New preset: `--preset project-manager` (`ns-project-manager`, `ns-delivery-schedule`, `ns-requirements-enricher`, `ns-commercial-budget`).

## Consolidate SDD workers into `ns-spec-driven` (2026-08-14)

Seven catalog skills merged into `ns-spec-driven/references/` as internal phases. Invoke only `/ns-spec-driven` (including resume / continue / partitioned slices). Retired aliases in `packages/harness/templates/retired-skills.json` redirect installs to `ns-spec-driven`.

| Retired skill | Replacement |
| ------------- | ----------- |
| `ns-sdd-clarify-requirements` | `ns-spec-driven` → `references/clarify-requirements.md` |
| `ns-sdd-requirements-generator` | `ns-spec-driven` → `references/requirements-generator.md` |
| `ns-sdd-analyze-consistency` | `ns-spec-driven` → `references/analyze-consistency.md` |
| `ns-sdd-version-partitioner` | `ns-spec-driven` → `references/version-partitioner.md` |
| `ns-sdd-task-generator` | `ns-spec-driven` → `references/task-generator.md` (`task-writer-agent` bridge) |
| `ns-sdd-execution-handoff-generator` | `ns-spec-driven` → `references/execution-handoff.md` |
| `ns-execution-orchestrator` | `ns-spec-driven` → `references/orchestrator.md` |
| `ns-pm-unit-test-task-generator` | `ns-spec-driven` → `references/unit-test-task-generator.md` |
| `ns-pm-e2e-test-task-generator` | `ns-spec-driven` → `references/e2e-test-task-generator.md` |

Classic version execution loop moved to `ns-coder/references/run-implementation.md`.

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@ns-spec-driven`. Run `harness update` / `prune-retired-skills` to remove old directories.

## Remove `nsutil-mcp` from catalog (2026-08-14)

`nsutil-mcp` was not a skills-repo deliverable — NsUtil MCP is created in the application at use time. **No retired alias.** Remove any local `skills/nsutil-mcp/` install manually; reinstall without `--preset full` if it was the only reason that skill was present.

## New preset — `frontend-prototype` (2026-08-11)

Playwright-driven reverse prototyping without full SDD:

| Skill | Role |
| ----- | ---- |
| `ns-proto-creator` | Face — capture live UI, create or evolve one `prototype/` tree (git history, not `vN/` folders) |
| `ns-proto-visual-guide` | Normative appearance MDs (rename of `descricao-normativa-visual`) |
| `/ns-harness` reverse-spec | Business reverse from code (complementary) |
| `ns-living-spec` | **Appearance** mode (no Code Review gate) |
| `ns-frontend-design` / `ns-best-practices` | Design + quality (guidelines fetch fused into best-practices) |

Install: `npx @nextstage-brasil/harness --preset frontend-prototype --yes`.

## Rename — `descricao-normativa-visual` → `ns-proto-visual-guide` (2026-08-11)

Normative visual appearance skill joins the `ns-proto-*` family. Retired in `packages/harness/templates/retired-skills.json`. Source-of-truth paths cite `prototype/` (single tree).

## New skill — `ns-delivery-schedule` (2026-08-07)

Triple productivity delivery schedule: one markdown with PERT + Monte Carlo for productivity scenarios P100 (current h/FP), P85 (50% faster), P50 (85% faster). Section 0 commercial summary + calendar delivery dates. Persists under `docs/versions/{version_san}/pm/`. Reuses `ns-project-manager` `pert_montecarlo.py`. Presets `project-manager` and `full`. Depends on `ns-harness` + `ns-project-manager`.

## New skill — `ns-commercial-budget` (2026-08-03)

Client-facing commercial budget in **product voice** (PM/client — no fields/classes). Features + Function Points + hours (COSMIC CFP only when asked); macro-activity table; risk margins. Paths `commercial-budget-internal.md` (delivery) and optional `commercial-budget-costumer.md` (client export); header Sequência + Gerado em. Custo (R$) only with rates. Loads reverse-spec/brownfield when present. Presets `project-manager` and `full`. Depends on `ns-harness`.

## Commercial budget artifact rename (2026-08-05)

| Old path | New path |
| -------- | -------- |
| `commercial-budget.md` | `commercial-budget-internal.md` |
| `commercial-budget-cliente.md` | `commercial-budget-costumer.md` |

Client header reference: `{version_san}-costumer`. Regenerate or rename existing version folders; do not use `commercial-budget-full-*` variants.

## Rename — `ns-mcp-gitlab-usage` → `mcp-gitlab-usage` (2026-07-27)

GitLab MCP usage skill drops the `ns-` prefix (exception to the global `ns-` catalog convention). Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-execution-handoff-generator` → `ns-sdd-execution-handoff-generator` (2026-07-25)

Aligned with other SDD planning workers (`ns-sdd-*`). Bridge planning → implementation unchanged; only the skill id moved. Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-pm-e2e-test-generator` → `ns-pm-e2e-test-task-generator` (2026-07-25)

Aligned with sibling `ns-pm-unit-test-task-generator`: the `-task-` segment clarifies the skill produces planning task markdown, not Cypress code (that's `ns-e2e-tests`). Retired in `packages/harness/templates/retired-skills.json`.

## Breaking change — preset consolidation (2026-07-25)

Presets that bundled `ns-spec-driven` for a single add-on (`gitlab`, `implementation`, `complements`) produced near-duplicate, confusing skill lists (21-23 overlapping skills each) because `--preset` only accepts one value. Renamed and merged for clarity:

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `delivery` | `spec-driven` | Same skills, clearer name |
| `recommended` | *(removed)* | Was a dead alias of `delivery` |
| `gitlab` | `spec-driven-gitlab` | Name now signals it's additive on top of `spec-driven` |
| `implementation`, `complements`, `spec-driven-quality` | *(removed)* | Near-duplicates of `spec-driven`; install quality skills via `--skill` or `--preset full` |
| `project-manager`, `full`, `agents-api` | Unchanged | |
| `brownfield` | *(removed 2026-08-14)* | Use any delivery preset, then `/ns-harness prepare this repo` |

**Consumer action:** update any scripted `--preset delivery` / `--preset gitlab` / `--preset implementation` / `--preset complements` / `--preset recommended` / `--preset spec-driven-quality` calls. Use `spec-driven`, `spec-driven-gitlab`, `--skill …`, or `full`.

## Breaking change — preset flattening (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `implementation` | *(removed)* | Skills merged into `spec-driven` |
| `spec-driven-gitlab` | `gitlab` | Canonical name; `spec-driven-gitlab` kept as alias |
| `spec-driven` | `spec-driven` | Now includes `code/*`, `ns-living-spec`, and `ns-spec-driven` directly (no `extends`) |
| `frontend` | `frontend` | `ns-living-spec` moved to `spec-driven` only |

**Consumer action:** replace `--preset implementation` with `--preset spec-driven`. Prefer `--preset gitlab` over `--preset spec-driven-gitlab` (alias still works).

## Breaking change — remove full-experimental preset (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `full-experimental` | *(removed)* | Use `--preset agent-creator` (labs only) or `--preset full` |

**Consumer action:** replace `--preset full-experimental` with `--preset full` plus explicit `--skill` for labs if needed.

## Breaking change — merge `coder-langgraph` into `agents-api` (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `coder-langgraph` | `agents-api` | Same NS coder/investigator/review/langgraph stack; `agents-api` also installs the full external set |

**Consumer action:** replace `--preset coder-langgraph` with `--preset agents-api`.

## Retired catalog skill — `ns-skill-creator` (2026-08-14)

| Old | Replacement |
| --- | ----------- |
| `ns-skill-creator` | Anthropics `skill-creator` ([anthropics/skills](https://github.com/anthropics/skills)) |

Path overrides and `harness sync` after authoring: `ns-harness` → `references/project-skill-authoring.md`.

**Consumer action:** install `skill-creator` (`npx skills add https://github.com/anthropics/skills --skill skill-creator -y`) or `npx @nextstage-brasil/harness --preset full --yes`. Run `harness update` to prune retired `ns-skill-creator` when `skill-creator` is present.

## Breaking change — merge `agent-creator` and `agents-api` into `agents` (2026-08-18)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `agent-creator` | `agents` | Same spec-driven + LangGraph labs; also installs LangChain/MCP/eval externals |
| `agents-api` | `agents` | Same externals + NS agent stack; also includes the full spec-driven set |

Aliases `agent-creator` and `agents-api` still resolve to `presets/agents.json`.

**Consumer action:** replace `--preset agent-creator` / `--preset agents-api` with `--preset agents`.

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
