# Harness installer guide

Objective reference for `@nextstage-brasil/harness` — what gets installed, how rules sync works, and post-install agent prompts.

## 1. What gets installed

```
{product_root}/
  AGENTS.md                         # entry pointer (human-edited)
  CLAUDE.md                         # stub @AGENTS.md (if missing)
  .nextstage-harness/               # CANONICAL — edit rules here
    README.md                       # Human guide (add/edit rules)
    manifest.json
    rules/
      architecture-rules.md
    docs/
  .cursor/rules/*.mdc               # GENERATED — Cursor rule adapters
  .claude/rules/*.md                # GENERATED — Claude Code rule adapters
  .agents/skills/                   # Installed skills (Skills CLI canonical; Cursor reads here)
  .claude/skills/ → symlink          # Claude Code skill adapters (harness sync)
  docs/context|specs|versions/      # SDD artifacts (.gitkeep in each)
```

**Rules:** edit `.nextstage-harness/rules/` → `harness sync` → `.cursor/rules/`, `.claude/rules/`. Prefer `harness add-rule <name>` for new rules (creates stub, updates `manifest.json`, syncs). See `.nextstage-harness/README.md`.

**Subagents:** edit `.nextstage-harness/agents/` → `harness sync` → `.cursor/agents/`, `.claude/agents/`. Prefer `harness add-subagent <name> --skill <id>` for new bridges. Example: `npx @nextstage-brasil/harness add-subagent investigator-agent --skill ns-code-investigator --description "Investigation bridge"`.

**Skills:** canonical in `.agents/skills/` (Skills CLI). **Cursor** (including subagents) discovers skills there directly. **Claude Code** reads `.claude/skills/` — `harness sync` symlinks from canonical when Claude is a target agent. Invoke via the Skills menu / slash (e.g. `/ns-code-coder`).

## 2. Commands

| Command | Description |
|---------|-------------|
| `npx @nextstage-brasil/harness` | Interactive init (default) |
| `harness init [options]` | Install skills + scaffold + sync |
| `harness prepare` | Print full brownfield prepare instructions (`/ns-harness-prepare`) |
| `harness sync` | Regenerate adapters + ensure `.dockerignore` / `.gitignore` harness blocks (create if missing) |
| `harness add-rule <name>` | Create canonical rule + manifest entry + sync |
| `harness add-subagent <name>` | Create canonical subagent + manifest entry + sync (`--skill` required) |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` from installed skills (no AI) |
| `harness agents-md --force` | Overwrite existing `AGENTS.md` |
| `harness sync --check` | Local mode — exit 1 if adapters on disk drift from canonical |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` |
| `harness migrate-rules --force` | Overwrite existing canonical |
| `harness uninstall` | Remove harness install (skills, adapters, scaffold; keeps `docs/`) |
| `harness uninstall --keep-agents-md` | Same, but keep `AGENTS.md` / `CLAUDE.md` |
| `harness list` | Presets and skill catalog |

### Flags

| Flag | Effect |
|------|--------|
| `--preset <name>` | `spec-driven` (default), `spec-driven-gitlab`, `project-manager`, `brownfield`, `full` |
| `--agent <name>` | Repeatable; default `cursor`, `claude-code` |
| `--yes`, `-y` | Non-interactive |
| `--no-scaffold` | Skills only — skip AGENTS.md and `.nextstage-harness/` |
| `--keep-agents-md` | With `uninstall`: keep `AGENTS.md` / `CLAUDE.md` |
| `--dir <path>` | Target project directory |
| `--source <path>` | Skills source override |
| `--description <text>` | With `add-rule` / `add-subagent`: short purpose |
| `--globs <patterns>` | With `add-rule`: comma-separated globs (not always-apply) |
| `--skill <id>` | With `add-subagent`: installed skill id (required; one per command) |
| `--force` | Overwrite existing (`migrate-rules`, `agents-md`, `add-rule`, `add-subagent`) |
| `--dry-run` | Show resolved plan without installing |

