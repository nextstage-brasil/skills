# @nextstage-brasil/harness

Interactive CLI to install [NextStage skills](https://github.com/nextstage-brasil/skills) and scaffold SDD project layout with multi-agent rules sync.

## Usage

### From npm

```bash
npx @nextstage-brasil/harness
```

### Local clone

```bash
npx file:~/apps/nextstage/skills/packages/harness
cd ~/apps/nextstage/skills/packages/harness && npm link
```

### Non-interactive

```bash
npx @nextstage-brasil/harness --preset gitlab --yes
npx @nextstage-brasil/harness list
```

### Install specific skills only

Use `--skill` (repeatable). Harness resolves `depends` from `templates/catalog.json` and installs only what you asked for plus required dependencies — not the full catalog. Every install also includes `alwaysInstall` skills (`nextstage-harness`, `harness-prepare`) and their transitive `depends`.

```bash
# Preview what would be installed (no files written)
npx @nextstage-brasil/harness --skill multi-agent-architect --dry-run

# One NextStage skill — skills only, no AGENTS.md / docs scaffold
npx @nextstage-brasil/harness --skill multi-agent-architect --no-scaffold -y

# Multiple skills
npx @nextstage-brasil/harness --skill code-coder --skill code-reviewer --no-scaffold -y

# External skill (Agents API registry — see external-skills.json)
npx @nextstage-brasil/harness --skill langchain-fundamentals --no-scaffold -y
```

Skill ids match directory names (`harness list` or repo `skills/<name>/`). Example: **multi-agent-architect** (LangGraph vs CrewAI architecture interviews) — no preset required.

If a skill declares `depends` in the catalog (e.g. `code-reviewer` → `nextstage-harness`, `mcp-gitlab-usage`), those peers are installed automatically. `alwaysInstall` (`nextstage-harness`, `harness-prepare`) is merged into every install plan before `depends` resolution.

To add one skill to a project that already has harness:

```bash
cd your-project
npx @nextstage-brasil/harness --skill multi-agent-architect --no-scaffold -y
npx @nextstage-brasil/harness sync
```

To refresh skills already installed (e.g. after a catalog release) without pulling new ones:

```bash
cd your-project
npx @nextstage-brasil/harness update
```

Without harness (Skills CLI only):

```bash
npx skills add nextstage-brasil/skills@multi-agent-architect --full-depth -y
```

### Complete example (`init` — all compatible flags)

Selection mode is **one of** `--preset`, `--skill` (repeatable), or `--all`. The example below uses `--skill` (two skills: one NextStage + one external).

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --skill multi-agent-architect \
  --skill langchain-fundamentals \
  --agent cursor \
  --agent claude-code \
  --source nextstage-brasil/skills \
  --copy \
  --global \
  --no-scaffold \
  --yes
```

| Flag | Example value | Effect |
|------|---------------|--------|
| `init` | (command) | Explicit init; default when you run `harness` with no subcommand |
| `--dir` | `./my-agent-service` | Target project root (default: current directory) |
| `--skill` | `multi-agent-architect` | Install this skill (+ catalog `depends`); repeat for more |
| `--agent` | `cursor`, `claude-code` | Symlink/copy skills into each agent folder; repeat per agent |
| `--source` | `nextstage-brasil/skills` | NextStage catalog source (or local clone path) |
| `--copy` | (flag) | Copy skill files instead of symlinks (Skills CLI `--copy`) |
| `--global` / `-g` | (flag) | Install skills globally (passed through to Skills CLI) |
| `--no-scaffold` | (flag) | Skip `.nextstage-harness/`, `AGENTS.md`, and `docs/` scaffolding |
| `--yes` / `-y` | (flag) | Non-interactive; skip wizard prompts |

**Preview the same install without writing files:**

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --skill multi-agent-architect \
  --dry-run
```

**Preset instead of `--skill`** (installs bundled set + dependencies):

```bash
npx @nextstage-brasil/harness init \
  --dir ./my-agent-service \
  --preset agents-api \
  --agent cursor \
  --yes
```

**Environment alternative to `--source`:**

```bash
export NEXTSTAGE_SKILLS_SOURCE=~/apps/nextstage/skills
npx @nextstage-brasil/harness --skill multi-agent-architect --no-scaffold -y
```

### Other commands — full flag examples

```bash
# Sync adapters (rules + skill symlinks)
npx @nextstage-brasil/harness sync \
  --dir ./my-agent-service \
  --agent cursor \
  --agent claude-code \
  --copy

# CI: fail if adapters drift from canonical
npx @nextstage-brasil/harness sync --dir ./my-agent-service --check

# Regenerate AGENTS.md from installed skills
npx @nextstage-brasil/harness agents-md --dir ./my-agent-service --force

# Import legacy Cursor rules
npx @nextstage-brasil/harness migrate-rules --dir ./my-agent-service --agent cursor --force

# New canonical rule + sync
npx @nextstage-brasil/harness add-rule api-conventions \
  --dir ./my-agent-service \
  --description "REST API conventions for agent services" \
  --globs "src/api/**,apps/agent-api/**" \
  --agent cursor \
  --force

# Brownfield prepare instructions
npx @nextstage-brasil/harness prepare --dir ./my-agent-service

# Remove renamed skill dirs (preview first)
npx @nextstage-brasil/harness prune-retired-skills --dir ./my-agent-service --dry-run
npx @nextstage-brasil/harness prune-retired-skills --dir ./my-agent-service

# Update installed skills only (does not install new catalog skills)
npx @nextstage-brasil/harness update --dir ./my-agent-service
npx @nextstage-brasil/harness update --dir ./my-agent-service --dry-run

# Catalog
npx @nextstage-brasil/harness list
```

| Command | Flags |
|---------|-------|
| `init` | `--dir`, `--preset`, `--skill`, `--all`, `--global`, `--agent`, `--copy`, `--source`, `--yes`, `--no-scaffold`, `--dry-run` |
| `sync` | `--dir`, `--agent`, `--copy`, `--check` |
| `agents-md` | `--dir`, `--force` |
| `migrate-rules` | `--dir`, `--agent`, `--force` |
| `add-rule <name>` | `--dir`, `--agent`, `--description`, `--globs`, `--force` |
| `prepare` | `--dir` |
| `prune-retired-skills` | `--dir`, `--dry-run` |
| `update` | `--dir`, `--skill` (repeatable), `--global`, `--agent`, `--copy`, `--dry-run` |
| `agents` | `--dir` — show active agents from manifest |
| `agents set` | `--dir`, `--agent` (repeatable) or positional agent names — persist + sync + prune |
| `list` | — |

## Commands

| Command | Description |
|---------|-------------|
| `harness` / `harness init` | Install skills, scaffold layout, sync adapters, generate `AGENTS.md` |
| `harness list` | Presets and skill catalog |
| `harness prepare` | Print full brownfield prepare instructions (`/harness-prepare`) |
| `harness sync` | Regenerate `.cursor/rules/`, `.claude/rules/`, and skill symlinks |
| `harness sync --check` | CI mode — exit 1 if adapters drift from canonical |
| `harness add-rule <name>` | Create rule under `.nextstage-harness/rules/`, update manifest, sync |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` from installed skills (no AI) |
| `harness agents-md --force` | Overwrite existing `AGENTS.md` |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` → `.nextstage-harness/rules/` |
| `harness prune-retired-skills` | Remove renamed skill dirs after replacement is installed |
| `harness update` | Update skills already in `.agents/skills/` (no new installs) |
| `harness update --dry-run` | Preview which installed skills would be updated |
| `harness agents` | Show active agents (from `.nextstage-harness/manifest.json`) |
| `harness agents set --agent cursor` | Persist cursor-only; sync adapters; remove `.claude/` |

Common flags: `--dir`, `--preset`, `--skill` (repeatable), `--agent` (default `cursor`, `claude-code`), `--copy`, `--no-scaffold`, `--dry-run`, `--yes`.

`add-rule` flags: `--description`, `--globs` (comma-separated; skips `alwaysApply`), `--force`.

```bash
npx @nextstage-brasil/harness add-rule api-conventions --description "API conventions"
npx @nextstage-brasil/harness add-rule frontend --globs "apps/web/**"
```

See `.nextstage-harness/README.md` in consumer projects for the human guide.

## What `init` does

1. Detects **new** vs **existing** project.
2. Resolves skill dependencies from `templates/catalog.json`.
3. Runs `npx skills add` → `.agents/skills/` (+ `skill-creator` from anthropics/skills).
4. Scaffolds `.nextstage-harness/`, `.agents/`, and `docs/` (unless `--no-scaffold`).
5. Runs `harness sync` — rule adapters + Claude skill symlinks (Cursor uses `.agents/skills/` directly).
6. Runs `harness agents-md` — `AGENTS.md` from installed skills + `CLAUDE.md` (`@AGENTS.md`).

## Project layout (after init)

| Path | Role |
|------|------|
| `AGENTS.md` | Project entry (CLI-generated; refine with `harness-agents-md` skill) |
| `CLAUDE.md` | Pointer to `AGENTS.md` |
| `.nextstage-harness/rules/` | Canonical rules — **edit here** |
| `.nextstage-harness/README.md` | How to add/edit rules (scaffolded) |
| `.cursor/rules/`, `.claude/rules/` | Generated rule adapters |
| `.agents/skills/` | Installed skills (canonical — Skills CLI; Cursor reads here) |
| `.claude/skills/` | Symlinked Claude Code skill adapters (`harness sync`) |
| `docs/context`, `docs/specs`, `docs/versions` | SDD artifacts |

## Presets

| Preset | Skills |
|--------|--------|
| `recommended` | SDD planning chain + test generators + living specs |
| `gitlab` | MCP GitLab, review gate, issue execution, board sync |
| `brownfield` | `harness-agents-md`, architecture rules, bootstrap, reverse-spec |
| `implementation` | Code-coder, investigator, review |
| `agents-api` | Agents API projects — all curated external skills + architect/coder/reviewer |

See `harness list` for the full skill id list and external preset breakdown.

## Post-install (brownfield / existing code)

CLI writes baseline `AGENTS.md`. In your agent, run next:

1. `/harness-prepare` — full chain: architecture rules → sync → brownfield map → reverse spec → AGENTS.md
2. Or check prerequisites: `npx @nextstage-brasil/harness prepare`

Individual skills remain available if you need only one step.

Full guide: [docs/README_INSTALLER.md](docs/README_INSTALLER.md).

## Development

```bash
cd packages/harness
npm install
npm test
```

## Release (CI)

On every push to `main`, `.github/workflows/publish-harness.yml`:

1. Runs harness tests
2. Reads conventional commits in that push (any path in the repo)
3. Every push publishes. Semver bump: `version:` → major, `feat:` → minor, anything else → patch
4. Bumps `package.json` + `package-lock.json`, publishes to npm, then commits, tags `harness-v{version}`, and pushes

### One-time npm setup (required)

Without this, `npm publish` fails with `ENEEDAUTH`.

1. Log in to [npmjs.com](https://www.npmjs.com/) as a maintainer of `@nextstage-brasil/harness`
2. Package → **Settings → Trusted publishing** → **GitHub Actions**
3. Configure exactly:

| Field | Value |
| ----- | ----- |
| Organization or user | `nextstage-brasil` |
| Repository | `skills` |
| Workflow filename | `publish-harness.yml` |

4. Save, then push to `main` to verify the first publish

No `NPM_TOKEN` secret — OIDC only. The workflow uses Node 24, npm 11.5.1+, and `id-token: write`. Do **not** add `registry-url` to `setup-node` (it forces token auth and breaks OIDC).

After the first successful publish, consider **Publishing access → Require 2FA and disallow tokens**.

### Manual recovery

If publish failed after a version bump landed on `main` but npm does not have that version, either:

- Re-run the failed workflow after fixing npm trusted publishing, or
- Push again to `main` to bump and retry

## License

Apache-2.0
