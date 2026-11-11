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
| Refresh rules + skill + subagent adapters; create `CLAUDE.md` if missing (`claude-code`) | `npx @nextstage-brasil/harness sync` |
| Update skills already installed (changed only; `--force` = all) | `npx @nextstage-brasil/harness update` |
| Brownfield onboarding (manual) | `/ns-harness prepare this repo` |
| Brownfield instructions (terminal) | `npx @nextstage-brasil/harness prepare` |
| Spec-driven delivery | `/ns-spec-driven` |
| Optional complements (UI, docs, security) | `npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y` |

**In your AI agent:** open `AGENTS.md` at the project root, then invoke skills via the menu or slash (e.g. `/ns-coder`, `/ns-execution-gitlab-issue`).

---

## Layout

| Path | Role | Edit? |
|------|------|-------|
| `rules/*.md` | Canonical rule bodies | **Yes** |
| `agents/*.md` | Canonical subagent bodies | **Yes** |
| `manifest.json` | Rule registry + project `agents` + `subagents` (models) | When adding rules/agents or changing subagent models |
| `.agents/skills/<name>/` | Installed skills (Skills CLI) | Via `harness init` / `update` / `skills add` |
| `AGENTS.md` | Project entry for agents | CLI baseline; refine with `/ns-harness` agents-md |
| `.cursor/rules/*.mdc` | Cursor rule adapters | **No** — generated; gitignored |
| `.claude/rules/*.md` | Claude rule adapters | **No** — generated; gitignored |
| `.agents/rules/*.md` | Antigravity rule adapters | **No** — generated; gitignored |
| `.cursor/agents/*.md` | Cursor subagent bridges | **No** — generated; set `model` in manifest; gitignored |
| `.claude/agents/*.md` | Claude subagent bridges | **No** — generated; set `model` in manifest; gitignored |
| `.claude/skills/` | Claude skill symlinks | **No** — generated when `claude-code` is active; gitignored |

**Mental model:** truth = `.nextstage-harness/` + `.agents/skills/` · mirrors = `.cursor/` + `.claude/` + `.agents/rules/` (regenerated via `harness sync`; gitignored).

**After clone:** `npx @nextstage-brasil/harness sync`

---

## Project agents (Cursor, Claude Code, Antigravity)

Active agents are stored in `manifest.json` under `"agents"`.

```bash
# Show current agents and where the setting comes from
npx @nextstage-brasil/harness agents

# Single agent examples (persists, syncs, and prunes unused adapters)
npx @nextstage-brasil/harness agents set --agent cursor
npx @nextstage-brasil/harness agents set --agent claude
npx @nextstage-brasil/harness agents set --agent antigravity

# Paired agents
npx @nextstage-brasil/harness agents set --agent cursor --agent claude
npx @nextstage-brasil/harness agents set --agent antigravity --agent claude

# All agents (repeatable flags or positional with aliases)
npx @nextstage-brasil/harness agents set --agent cursor --agent claude-code --agent antigravity
# aliases: claude → claude-code, agy/gemini → antigravity
npx @nextstage-brasil/harness agents set claude cursor agy
```

**Precedence:** `--agent` on a single command overrides `manifest.json`.  
`sync` and `update` use `manifest.agents` when you omit `--agent`.

Cursor and Antigravity read skills from `.agents/skills/` directly. Claude Code uses symlinks in `.claude/skills/` when enabled.

---

## Project subagents (model bridges)

Canonical bodies live in `agents/{name}.md`. Metadata (skill link, model, readonly) in `manifest.json` → `"subagents"`. Seeded when matching skills are installed (aligned with presets that pull `ns-coder`, `ns-reviewer`, `ns-spec-driven`):

| Agent file | Skill | Default model (cursor / claude) | `readonly` |
|------------|-------|----------------------------------|------------|
| `coder-agent.md` | `ns-coder` | `inherit` / `sonnet` | `false` |
| `reviewer-agent.md` | `ns-reviewer` | `inherit` / `opus` | `true` |
| `task-writer-agent.md` | `ns-spec-driven` (`references/task-generator.md`) | `inherit` / `haiku` | `false` |

**Project owns `model`.** Edit `manifest.json`, then `harness sync`. `harness update` refreshes adapter bodies but **never** resets your model values.

Orchestrators follow spawn gate in `ns-harness` → `references/subagent-dispatch.md`: **Default = everything in-session** (Tasks, Execute, Review); spawn an adapter by **exact** `name` **only on explicit user request**, so YAML `model` applies. Cursor Task types `coder` and `reviewer` are **not** these bridges. Spawning Task with `inherit` (or `coder` / `reviewer` / `generalPurpose`) uses the **parent** model / platform persona — forbidden when a spawn was requested. If the platform cannot bind `{name}`, stop and ask the human to invoke `/{name}`.

