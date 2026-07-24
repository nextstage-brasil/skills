# NextStage harness — project guide

This folder is the **source of truth** for AI agent rules in this repo.  
Edit here. Run `harness sync` (or `harness update`) to refresh generated files under `.cursor/` and `.claude/`.

**Quick reference:** all commands below run from the **project root** (parent of `.nextstage-harness/`).

```bash
npx @nextstage-brasil/harness <command>
```

---

## Start here (first 5 minutes)

| Goal | Command |
|------|---------|
| See installed skills & presets | `npx @nextstage-brasil/harness list` |
| See which agents this project uses | `npx @nextstage-brasil/harness agents` |
| Refresh rules + skill adapters | `npx @nextstage-brasil/harness sync` |
| Update skills already installed | `npx @nextstage-brasil/harness update` |
| Brownfield onboarding (in Cursor/Claude) | `/harness-prepare` |
| Brownfield instructions (terminal) | `npx @nextstage-brasil/harness prepare` |

**In your AI agent:** open `AGENTS.md` at the project root, then invoke skills via the menu or slash (e.g. `/code-coder`, `/mcp-gitlab-usage`).

---

## Layout

| Path | Role | Edit? |
|------|------|-------|
| `rules/*.md` | Canonical rule bodies | **Yes** |
| `manifest.json` | Rule registry + project `agents` | When adding rules or changing agents |
| `.agents/skills/<name>/` | Installed skills (Skills CLI) | Via `harness init` / `update` / `skills add` |
| `AGENTS.md` | Project entry for agents | CLI baseline; refine with `/harness-agents-md` |
| `.cursor/rules/*.mdc` | Cursor rule adapters | **No** — generated |
| `.claude/rules/*.md` | Claude rule adapters | **No** — generated |
| `.claude/skills/` | Claude skill symlinks | **No** — generated when `claude-code` is active |

**Mental model:** truth = `.nextstage-harness/` + `.agents/skills/` · mirrors = `.cursor/` + `.claude/`.

---

## Project agents (Cursor vs Claude Code)

Active agents are stored in `manifest.json` under `"agents"`.

```bash
# Show current agents and where the setting comes from
npx @nextstage-brasil/harness agents

# Cursor only — persists, syncs, removes .claude/
npx @nextstage-brasil/harness agents set --agent cursor

# Both agents
npx @nextstage-brasil/harness agents set --agent cursor --agent claude-code
# alias: claude → claude-code
npx @nextstage-brasil/harness agents set claude cursor
```

**Precedence:** `--agent` on a single command overrides `manifest.json`.  
`sync` and `update` use `manifest.agents` when you omit `--agent`.

Cursor reads skills from `.agents/skills/` directly. Claude Code uses symlinks in `.claude/skills/` when enabled.

---

## Rules

### Add a rule

```bash
npx @nextstage-brasil/harness add-rule api-conventions \
  --description "REST API conventions for agents"

# Scoped to paths (not always-on)
npx @nextstage-brasil/harness add-rule frontend \
  --globs "apps/web/**,packages/ui/**" \
  --description "Frontend conventions"
```

Creates `rules/<name>.md`, updates `manifest.json`, and runs sync.

### Edit a rule

1. Edit `rules/<name>.md`.
2. Change `manifest.json` only if description, globs, or alwaysApply change.
3. Sync:

```bash
npx @nextstage-brasil/harness sync
```

### Architecture rules (brownfield)

Replace the stub `rules/architecture-rules.md` by running **`/harness-architecture-rules`** in your agent, then:

```bash
npx @nextstage-brasil/harness sync
```

---

## Skills

### Install more skills (existing project)

```bash
# See catalog and install examples
npx @nextstage-brasil/harness list

# One skill (+ catalog dependencies)
npx @nextstage-brasil/harness --skill gitlab-board-sync --no-scaffold -y

# Full preset (e.g. GitLab execution chain)
npx @nextstage-brasil/harness --preset gitlab --yes

# Preview without writing files
npx @nextstage-brasil/harness --preset gitlab --dry-run
```

### Update installed skills only

Does **not** install new catalog skills — only refreshes what is already under `.agents/skills/`.

```bash
npx @nextstage-brasil/harness update
npx @nextstage-brasil/harness update --dry-run
```

`update` runs sync internally (rules + adapters + prune for excluded agents).

### Remove renamed skills

After a skill was renamed in the catalog and the replacement is installed:

```bash
npx @nextstage-brasil/harness prune-retired-skills --dry-run
npx @nextstage-brasil/harness prune-retired-skills
```

---

## Sync

Regenerates adapters from this folder and `.agents/skills/`.

```bash
npx @nextstage-brasil/harness sync
npx @nextstage-brasil/harness sync --agent cursor   # one-off override
```

**CI — fail if someone edited generated files:**

```bash
npx @nextstage-brasil/harness sync --check
```

---

## Brownfield onboarding

For existing codebases, run once (and again after major refactors):

**In agent:** `/harness-prepare`  
**Chain:** architecture-rules → sync → brownfield map → reverse spec → AGENTS.md

**Terminal:** `npx @nextstage-brasil/harness prepare` prints full instructions.

Artifacts land under `docs/context/`, `docs/specs/`, `docs/versions/`.

---

## SDD workflow (skills)

Typical planning → implementation chain (invoke via slash in your agent):

```
pm-clarify-requirements
  → pm-requirements-generator
  → pm-task-generator
  → code-coder
  → code-reviewer
```

GitLab execution: preset `gitlab` or skills like `mcp-gitlab-usage`, `execution-gitlab-issue`, `gitlab-board-sync`.

---

## Regenerate AGENTS.md

CLI baseline (no AI):

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force
```

Brownfield refinement: **`/harness-agents-md`** in your agent.

---

## Common issues

| Problem | Fix |
|---------|-----|
| `.cursor/rules/` out of date | Edit `rules/*.md` here → `harness sync` |
| `.claude/` appeared but I only use Cursor | `harness agents set --agent cursor` |
| New skill version available | `harness update` |
| `sync --check` fails in CI | Run `harness sync` locally and commit adapters |
| Legacy `.cursor/rules/*.mdc` only | `npx @nextstage-brasil/harness migrate-rules --force` |

---

## All CLI commands

| Command | Purpose |
|---------|---------|
| `harness` / `harness init` | Install skills, scaffold, sync |
| `harness list` | Presets and skill catalog |
| `harness sync` | Regenerate adapters |
| `harness update` | Update installed skills only |
| `harness agents` | Show project agents |
| `harness agents set` | Persist agents in manifest |
| `harness add-rule <name>` | New rule + sync |
| `harness agents-md` | Generate AGENTS.md |
| `harness prepare` | Brownfield prepare instructions |
| `harness migrate-rules` | Import legacy Cursor rules |
| `harness prune-retired-skills` | Remove renamed skill dirs |

Also refreshed on every `harness sync`, `harness update`, and `harness init` when `.nextstage-harness/` exists.

Package docs: [github.com/nextstage-brasil/skills](https://github.com/nextstage-brasil/skills) · `packages/harness/README.md`
