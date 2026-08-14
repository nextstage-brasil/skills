# Harness installer guide

Objective reference for `@nextstage-brasil/harness` — what gets installed, how rules sync works, and post-install agent prompts.

## 1. What gets installed

```
# Project root (harness --dir)
AGENTS.md                         # entry pointer (human-edited)
CLAUDE.md                         # stub: Rules boot + AGENTS.md + .claude/agents (if missing)
.nextstage-harness/               # CANONICAL — edit rules here
  README.md                       # Human guide (add/edit rules)
  manifest.json
  rules/
    architecture-rules.md
    project-rules.md
  docs/
.cursor/rules/*.mdc               # GENERATED — Cursor rule adapters
.claude/rules/*.md                # GENERATED — Claude Code rule adapters
.agents/skills/                   # Installed skills (Skills CLI canonical; Cursor reads here)
.claude/skills/ → symlink          # Claude Code skill adapters (harness sync)
docs/context|specs|versions/      # SDD artifacts (.gitkeep in each)
```

**Rules:** edit `.nextstage-harness/rules/` → `harness sync` → `.cursor/rules/`, `.claude/rules/`. Prefer `harness add-rule <name>` for new rules (creates stub, updates `manifest.json`, syncs). See `.nextstage-harness/README.md`.

**Subagents:** edit `.nextstage-harness/agents/` → `harness sync` → `.cursor/agents/`, `.claude/agents/`. Prefer `harness add-subagent <name> --skill <id>` for new bridges. Example: `npx @nextstage-brasil/harness add-subagent investigator-agent --skill ns-investigator --description "Investigation bridge"`.

**Skills:** canonical in `.agents/skills/` (Skills CLI). **Cursor** (including subagents) discovers skills there directly. **Claude Code** reads `.claude/skills/` — `harness sync` symlinks from canonical when Claude is a target agent. Invoke via the Skills menu / slash (e.g. `/ns-coder`).

**Project-local skills:** install Anthropics `skill-creator` — `npx skills add https://github.com/anthropics/skills --skill skill-creator -y` (or `--preset full` installs it). Follow `.agents/skills/skill-creator/SKILL.md`; path overrides in installed `ns-harness` → `references/project-skill-authoring.md`. Run `harness sync` after each create or edit.

## 2. Commands

| Command | Description |
|---------|-------------|
| `npx @nextstage-brasil/harness` | Interactive init (default) |
| `harness init [options]` | Install skills + scaffold + sync |
| `harness prepare` | Print full brownfield prepare instructions (`/ns-harness prepare`) |
| `harness sync` | Absorb orphan `.cursor/rules/*.mdc` + regenerate adapters + ensure ignore blocks |
| `harness add-rule <name>` | Create canonical rule + manifest entry + sync |
| `harness add-subagent <name>` | Create canonical subagent + manifest entry + sync (`--skill` required) |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` from installed skills (no AI) |
| `harness agents-md --force` | Overwrite existing `AGENTS.md` |
| `harness sync --check` | Local mode — exit 1 if adapters on disk drift from canonical (or orphan `.mdc`) |
| `harness uninstall` | Remove harness install (skills, adapters, scaffold; keeps `docs/`) |
| `harness uninstall --keep-agents-md` | Same, but keep `AGENTS.md` / `CLAUDE.md` |
| `harness list` | Presets and skill catalog |

### Flags

| Flag | Effect |
|------|--------|
| `--preset <name>` | `spec-driven` (default), `gitlab`, `project-manager`, `frontend-prototype`, `agent-creator`, `full` |
| `--agent <name>` | Repeatable; default `cursor`, `claude-code` |
| `--yes`, `-y` | Non-interactive |
| `--no-scaffold` | Skills only — skip AGENTS.md and `.nextstage-harness/` |
| `--keep-agents-md` | With `uninstall`: keep `AGENTS.md` / `CLAUDE.md` |
| `--dir <path>` | Target project directory |
| `--source <path>` | Skills source override |
| `--description <text>` | With `add-rule` / `add-subagent`: short purpose |
| `--globs <patterns>` | With `add-rule`: comma-separated globs (not always-apply) |
| `--skill <id>` | With `add-subagent`: installed skill id (required; one per command) |
| `--force` | Overwrite existing (`agents-md`, `add-rule`, `add-subagent`) |
| `--dry-run` | Show resolved plan without installing |

## 3. Install scenarios

### Greenfield (new project)

```bash
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Creates scaffold, stub `architecture-rules.md` and `project-rules.md`, syncs adapters. Use `--preset spec-driven` for `ns-spec-driven` + workers. Run `/ns-harness` architecture-rules when code exists; edit `project-rules.md` manually for project-local settings.

### Brownfield (existing codebase)