```json
"subagents": [
  {
    "name": "reviewer-agent",
    "canonical": "agents/reviewer-agent.md",
    "skill": "ns-reviewer",
    "description": "(NS) Thin bridge…",
    "model": { "cursor": "grok-4.7[context=256k,reasoning_effort=medium,fast=false]", "claude": "opus" },
    "readonly": true
  }
]
```

### Add a subagent

```bash
npx @nextstage-brasil/harness add-subagent investigator-agent \
  --skill ns-investigator \
  --description "Investigation bridge"
```

Creates `agents/<name>.md`, updates `manifest.json`, and runs sync.

### Edit a subagent

1. Edit `agents/<name>.md` (body).
2. Change `manifest.json` only for `skill`, `model`, `description`, or `readonly`.
3. Run `harness sync`.

Generated adapters: `.cursor/agents/{name}.md` and `.claude/agents/{name}.md`. Each bridge reads `AGENTS.md` then the mapped skill.

---

## Rules

### Add a rule

```bash
npx @nextstage-brasil/harness add-rule api-conventions \
  --description "REST API conventions for agents"

# Always-on (opt-in)
npx @nextstage-brasil/harness add-rule security-baseline \
  --description "Security baseline — load every session" \
  --always-apply

# Scoped to paths (not always-on)
npx @nextstage-brasil/harness add-rule frontend \
  --globs "apps/web/**,packages/ui/**" \
  --description "Frontend conventions"
```

Creates `rules/<name>.md`, updates `manifest.json` with `cursor.description` + `alwaysApply: false` by default (or `globs` / `--always-apply`), and runs sync. **Required:** `--description` is the Cursor "when to apply" header — without it in the manifest, sync fails.

### Edit a rule

1. Edit `rules/<name>.md` (body only — no YAML frontmatter; sync strips it).
2. Change `manifest.json` only if description, globs, or alwaysApply change.
3. Sync:

```bash
npx @nextstage-brasil/harness sync
```

### Architecture rules (brownfield)

Replace the stub `rules/architecture-rules.md` by running **`/ns-harness` architecture-rules** in your agent, then:

```bash
npx @nextstage-brasil/harness sync
```

### Project rules (manual)

Edit `rules/project-rules.md` for project-local settings (language, project codes, team context, GitLab MCP server name, agent names). Harness creates the stub once; never overwrites your edits. Then sync:

```bash
npx @nextstage-brasil/harness sync
```

Stack and architecture stay in `architecture-rules.md` — not here.

---

## Skills

### Install more skills (existing project)

