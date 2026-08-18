# NextStage Skills

Agent-agnostic skills for the [open skills ecosystem](https://skills.sh/), maintained by NextStage Brasil. These workflows guide coding agents through spec-driven development, GitLab integration, code quality, testing, and brownfield onboarding.

Skills are decoupled from any single harness: they use **session boot** (`AGENTS.md` at the project root, then `.nextstage-harness/rules/`). Install skills with the Skills CLI or `npx @nextstage-brasil/harness`.

## Structure

```
skills/
├── _meta/           # Migration notes
└── <skill-id>/      # Flat catalog — one directory per skill (SKILL.md + references/, evals/)
```

Examples: `ns-harness`, `ns-spec-driven`, `ns-coder`, `ns-reviewer`, `mcp-gitlab-usage`, `ns-project-manager`. Nested PM workers live under `ns-project-manager/references/ns-*/workflow.md` (not separate catalog skills).

Skills are invoked via the Skills menu / slash (e.g. `/ns-coder`, `/ns-reviewer`).

## Skill catalog

| Skill                                | Purpose                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ns-harness`                         | Session boot, artifact layout, AND brownfield prepare (architecture-rules, brownfield map, reverse spec, AGENTS.md) |
| `ns-spec-driven`                     | Delivery face — clarify → spec → tasks (incl. unit/e2e test tasks in `references/`) → implement → close |
| `ns-living-spec`    | Merge delivered versions into `docs/specs/` living docs                                                                                       |
| `mcp-gitlab-usage`                   | GitLab MCP tool contracts, gates, and flows                                                                                                   |
| `ns-gitlab-board-sync`               | Sync existing issues (labels, milestone, time)                                                                                                |
| `ns-gitlab-ci-generator`             | Bootstrap `.gitlab-ci.yml` for SaaS monorepos                                                                                                 |
| `ns-execution-gitlab-issue`          | End-to-end GitLab issue execution — GitLab state owner, delegates coding to `ns-autonomous`                                              |
| `ns-coder`                      | Ad-hoc implementation without full SDD cycle                                                                                                  |
| `ns-autonomous`                 | Harness-aware autonomous execution engine — planning-depth self-decision, doubt resolution, multi-agent dispatch (issue engine or standalone) |
| `ns-reviewer`                   | SOLID/security/maintainability review + issue gate                                                                                            |
| `ns-investigator`               | Root-cause analysis and minimal fixes                                                                                                         |
| `ns-e2e-tests`                  | Implement/refactor Cypress specs (execution phase)                                                                                            |
| `ns-backend-tests`              | Implement/refactor PHPUnit tests in Docker (execution phase)                                                                                  |
| `ns-frontend-design`            | Distinctive production UI; anti–generic AI aesthetics (code complement — installed with `spec-driven` via `ns-coder`)                         |
| `ns-docs-writer`                | README and `docs/` guides for humans (code complement)                                                                                          |
| `ns-best-practices`             | Security headers, compatibility, modernization, and Web Interface Guidelines UI pass (code complement)                                          |
| `ns-proto-creator`                   | Playwright reverse prototyping face — create/evolve single `prototype/` tree (optional; `--preset frontend-prototype`)                        |
| `ns-proto-visual-guide`              | Normative visual appearance guides (`*-visual.md`) for implementation handoff (optional)                                                      |
| `ns-project-manager`                 | PM face — gated pipeline; commercial budget, delivery schedule, enricher in `references/ns-*/workflow.md` |
| `ns-multi-agent-architect`           | Interview for LangGraph vs CrewAI and multi-agent architecture                                                                                |
| `ns-langgraph-agents`                | LangGraph.js runtime — MCP governance, context window, HITL, evals                                                                            |

Project-local skill authoring: install Anthropics `skill-creator` (`npx skills add https://github.com/anthropics/skills --skill skill-creator -y`) — see `ns-harness` → `references/project-skill-authoring.md`.

Migration notes: [`MIGRATION.md`](MIGRATION.md) (summary) and [`skills/_meta/MIGRATION.md`](skills/_meta/MIGRATION.md) (full history).

## Installation

### Quick start (recommended)

```bash
npx @nextstage-brasil/harness
```

Interactive wizard: picks a preset, resolves skill dependencies, runs `npx skills add`, and optionally scaffolds `AGENTS.md` plus `docs/` layout.

Non-interactive: `npx @nextstage-brasil/harness --preset spec-driven --yes`

See `packages/harness/README.md` for all flags. Install and migration details: `packages/harness/docs/README_INSTALLER.md`.

## Presets

`npx @nextstage-brasil/harness --preset <name> --yes`

| Preset | What it does |
| ------ | ------------ |
| `spec-driven` | SDD face + coder, reviewer, investigator, autonomous, living-spec — and code complements (frontend-design, docs-writer, best-practices, backend/e2e tests) via `ns-coder` `depends`. |
| `gitlab` | Extends `spec-driven`. Adds GitLab issue execution, board sync, CI generator, MCP usage. Alias: `spec-driven-gitlab`. |
| `project-manager` | PM face only (`ns-project-manager`). No SDD or code workers. |
| `frontend` | UI design, reverse prototyping, visual appearance guides. Alias: `frontend-prototype`. |
| `agents` | Extends `spec-driven`. Adds LangGraph labs (`ns-multi-agent-architect`, `ns-langgraph-agents`) plus LangChain/MCP/Vitest/eval externals. Aliases: `agent-creator`, `agents-api`. |
| `full` | Entire NS catalog: `gitlab` + `frontend` + `project-manager` + `agents` (+ any skills not already pulled by `extends`). |

Aliases: `frontend-prototype` → `frontend`, `spec-driven-gitlab` → `gitlab`, `agent-creator` / `agents-api` → `agents`.

There is **no** selective install of individual SDD phases — use `/ns-spec-driven` (internal phases live in `references/`).

List: `npx @nextstage-brasil/harness list --presets`

### Manual install

Install via the [Skills CLI](https://skills.sh/) (`npx skills`). Skills live under `skills/` — use `--full-depth`.

### Dependency resolution

Consumer skills declare `depends` in frontmatter. Once the CLI supports it ([vercel-labs/skills#861](https://github.com/vercel-labs/skills/pull/861)), installing one skill pulls its dependencies automatically:

```bash
npx skills add nextstage-brasil/skills@ns-execution-gitlab-issue --full-depth -y
# resolves: ns-harness → mcp-gitlab-usage → ns-reviewer → ns-execution-gitlab-issue
```

**Interim (until PR #861 merges):** `depends` is ignored by `skills@1.5.14`. Install peers manually:

```bash
npx skills add nextstage-brasil/skills --full-depth -y \
  --skill ns-harness --skill mcp-gitlab-usage --skill ns-reviewer --skill ns-execution-gitlab-issue
```

**Single skill (project):**

```bash
npx skills add nextstage-brasil/skills@ns-harness --full-depth -y
npx skills add nextstage-brasil/skills@mcp-gitlab-usage --full-depth -y
npx skills add nextstage-brasil/skills@ns-spec-driven --full-depth -y
```

**Global:**

```bash
npx skills add nextstage-brasil/skills@ns-coder --full-depth -g -y
```

**All skills:**

```bash
npx skills add nextstage-brasil/skills --full-depth --all -y
```

Browse: `npx skills add nextstage-brasil/skills --list --full-depth`

## Harness discovery

| Layer                  | Location                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| **Skills (this repo)** | Portable instructions — `npx @nextstage-brasil/harness` or `npx skills add` |
| **Project rules**      | `AGENTS.md` at repo root; canonical rules in `.nextstage-harness/rules/`    |
| **Generated adapters** | `.cursor/rules/*.mdc`, `.claude/rules/*.md` (via `harness sync`)            |
| **Installed skills**   | `.agents/skills/` (Cursor); `.claude/skills/` symlink for Claude Code       |
| **SDD artifacts**      | `docs/context/`, `docs/specs/`, `docs/versions/` (project root)             |

Install and migration guide: `packages/harness/docs/README_INSTALLER.md`.

Typical delivery: `/ns-spec-driven` (auto-sizes, internal phases in `references/`, resume from disk). Manual brownfield first: `/ns-harness prepare this repo`. Implementation: `ns-coder` / `ns-execution-gitlab-issue` / `ns-autonomous` → `ns-reviewer` → `ns-living-spec`. Code complements (`ns-frontend-design`, `ns-best-practices`, `ns-docs-writer`) install with `--preset spec-driven` and delegate from `ns-coder` / `ns-spec-driven` when relevant.

## Contributing

1. Obey `AGENTS.md` and follow `skill-creator` (`~/.agents/skills/skill-creator/SKILL.md`).
2. Create `skills/<skill-name>/SKILL.md` with pushy `description` frontmatter.
3. Add `references/`, `scripts/`, and `evals/evals.json` when they add value.
4. English only for all artifacts.

## License

[Apache License 2.0](LICENSE)
