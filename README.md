# NextStage Skills

Agent-agnostic skills for the [open skills ecosystem](https://skills.sh/), maintained by NextStage Brasil. These workflows guide coding agents through spec-driven development, GitLab integration, code quality, testing, and brownfield onboarding.

Skills are decoupled from any single harness: they use **harness discovery** to find project rules via `AGENTS.md` at the repo root. Install skills with the Skills CLI or `npx @nextstage-brasil/harness`.

## Structure

```
skills/
├── _meta/              # Migration notes
├── nextstage-harness/  # Harness discovery, gates, artifact layout (auto-installed dep)
└── <skill-name>/
    ├── SKILL.md        # Entry point (required)
    ├── references/     # Templates, checklists, stack profiles
    ├── scripts/        # Optional utilities
    └── evals/          # Minimum viable eval prompts

packages/
└── harness/            # @nextstage-brasil/harness CLI (install wizard)
```

Skills are invoked via the Skills menu / slash (e.g. `/code-coder`, `/code-reviewer`).

## Skill catalog

| Skill                      | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `nextstage-harness`        | Harness discovery, SDD gates, artifact layout (dependency — auto-installed) |
| `harness-agents-md`      | Generate project-specific `AGENTS.md` + minimal `CLAUDE.md` pointer           |
| `harness-codebase-reverse-spec`    | Reverse-engineer legacy code into technology-agnostic business specs        |
| `harness-architecture-rules` | Scan codebase and generate lean `architecture-rules.md` for agents      |
| `harness-bootstrap-brownfield`     | Map existing codebase stack/modules before first SDD version                |
| `pm-clarify-requirements`     | Resolve scope ambiguities before requirements generation                    |
| `pm-requirements-generator`   | Produce structured `requirements.md` for a version                          |
| `pm-analyze-consistency`      | Validate requirements before task generation                                |
| `pm-version-partitioner`      | Split large versions into subversions + roadmap                             |
| `pm-task-generator`           | Backend/frontend/infra implementation task files                            |
| `execution-handoff-generator` | Generate and update `execution-handoff.md` (task order + time tracking) |
| `pm-unit-test-task-generator` | Backend PHPUnit/integration test tasks                                      |
| `pm-e2e-test-generator`       | Cypress E2E planning tasks                                                  |
| `pm-living-spec-consolidator` | Merge delivered versions into `docs/specs/` living docs                     |
| `mcp-gitlab-usage`         | GitLab MCP tool contracts, gates, and flows                                 |
| `gitlab-board-sync`        | Sync existing issues (labels, milestone, time)                              |
| `gitlab-ci-generator`      | Bootstrap `.gitlab-ci.yml` for SaaS monorepos                               |
| `execution-gitlab-issue`     | End-to-end GitLab issue execution — GitLab state owner, delegates coding to `code-autonomous` |
| `code-coder`               | Ad-hoc implementation without full SDD cycle                                |
| `code-autonomous`          | Harness-aware autonomous execution engine — planning-depth self-decision, doubt resolution, multi-agent dispatch (issue engine or standalone) |
| `execution-orchestrator`   | Drive a partitioned version slice-by-slice (subagent + commit per slice)    |
| `code-reviewer`            | SOLID/security/maintainability review + issue gate                          |
| `code-investigator`        | Root-cause analysis and minimal fixes                                       |
| `code-e2e-tests`         | Implement/refactor Cypress specs (execution phase)                          |
| `code-backend-tests`     | Implement/refactor PHPUnit tests in Docker (execution phase)                |
| `harness-prepare`          | Orchestrate full brownfield onboarding chain after harness init             |
| `requirements-enricher`    | Grill-me gap analysis for GitLab issues or chat context                     |
| `pm-requirements-copilot`  | End-to-end PM workflow — clarification through delivery forecast            |
| `skill-creator`            | Create project-local skills in `.agents/skills/` + `harness sync`           |

Migration notes: `skills/_meta/MIGRATION.md`.

## Installation

### Quick start (recommended)

```bash
npx @nextstage-brasil/harness
```

> **Not published yet?** Until `@nextstage-brasil/harness` is on npm, run from a local clone:
>
> ```bash
> npx file:~/apps/nextstage/skills/packages/harness
> ```
>
> Or link once, then use `harness` anywhere:
>
> ```bash
> cd ~/apps/nextstage/skills/packages/harness && npm link
> harness --preset recommended --yes
> ```

Interactive wizard: picks a preset, resolves skill dependencies, runs `npx skills add`, and optionally scaffolds `AGENTS.md` plus `docs/` layout.

Non-interactive:

```bash
npx @nextstage-brasil/harness --preset gitlab --yes
npx @nextstage-brasil/harness list
```

See `packages/harness/README.md` for all flags. Install and migration details: `packages/harness/docs/README_INSTALLER.md`.

### Manual install

Install via the [Skills CLI](https://skills.sh/) (`npx skills`). Skills live under `skills/` — use `--full-depth`.

### Dependency resolution

Consumer skills declare `depends` in frontmatter. Once the CLI supports it ([vercel-labs/skills#861](https://github.com/vercel-labs/skills/pull/861)), installing one skill pulls its dependencies automatically:

```bash
npx skills add nextstage-brasil/skills@execution-gitlab-issue --full-depth -y
# resolves: nextstage-harness → mcp-gitlab-usage → code-reviewer → execution-gitlab-issue
```

**Interim (until PR #861 merges):** `depends` is ignored by `skills@1.5.14`. Install peers manually:

```bash
npx skills add nextstage-brasil/skills --full-depth -y \
  --skill nextstage-harness --skill mcp-gitlab-usage --skill code-reviewer --skill execution-gitlab-issue
```

**Single skill (project):**

```bash
npx skills add nextstage-brasil/skills@harness-codebase-reverse-spec --full-depth -y
npx skills add nextstage-brasil/skills@mcp-gitlab-usage --full-depth -y
npx skills add nextstage-brasil/skills@pm-requirements-generator --full-depth -y
```

**Global:**

```bash
npx skills add nextstage-brasil/skills@code-coder --full-depth -g -y
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
| **Project rules**      | `AGENTS.md` at repo root; canonical rules in `.nextstage-harness/rules/`  |
| **Generated adapters** | `.cursor/rules/*.mdc`, `.claude/rules/*.md` (via `harness sync`)            |
| **Installed skills**   | `.agents/skills/` (Cursor); `.claude/skills/` symlink for Claude Code |
| **Agent docs**         | `.agents/docs/`                                                             |
| **SDD artifacts**      | `docs/versions/{version}/`, living specs in `docs/specs/`                    |

Install and migration guide: `packages/harness/docs/README_INSTALLER.md`.

Typical SDD chain: `pm-clarify-requirements` → `pm-requirements-generator` → `pm-analyze-consistency` → `pm-task-generator` → implementation (`code-coder` / `execution-gitlab-issue` / `code-autonomous`) → `code-reviewer` → `pm-living-spec-consolidator`.

## Contributing

1. Read `AGENTS.md` and follow `skill-creator` (`~/.agents/skills/skill-creator/SKILL.md`).
2. Create `skills/<skill-name>/SKILL.md` with pushy `description` frontmatter.
3. Add `references/`, `scripts/`, and `evals/evals.json` when they add value.
4. English only for all artifacts.

## License

[Apache License 2.0](LICENSE)