```bash
# See catalog and install examples
npx @nextstage-brasil/harness list

# One skill (+ catalog dependencies)
npx @nextstage-brasil/harness --skill ns-gitlab-board-sync --no-scaffold -y

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

### Uninstall harness

Removes skills, adapters, `.nextstage-harness/`, `skills-lock.json`, and managed ignore blocks. Keeps `docs/`.

```bash
npx @nextstage-brasil/harness uninstall --dry-run
npx @nextstage-brasil/harness uninstall --yes
npx @nextstage-brasil/harness uninstall --yes --keep-agents-md
```

---

## Sync

Regenerates adapters from this folder and `.agents/skills/`.

```bash
npx @nextstage-brasil/harness sync
npx @nextstage-brasil/harness sync --agent cursor   # one-off override
```

**CI — smoke test after checkout:**

```bash
npx @nextstage-brasil/harness sync
```

Locally, `harness sync --check` verifies adapters on disk match canonical (use after editing `rules/` or `manifest.json`).

---

## Brownfield onboarding (manual)

For existing codebases, run once (and again after major refactors). **Not** part of `/ns-spec-driven`. In a team, run it **on the integration branch only** — see [Working in a team](#working-in-a-team).

**In agent:** `/ns-harness prepare this repo`  
**Chain:** architecture-rules → sync → brownfield map → reverse spec → AGENTS.md

**Terminal:** `npx @nextstage-brasil/harness prepare` prints full instructions.

Artifacts land under `docs/context/`, `docs/specs/`, `docs/versions/{version_san}/sdd/` (PM under `pm/`).

---

## Working in a team

Several developers, one repo. Generated context (`docs/context/**`) and shared domain specs (`docs/specs/{domain}.md`) would otherwise be rewritten by every feature branch and conflict on every merge. The harness splits the work by **branch role**.

### Branch role (nothing to configure)

The agent reads the current branch name:

| Branch | Role | Examples |
|--------|------|----------|
| Feature | `work/*`, `feature/*`, `feat/*`, `fix/*`, `bugfix/*`, `hotfix/*`, or starts with an issue number | `work/2110-login-fix`, `2110-login-fix` |
| Integration | anything else | `main`, `develop_1.32`, `release/1.32` |

Different convention? Add one line to `rules/project-rules.md` (or `AGENTS.local.md`): `Context regeneration branch: develop_*, main`. Branches matching a glob are integration; all others are feature.

### If you are on a feature branch

- **Read** `docs/context/` and `docs/specs/` as usual.
- **Do not** run `/ns-harness prepare` — it stops and writes nothing. Do not hand-edit or commit `docs/context/**`, `rules/`, or `AGENTS.md` inside a feature MR (change rules in their own MR).
- At delivery, `ns-living-spec` does **not** edit `docs/specs/{domain}.md` or `INDEX.md`. It creates one new file per domain in `docs/specs/_pending/` (e.g. `1.32-login-messages.md`). **Commit that file with your MR.** Different MRs create different files, so they do not conflict.
- Review gates are unchanged: the fragment is written only after the usual approvals.

### If you operate the integration branch

After MRs are merged:

1. **Consolidate specs** — in your agent, on the integration branch, ask: *consolidate pending specs* (`/ns-living-spec`). It applies each fragment in `docs/specs/_pending/` to `docs/specs/{domain}.md`, updates `INDEX.md` once, and deletes the applied fragments. A fragment that conflicts with another (e.g. changes a requirement an earlier fragment removed) is **left in place** and listed in the report — resolve it by hand, then run consolidate again.
2. **Refresh context** — run `/ns-harness prepare this repo`. When nothing really changed, files are not rewritten and `git diff` stays empty.
3. **Sync + commit** — `npx @nextstage-brasil/harness sync`, then commit `docs/context/**`, `docs/specs/**` (including the deleted fragments), `.nextstage-harness/`, `AGENTS.md` in one commit.

Cadence: after each merge batch, at least once per sprint or version closure. If a dev works directly on the integration branch, `ns-living-spec` consolidates pending fragments before writing — no extra step.

### Optional repo hygiene (not installed by the harness)

- `.gitattributes`: `docs/context/** linguist-generated=true` — collapses generated files in MR diffs.
- CI guard: fail feature-branch MRs that change `docs/context/**`.
- CI job on the integration branch that runs consolidate + prepare, so nobody has to remember.

---

## SDD delivery

**Entry:** `/ns-spec-driven` — auto-sizes Small / Medium / Large and delegates to worker skills.

Typical worker chain (invoke via slash in your agent):

```
/ns-spec-driven
  → internal phases (references/clarify-requirements.md … task-generator.md)
  → ns-coder (execute)
  → ns-reviewer (code close)
  → ns-judge (delivery close)
```

Optional complements (UI, docs, security hygiene) — install per skill:

```bash
npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y
```

GitLab execution: preset `gitlab` (alias `spec-driven-gitlab`) or skills like `ns-execution-gitlab-issue`, `ns-gitlab-board-sync`, `ns-requirements-enricher`. (`mcp-gitlab-usage` is provisioned by the GitLab MCP on first use.)

---

## Regenerate AGENTS.md

CLI baseline (no AI):

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force
```

Brownfield refinement: **`/ns-harness` agents-md** in your agent.

---

## Common issues

| Problem | Fix |
|---------|-----|
| Adapters missing after clone | `npx @nextstage-brasil/harness sync` |
| `sync --check` fails locally | Edit `rules/*.md` here → `harness sync` → commit `.nextstage-harness/` only |
| `.claude/` appeared but I only use Cursor | `harness agents set --agent cursor` |
| New skill version available | `harness update` |
| `/ns-harness prepare` refuses to run | You are on a feature branch — run it on the integration branch ([Working in a team](#working-in-a-team)) |
| `docs/specs/_pending/` missing | `npx @nextstage-brasil/harness update` (scaffold creates it) |
| `_pending/` keeps growing | Nobody ran *consolidate pending specs* on the integration branch |
| Orphan / legacy `.cursor/rules/*.mdc` | `npx @nextstage-brasil/harness sync` (absorbs into canonical) |

---

## All CLI commands

| Command | Purpose |
|---------|---------|
| `harness` / `harness init` | Install skills, scaffold, sync |
| `harness list` | Presets and skill catalog |
| `harness sync` | Absorb orphan Cursor rules + regenerate adapters; create `CLAUDE.md` if missing when `claude-code` is active |
| `harness update` | Update changed installed skills (`--force` refreshes all) |
| `harness agents` | Show project agents |
| `harness agents set` | Persist agents in manifest |
| `harness add-rule <name>` | New rule + sync |
| `harness add-subagent <name>` | New subagent + sync (`--skill` required) |
| `harness agents-md` | Generate AGENTS.md |
| `harness prepare` | Brownfield prepare instructions |
| `harness prune-retired-skills` | Remove renamed skill dirs |
| `harness uninstall` | Remove harness install (keeps `docs/`) |

Also refreshed on every `harness sync`, `harness update`, and `harness init` when `.nextstage-harness/` exists.

Package docs: [github.com/nextstage-brasil/skills](https://github.com/nextstage-brasil/skills) · `packages/harness/README.md`
