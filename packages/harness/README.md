# @nextstage-brasil/harness

**One CLI to install NextStage agent skills, scaffold Spec-Driven Development (SDD) layout, and keep Cursor / Claude Code rules in sync.**

Stop wiring skills by hand. Point harness at your project, pick a preset (or a single skill), and get a ready workspace: skills under `.agents/skills/`, canonical rules under `.nextstage-harness/`, generated adapters for your agents, plus a baseline `AGENTS.md`.

```bash
npx @nextstage-brasil/harness
```

Interactive wizard. Prefer CI / scripts? Use flags below — every common path is copy-paste ready.

**Requires:** Node.js 18+ · works with [Cursor](https://cursor.com/) and [Claude Code](https://claude.ai/code) · skills from [nextstage-brasil/skills](https://github.com/nextstage-brasil/skills)

---

## What you get

| After `init` | Why it matters |
|--------------|----------------|
| `.agents/skills/` | Installed skills (Skills CLI). Cursor reads them here. |
| `.nextstage-harness/rules/` | **Edit rules here** — single source of truth |
| `.cursor/rules/`, `.claude/rules/` | Generated adapters — do not edit by hand |
| `AGENTS.md` + `CLAUDE.md` | Project entry for agents |
| `docs/context`, `docs/specs`, `docs/versions` | SDD artifact folders (unless `--no-scaffold`) |

Every install also pulls **alwaysInstall** skills: `ns-harness` (plus its dependencies). Presets add Spec-Driven, PM, GitLab, and other packs on top.

---

## Quick start

```bash
# 1. From your project root
cd your-project

# 2. Interactive (recommended first time)
npx @nextstage-brasil/harness

# 3. Or skip prompts — Spec-Driven default pack
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Then open the project in your agent and:

1. Read `AGENTS.md`
2. **Brownfield:** run `/ns-harness-prepare` once
3. **Delivery:** run `/ns-spec-driven`

See installed presets/skills anytime:

```bash
npx @nextstage-brasil/harness list
```

---

## Pick your scenario

### New project (greenfield)

Scaffold + Spec-Driven skills. Start delivering with `/ns-spec-driven`.

```bash
npx @nextstage-brasil/harness --preset spec-driven --yes
```

### Existing codebase (brownfield)

Same install — then onboard the repo so agents understand architecture and living specs.

```bash
npx @nextstage-brasil/harness --preset brownfield --yes
# In your agent:
#   /ns-harness-prepare
```

Need the full prepare prompt in the terminal?

```bash
npx @nextstage-brasil/harness prepare
```

### GitLab-heavy team

Issue execution, board sync, requirements enricher, CI generator — on top of Spec-Driven.

```bash
npx @nextstage-brasil/harness --preset spec-driven-gitlab --yes
```

### Project Manager (no code execution)

Human PM workflow only — `ns-project-manager` + requirements enricher. Does **not** install SDD workers or coding skills.

```bash
npx @nextstage-brasil/harness --preset project-manager --yes
```

### Only one skill (no scaffold)

Install a skill + its catalog `depends`. Skips `.nextstage-harness/`, `AGENTS.md`, and `docs/`.

```bash
npx @nextstage-brasil/harness --skill ns-multi-agent-architect --no-scaffold -y
npx @nextstage-brasil/harness --skill ns-code-coder --skill ns-code-reviewer --no-scaffold -y
```

Already have harness? Add a skill and refresh adapters:

```bash
npx @nextstage-brasil/harness --skill ns-gitlab-board-sync --no-scaffold -y
npx @nextstage-brasil/harness sync
```

### Preview before writing files

```bash
npx @nextstage-brasil/harness --preset spec-driven-gitlab --dry-run
npx @nextstage-brasil/harness --skill ns-code-frontend-design --dry-run
```

### Cursor only (or Cursor + Claude)

Default agents: `cursor` + `claude-code`. Persist Cursor-only and prune Claude adapters:

```bash
npx @nextstage-brasil/harness agents set --agent cursor
npx @nextstage-brasil/harness agents          # show current
```

### Refresh skills after a catalog release

Updates skills already in `.agents/skills/` — does **not** install new catalog entries.

```bash
npx @nextstage-brasil/harness update
npx @nextstage-brasil/harness update --dry-run
```

### Optional complements (UI, docs, security)

Install individually (or use `--preset full`):

```bash
npx @nextstage-brasil/harness --skill ns-code-frontend-design --skill ns-code-docs-writer --skill ns-code-best-practices --no-scaffold -y
```

Investigator / test execution skills (`ns-code-investigator`, `ns-code-e2e-tests`, `ns-code-backend-tests`) likewise via `--skill` or `--preset full`.

### Agents API / LangChain stack

External + NextStage skills for agent-service work:

```bash
npx @nextstage-brasil/harness --preset agents-api --yes
```

Focused LangGraph implementation (coder + runtime doctrine, fewer externals):

```bash
npx @nextstage-brasil/harness --preset coder-langgraph --yes
```

### Init into another directory

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --preset spec-driven \
  --agent cursor \
  --yes
```

---

## Day-to-day cheat sheet

| Goal | Command |
|------|---------|
| Install / re-run wizard | `npx @nextstage-brasil/harness` |
| See catalog & presets | `npx @nextstage-brasil/harness list` |
| After editing rules in `.nextstage-harness/` | `npx @nextstage-brasil/harness sync` |
| CI: fail if adapters drifted | `npx @nextstage-brasil/harness sync --check` |
| Update installed skills | `npx @nextstage-brasil/harness update` |
| Regenerate `AGENTS.md` | `npx @nextstage-brasil/harness agents-md --force` |
| Add a project rule | `npx @nextstage-brasil/harness add-rule api-conventions --description "REST conventions"` |
| Import legacy `.cursor/rules/*.mdc` | `npx @nextstage-brasil/harness migrate-rules --force` |
| Brownfield instructions | `npx @nextstage-brasil/harness prepare` |
| Show / set agents | `npx @nextstage-brasil/harness agents` · `agents set --agent cursor` |
| Uninstall harness | `npx @nextstage-brasil/harness uninstall --dry-run` then `--yes` |

In the agent, invoke skills via menu or slash: `/ns-spec-driven`, `/ns-code-coder`, `/ns-code-reviewer`, …

Consumer guide (scaffolded into projects): `.nextstage-harness/README.md`  
Deep installer reference: [docs/README_INSTALLER.md](docs/README_INSTALLER.md)

---

## Presets

**Base (always):** `ns-harness` (+ transitive deps).

| Preset | Use when you want… |
|--------|-------------------|
| `spec-driven` | Complete SDD stack (clarify → spec → tasks → implement) + test task generators |
| `spec-driven-gitlab` | Everything in `spec-driven`, plus GitLab issues, board sync, enricher, CI generator |
| `project-manager` | Human PM toolkit — `ns-project-manager` + requirements enricher (**no** SDD/code workers) |
| `brownfield` | Harness + `/ns-harness-prepare` chain on existing code |
| `full` | Every skill in the catalog |
| `agents-api` | LangChain / LangGraph / MCP external skills + NS base |
| `coder-langgraph` | `ns-langgraph-agents` + coder/reviewer + core LangChain/MCP/Vitest externals |

```bash
npx @nextstage-brasil/harness --preset <name> --yes
```

Exact skill lists: `npx @nextstage-brasil/harness list`.

---

## How selection works

Choose **one** of:

| Mode | Flag | Behavior |
|------|------|----------|
| Preset | `--preset <name>` | Bundled add-ons + alwaysInstall + `depends` |
| Skills | `--skill <id>` (repeatable) | Only those skills + catalog `depends` + alwaysInstall |
| Everything | `--all` | Full NextStage catalog |

Skill ids match directory names under `skills/<name>/` in the [skills repo](https://github.com/nextstage-brasil/skills). External ids come from `external-skills.json` (see `harness list`).

---

## Commands & flags (reference)

### Commands

| Command | Description |
|---------|-------------|
| `harness` / `harness init` | Install skills, scaffold, sync adapters, generate `AGENTS.md` |
| `harness list` | Presets and skill catalog |
| `harness prepare` | Print brownfield prepare instructions (`/ns-harness-prepare`) |
| `harness sync` | Regenerate rule + skill adapters |
| `harness sync --check` | CI — exit 1 if adapters drift |
| `harness update` | Update skills already in `.agents/skills/` |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` (use `--force` to overwrite) |
| `harness add-rule <name>` | New rule under `.nextstage-harness/rules/` + sync |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` |
| `harness prune-retired-skills` | Remove renamed skill dirs after replacement |
| `harness uninstall` | Remove skills, adapters, `.nextstage-harness/`, lock, ignore blocks (`docs/` kept) |
| `harness agents` | Show active agents from manifest |
| `harness agents set` | Persist agents, sync, prune unused adapter trees |

### Common flags

| Flag | Effect |
|------|--------|
| `--dir <path>` | Target project root (default: `.`) |
| `--preset <name>` | Preset selection |
| `--skill <id>` | Skill selection (repeatable) |
| `--all` | Full catalog |
| `--agent <name>` | `cursor`, `claude-code` (repeatable; default both) |
| `--source <path\|repo>` | Skills source override |
| `--copy` | Copy skills instead of symlinks |
| `--global` / `-g` | Global skills install (Skills CLI) |
| `--no-scaffold` | Skills only — skip harness layout / `AGENTS.md` / `docs/` |
| `--keep-agents-md` | With `uninstall`: keep `AGENTS.md` / `CLAUDE.md` |
| `--yes` / `-y` | Non-interactive |
| `--dry-run` | Print plan, write nothing |
| `--force` | Overwrite (`agents-md`, `migrate-rules`, `add-rule`) |

`add-rule` extras: `--description`, `--globs` (comma-separated; scoped rule, not always-apply).

### Full `init` example

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --skill ns-multi-agent-architect \
  --skill langchain-fundamentals \
  --agent cursor \
  --agent claude-code \
  --source nextstage-brasil/skills \
  --copy \
  --no-scaffold \
  --yes
```

### Local / monorepo source (maintainers)

```bash
export NEXTSTAGE_SKILLS_SOURCE=~/apps/nextstage/skills
npx @nextstage-brasil/harness --skill ns-code-coder --no-scaffold -y

# Or run the package from a clone
npx file:~/apps/nextstage/skills/packages/harness
```

### What `init` does (order)

1. Detects new vs existing project  
2. Resolves `depends` from `templates/catalog.json`  
3. Runs `npx skills add` → `.agents/skills/`  
4. Scaffolds `.nextstage-harness/`, `.agents/`, `docs/` (unless `--no-scaffold`)  
5. `harness sync` — rule adapters + Claude skill symlinks  
6. `harness agents-md` — baseline `AGENTS.md` + `CLAUDE.md`

---

## Development

```bash
cd packages/harness
npm install
npm test
```

## Release (CI)

On every push to `main`, `.github/workflows/publish-harness.yml`:

1. Runs harness tests  
2. Reads conventional commits in that push  
3. Publishes every push — semver: `version:` → major, `feat:` → minor, else → patch  
4. Bumps `package.json` / lockfile, publishes to npm, tags `harness-v{version}`

### One-time npm trusted publishing

Without this, `npm publish` fails with `ENEEDAUTH`.

1. Log in at [npmjs.com](https://www.npmjs.com/) as a maintainer of `@nextstage-brasil/harness`  
2. Package → **Settings → Trusted publishing → GitHub Actions**  
3. Configure: org `nextstage-brasil`, repo `skills`, workflow `publish-harness.yml`  
4. Save, push to `main`

No `NPM_TOKEN` — OIDC only. Node 24, npm 11.5.1+, `id-token: write`. Do **not** set `registry-url` on `setup-node` (breaks OIDC).

### Manual recovery

If the version landed on `main` but not on npm: re-run the failed workflow after fixing trusted publishing, or push again to bump and retry.

## License

Apache-2.0