```bash
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Same install as greenfield. Follow post-install prompts and run `/ns-harness prepare this repo` in your agent (§10).

### Skills only (no harness scaffold)

```bash
npx skills add nextstage-brasil/skills --full-depth -y --skill ns-coder
```

Skills install under `.agents/skills/` with agent symlinks. No `.nextstage-harness/` unless you run `harness init` without `--no-scaffold`.

### Refresh after editing canonical rules

```bash
npx @nextstage-brasil/harness sync
git add .nextstage-harness/
git commit -m "chore: update project rules"
```

## 4. The three paths explained

### Rules

| Path | Role | Edit? |
|------|------|-------|
| `.nextstage-harness/rules/*.md` | Canonical project rules | **Yes** |
| `.cursor/rules/*.mdc` | Cursor rule adapter | No — generated |
| `.claude/rules/*.md` | Claude Code rule adapter | No — generated |

### Skills

| Path | Role | Edit? |
|------|------|-------|
| `.agents/skills/<name>/` | Canonical skills (Skills CLI; Cursor reads here) | **Yes** |
| `.claude/skills/<name>/` | Claude Code skill adapter | No — symlink |

## 5. Cursor vs Claude

| Agent | Loads automatically | Adapter locations |
|-------|---------------------|-------------------|
| Cursor (incl. subagents) | `.agents/skills/` at project root | Rules: `.cursor/rules/` only |
| Claude Code | `.claude/skills/` | Rules: `.claude/rules/`; skills symlinked from `.agents/skills/` |

Both read the same canonical rule bodies from `.nextstage-harness/rules/`. Skills canonical path is `.agents/skills/`; Claude Code needs the `.claude/skills/` symlink layer. Rule adapters are generated files; Claude skill adapters are symlinks to canonical (copies with `--copy`).

## 6. Git policy

Commit:

- `.nextstage-harness/` (canonical rules + manifest)
- `.agents/skills/` and `skills-lock.json` (Skills CLI)
- `AGENTS.md`, `CLAUDE.md` (if present)

Do **not** commit generated adapters — `harness sync` manages a block in `.gitignore`:

- `/.cursor/rules/`, `/.cursor/agents/`, `/.claude/`

After clone, run `npx @nextstage-brasil/harness sync` to regenerate adapters locally.

Custom Cursor rules or hooks outside harness belong under other `.cursor/` paths (not gitignored by default).

## 7. CI

Add to your pipeline when harness is installed:

```bash
npx @nextstage-brasil/harness sync
```

Smoke test: validates manifest and canonical rules; writes adapters (gitignored). For local drift checks before committing harness changes, use `harness sync --check`.

## 8. Orphan / legacy `.cursor/rules/`

Projects with harness scaffold and hand-created `.cursor/rules/*.mdc` (Cursor UI) — or legacy adapters not yet in the manifest:

```bash
npx @nextstage-brasil/harness sync
git add .nextstage-harness/ .gitignore
```

`sync` absorbs orphan `.mdc` (basename not in `manifest.rules`): extracts body, maps Cursor frontmatter (`description` / `alwaysApply` / `globs`) into the manifest, writes canonical under `.nextstage-harness/rules/`, then regenerates adapters. Rules already in the manifest are not reverse-overwritten from `.mdc`. No harness yet? Run `harness init` first, then `sync`.

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Adapters missing after clone | Run `npx @nextstage-brasil/harness sync` |
| `sync --check` fails locally | Edit canonical under `.nextstage-harness/rules/`, run `sync`, commit harness + `.gitignore` only |
| Adapters missing after init | Run `harness sync` manually |
| Windows symlink issues | Use `harness init --copy` or Skills CLI `--copy` |
| Legacy skills reference `.cursor/rules/` | Run `harness sync` (absorbs orphans); skills use `.nextstage-harness/` with legacy fallback |

## 10. Post-install agent prompts

Run these **in Cursor or Claude Code** after `harness init` (not auto-invoked by CLI).

### 10.0 Full prepare (recommended — existing codebases)

**Skill:** `ns-harness` (`/ns-harness prepare this repo`)

**CLI check:**

```bash
npx @nextstage-brasil/harness prepare
```

**Prompt:**

```
Run full harness prepare for this project.
```

**Chain (automatic, one session):**

1. `/ns-harness` architecture-rules → `.nextstage-harness/rules/architecture-rules.md`
2. `npx @nextstage-brasil/harness sync`
3. `/ns-harness` brownfield → `docs/context/brownfield-map.md`
4. `/ns-harness` reverse-spec → `docs/context/system-reverse-spec.md`
5. `/ns-harness` agents-md → `AGENTS.md` + `CLAUDE.md`

**Greenfield with no code yet:** skip until application code exists.

### 10.1 CLI AGENTS.md baseline (automatic on init)

`harness init` runs `harness agents-md` automatically. No AI — lists installed skills and layout from disk.

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force   # overwrite hand-edited file
```

**Output:** `AGENTS.md`, `CLAUDE.md` (Rules boot + AGENTS.md + `.claude/agents`)

Step 5 of `/ns-harness prepare` refines this with project context.

### 10.2 Individual `/ns-harness` workers (optional)

Use when you need only one artifact:

| Prompt | Output |
| ----- | ------ |
| `/ns-harness` architecture-rules | `.nextstage-harness/rules/architecture-rules.md` |
| `/ns-harness` brownfield map | `docs/context/brownfield-map.md` |
| `/ns-harness` reverse-spec | `docs/context/system-reverse-spec.md` |
| `/ns-harness` agents-md | `AGENTS.md`, `CLAUDE.md` |

After architecture rules, always run `npx @nextstage-brasil/harness sync`.

### Recommended order (when not using full prepare)

```
architecture-rules → harness sync → brownfield → reverse-spec → agents-md
```

Rationale: constitution first; context artifacts next; AGENTS.md last so it links to all outputs.
