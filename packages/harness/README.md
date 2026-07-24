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

Every install also pulls **alwaysInstall** skills: `nextstage-harness`, `harness-prepare`, `nextstage-spec-driven` (plus their dependencies). Presets add optional skills on top.

---

## Quick start

```bash
# 1. From your project root
cd your-project

# 2. Interactive (recommended first time)
npx @nextstage-brasil/harness

# 3. Or skip prompts — Spec-Driven default pack
npx @nextstage-brasil/harness --preset delivery --yes
```

Then open the project in your agent and:

1. Read `AGENTS.md`
2. **Brownfield:** run `/harness-prepare` once
3. **Delivery:** run `/nextstage-spec-driven`

See installed presets/skills anytime:

```bash
npx @nextstage-brasil/harness list
```

---

## Pick your scenario

### New project (greenfield)

Scaffold + Spec-Driven skills. Start delivering with `/nextstage-spec-driven`.

```bash
npx @nextstage-brasil/harness --preset delivery --yes
```

### Existing codebase (brownfield)

Same install — then onboard the repo so agents understand architecture and living specs.

```bash
npx @nextstage-brasil/harness --preset brownfield --yes
# In your agent:
#   /harness-prepare
```

Need the full prepare prompt in the terminal?

```bash
npx @nextstage-brasil/harness prepare
```

### GitLab-heavy team

Issue execution, board sync, requirements enricher, CI generator — on top of the SDD base.

```bash
npx @nextstage-brasil/harness --preset gitlab --yes
```

### Only one skill (no scaffold)

Install a skill + its catalog `depends`. Skips `.nextstage-harness/`, `AGENTS.md`, and `docs/`.

```bash
npx @nextstage-brasil/harness --skill multi-agent-architect --no-scaffold -y
npx @nextstage-brasil/harness --skill code-coder --skill code-reviewer --no-scaffold -y
```

Already have harness? Add a skill and refresh adapters:

```bash
npx @nextstage-brasil/harness --skill gitlab-board-sync --no-scaffold -y
npx @nextstage-brasil/harness sync
```

### Preview before writing files

```bash
npx @nextstage-brasil/harness --preset gitlab --dry-run
npx @nextstage-brasil/harness --skill code-frontend-design --dry-run
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

### Optional complements (UI, docs, security pass)

```bash
npx @nextstage-brasil/harness --preset complements --yes
```

### Agents API / LangChain stack

External + NextStage skills for agent-service work:

```bash
npx @nextstage-brasil/harness --preset agents-api --yes
```

### Init into another directory

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --preset delivery \
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

In the agent, invoke skills via menu or slash: `/nextstage-spec-driven`, `/code-coder`, `/code-reviewer`, …

Consumer guide (scaffolded into projects): `.nextstage-harness/README.md`  
Deep installer reference: [docs/README_INSTALLER.md](docs/README_INSTALLER.md)

---

## Presets

**Base (always):** `nextstage-harness`, `harness-prepare`, `nextstage-spec-driven` (+ transitive deps).

| Preset | Use when you want… |
|--------|-------------------|
| `delivery` / `recommended` | Default Spec-Driven pack (clarify → spec → tasks → implement) |
| `brownfield` | Base only — then `/harness-prepare` on existing code |
| `gitlab` | GitLab issues, board sync, enricher, CI generator |
| `implementation` | Investigator + PHPUnit / Cypress **execution** skills |
| `complements` | Frontend design, docs writer, best-practices pass |
| `full` | All optional add-ons (PM copilot, skill-creator, multi-agent-architect, …) |
| `agents-api` | LangChain / LangGraph / MCP external skills + NS base |

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
| `harness prepare` | Print brownfield prepare instructions (`/harness-prepare`) |
| `harness sync` | Regenerate rule + skill adapters |
| `harness sync --check` | CI — exit 1 if adapters drift |
| `harness update` | Update skills already in `.agents/skills/` |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` (use `--force` to overwrite) |
| `harness add-rule <name>` | New rule under `.nextstage-harness/rules/` + sync |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` |
| `harness prune-retired-skills` | Remove renamed skill dirs after replacement |
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
| `--yes` / `-y` | Non-interactive |
| `--dry-run` | Print plan, write nothing |
| `--force` | Overwrite (`agents-md`, `migrate-rules`, `add-rule`) |

`add-rule` extras: `--description`, `--globs` (comma-separated; scoped rule, not always-apply).

### Full `init` example

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --skill multi-agent-architect \
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
npx @nextstage-brasil/harness --skill code-coder --no-scaffold -y

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
