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

agents/                 # Agent personas (thin wrappers over a backing skill)
└── <name>.md           # Harness-agnostic — no Claude/Cursor-specific syntax

packages/
└── harness/            # @nextstage-brasil/harness CLI (install wizard)
```

`agents/` holds personas for skills that benefit from an explicit agent entry
point — a blocking review gate, an isolated investigation, or a named
invocation such as `agent: code-coder` when the skill name differs. Each file
is plain prose with simple frontmatter (`name`, `description`) and points
back at its backing `skills/<skill>/SKILL.md` for the actual logic — it never
duplicates it. The harness copies matching personas to `.agents/agents/<name>.md`
in the target project (`code-coder` when `coder` is installed).
Same path, same content — no vendor-specific directories.

## Skill catalog

| Skill                      | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `nextstage-harness`        | Harness discovery, SDD gates, artifact layout (dependency — auto-installed) |
| `codebase-reverse-spec`    | Reverse-engineer legacy code into technology-agnostic business specs        |
| `architecture-rules-generator` | Scan codebase and generate lean `architecture-rules.mdc` for agents     |
| `bootstrap-brownfield`     | Map existing codebase stack/modules before first SDD version                |
| `clarify-requirements`     | Resolve scope ambiguities before requirements generation                    |
| `requirements-generator`   | Produce structured `requirements.md` for a version                          |
| `analyze-consistency`      | Validate requirements before task generation                                |
| `version-partitioner`      | Split large versions into subversions + roadmap                             |
| `task-generator`           | Backend/frontend/infra implementation task files                            |
| `execution-handoff-generator` | Generate and update `execution-handoff.md` (task order + time tracking) |
| `unit-test-task-generator` | Backend PHPUnit/integration test tasks                                      |
| `e2e-test-generator`       | Cypress E2E planning tasks                                                  |
| `living-spec-consolidator` | Merge delivered versions into `docs/specs/` living docs                     |
| `mcp-gitlab-usage`         | GitLab MCP tool contracts, gates, and flows                                 |
| `gitlab-board-sync`        | Sync existing issues (labels, milestone, time)                              |
| `gitlab-ci-generator`      | Bootstrap `.gitlab-ci.yml` for SaaS monorepos                               |
| `execute-gitlab-issue`     | End-to-end GitLab issue execution with review gate                          |
| `coder`                    | Ad-hoc implementation without full SDD cycle                                |
| `execution-orchestrator`   | Drive a partitioned version slice-by-slice (subagent + commit per slice)    |
| `code-reviewer`            | SOLID/security/maintainability review + issue gate                          |
| `code-investigator`        | Root-cause analysis and minimal fixes                                       |
| `create-e2e-tests`         | Implement/refactor Cypress specs (execution phase)                          |

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

See `packages/harness/README.md` for all flags.

### Manual install

Install via the [Skills CLI](https://skills.sh/) (`npx skills`). Skills live under `skills/` — use `--full-depth`.

### Dependency resolution

Consumer skills declare `depends` in frontmatter. Once the CLI supports it ([vercel-labs/skills#861](https://github.com/vercel-labs/skills/pull/861)), installing one skill pulls its dependencies automatically:

```bash
npx skills add nextstage-brasil/skills@execute-gitlab-issue --full-depth -y
# resolves: nextstage-harness → mcp-gitlab-usage → code-reviewer → execute-gitlab-issue
```

**Interim (until PR #861 merges):** `depends` is ignored by `skills@1.5.14`. Install peers manually:

```bash
npx skills add nextstage-brasil/skills --full-depth -y \
  --skill nextstage-harness --skill mcp-gitlab-usage --skill code-reviewer --skill execute-gitlab-issue
```

**Single skill (project):**

```bash
npx skills add nextstage-brasil/skills@codebase-reverse-spec --full-depth -y
npx skills add nextstage-brasil/skills@mcp-gitlab-usage --full-depth -y
npx skills add nextstage-brasil/skills@requirements-generator --full-depth -y
```

**Global:**

```bash
npx skills add nextstage-brasil/skills@coder --full-depth -g -y
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
| **Project rules**      | `AGENTS.md` at repo root                                                    |
| **Agent personas**     | `.agents/agents/<name>.md`                                                |
| **Agent rules / docs** | `.agents/rules/`, `.agents/docs/`                                           |
| **SDD artifacts**      | `docs/versions/{version}/`, living specs in `docs/specs/`                   |

Typical SDD chain: `clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → implementation (`coder` / `execute-gitlab-issue`) → `code-reviewer` → `living-spec-consolidator`.

## Contributing

1. Read `AGENTS.md` and follow `skill-creator` (`~/.agents/skills/skill-creator/SKILL.md`).
2. Create `skills/<skill-name>/SKILL.md` with pushy `description` frontmatter.
3. Add `references/`, `scripts/`, and `evals/evals.json` when they add value.
4. English only for all artifacts.

## License

[Apache License 2.0](LICENSE)