## 3. Install scenarios

### Greenfield (new project)

```bash
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Creates scaffold, stub `architecture-rules.md`, syncs adapters. Use `--preset spec-driven` for `ns-spec-driven` + workers (or `--preset brownfield` for prepare-only). Run `ns-harness-architecture-rules` in your agent when code exists.

### Brownfield (existing codebase)

```bash
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Same as greenfield — use `--preset brownfield` so `ns-harness-prepare` is installed. Follow post-install prompts and run `/ns-harness-prepare` in your agent (§10).

### Skills only (no harness scaffold)

```bash
npx skills add nextstage-brasil/skills --full-depth -y --skill ns-code-coder
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

## 8. Migration from legacy `.cursor/rules/`

For projects with existing `.cursor/rules/*.mdc` and no `.nextstage-harness/`:

```bash
npx @nextstage-brasil/harness migrate-rules
npx @nextstage-brasil/harness sync
git add .nextstage-harness/ .gitignore
```

`migrate-rules` extracts bodies, infers manifest entries from Cursor frontmatter, and runs sync. Existing canonical files are skipped unless `--force`.

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| Adapters missing after clone | Run `npx @nextstage-brasil/harness sync` |
| `sync --check` fails locally | Edit canonical under `.nextstage-harness/rules/`, run `sync`, commit harness + `.gitignore` only |
| Adapters missing after init | Run `harness sync` manually |
| Windows symlink issues | Use `harness init --copy` or Skills CLI `--copy` |
| Monorepo product folder | Set `--dir` to product root; `{product_root}` = that folder |
| Legacy skills reference `.cursor/rules/` | Run `migrate-rules`; skills use `{harness_root}` with legacy fallback |

## 10. Post-install agent prompts

Run these **in Cursor or Claude Code** after `harness init` (not auto-invoked by CLI).

### 10.0 Full prepare (recommended — brownfield preset)

**Skill:** `ns-harness-prepare` (`/ns-harness-prepare`)

**CLI check:**

```bash
npx @nextstage-brasil/harness prepare
```

**Prompt:**

```
Run full harness prepare for {product_root}.
```

**Chain (automatic, one session):**

1. `ns-harness-architecture-rules` → `.nextstage-harness/rules/architecture-rules.md`
2. `npx @nextstage-brasil/harness sync`
3. `ns-harness-bootstrap-brownfield` → `docs/context/brownfield-map.md`
4. `ns-harness-codebase-reverse-spec` → `docs/context/system-reverse-spec.md`
5. `ns-harness-agents-md` → `AGENTS.md` + `CLAUDE.md`

**Greenfield with no code yet:** skip until application code exists.

### 10.1 CLI AGENTS.md baseline (automatic on init)

`harness init` runs `harness agents-md` automatically. No AI — lists installed skills and layout from disk.

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force   # overwrite hand-edited file
```

**Output:** `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md` only)

Step 5 of `/ns-harness-prepare` refines this with project context.

### 10.2 Individual worker skills (optional)

Use when you need only one artifact:

| Skill | Output |
| ----- | ------ |
| `ns-harness-architecture-rules` | `.nextstage-harness/rules/architecture-rules.md` |
| `ns-harness-bootstrap-brownfield` | `docs/context/brownfield-map.md` |
| `ns-harness-codebase-reverse-spec` | `docs/context/system-reverse-spec.md` |
| `ns-harness-agents-md` | `AGENTS.md`, `CLAUDE.md` |

After architecture rules, always run `npx @nextstage-brasil/harness sync`.

### Recommended order (when not using ns-harness-prepare)

```
ns-harness-architecture-rules → harness sync → ns-harness-bootstrap-brownfield → ns-harness-codebase-reverse-spec → ns-harness-agents-md
```

Rationale: constitution first; context artifacts next; AGENTS.md last so it links to all outputs.
