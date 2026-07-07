# Harness installer guide

Objective reference for `@nextstage-brasil/harness` — what gets installed, how rules sync works, and post-install agent prompts.

## 1. What gets installed

```
{product_root}/
  AGENTS.md                         # entry pointer (human-edited)
  CLAUDE.md                         # stub @AGENTS.md (if missing)
  .nextstage-harness/               # CANONICAL — edit rules here
    manifest.json
    rules/
      architecture-rules.md
    docs/
  .cursor/rules/*.mdc               # GENERATED — Cursor rule adapters
  .claude/rules/*.md                # GENERATED — Claude Code rule adapters
  .agents/skills/                   # Skills CLI (unchanged)
  .cursor/skills/ → symlink
  .claude/skills/ → symlink
  .agents/agents/                   # CANONICAL — agent personas (edit here)
  .cursor/agents/*.md → symlink     # Cursor subagents
  .claude/agents/*.md → symlink      # Claude Code subagents
  docs/context|specs|versions/      # SDD artifacts
```

**Rules:** edit `.nextstage-harness/rules/` → `harness sync` → `.cursor/rules/`, `.claude/rules/`.

**Personas (subagents):** edit `.agents/agents/` → `harness sync` → symlinks in `.cursor/agents/`, `.claude/agents/` (or copies with `--copy`).

## 2. Commands

| Command | Description |
|---------|-------------|
| `npx @nextstage-brasil/harness` | Interactive init (default) |
| `harness init [options]` | Install skills + scaffold + sync |
| `harness sync` | Regenerate rule and agent adapters from canonical |
| `harness agents-md` | Generate `AGENTS.md` + `CLAUDE.md` from installed skills (no AI) |
| `harness agents-md --force` | Overwrite existing `AGENTS.md` |
| `harness sync --check` | CI mode — exit 1 on adapter drift |
| `harness migrate-rules` | Import legacy `.cursor/rules/*.mdc` |
| `harness migrate-rules --force` | Overwrite existing canonical |
| `harness list` | Presets and skill catalog |

### Flags

| Flag | Effect |
|------|--------|
| `--preset <name>` | `recommended`, `gitlab`, `brownfield`, `implementation` |
| `--agent <name>` | Repeatable; default `cursor`, `claude-code` |
| `--yes`, `-y` | Non-interactive |
| `--no-scaffold` | Skills only — skip AGENTS.md and `.nextstage-harness/` |
| `--no-agents` | Skip persona install and adapter sync |
| `--dir <path>` | Target project directory |
| `--source <path>` | Skills source override |
| `--dry-run` | Show resolved plan without installing |

## 3. Install scenarios

### Greenfield (new project)

```bash
npx @nextstage-brasil/harness --preset recommended --yes
```

Creates scaffold, stub `architecture-rules.md`, syncs adapters. Run `architecture-rules-generator` in your agent when code exists.

### Brownfield (existing codebase)

```bash
npx @nextstage-brasil/harness --preset brownfield --yes
```

Same scaffold plus brownfield skills. Follow post-install prompts (§10).

### Skills only (no harness scaffold)

```bash
npx skills add nextstage-brasil/skills --full-depth -y --skill coder
```

Skills install under `.agents/skills/` with agent symlinks. No `.nextstage-harness/` unless you run `harness init` without `--no-scaffold`.

### Refresh after editing canonical rules

```bash
npx @nextstage-brasil/harness sync
git add .nextstage-harness/ .cursor/rules/ .claude/rules/
git commit -m "chore: sync agent rule adapters"
```

## 4. The three paths explained

### Rules

| Path | Role | Edit? |
|------|------|-------|
| `.nextstage-harness/rules/*.md` | Canonical project rules | **Yes** |
| `.cursor/rules/*.mdc` | Cursor rule adapter | No — generated |
| `.claude/rules/*.md` | Claude Code rule adapter | No — generated |

### Agent personas (subagents)

| Path | Role | Edit? |
|------|------|-------|
| `.agents/agents/*.md` | Canonical personas | **Yes** |
| `.cursor/agents/*.md` | Cursor subagents | No — symlink to canonical |
| `.claude/agents/*.md` | Claude Code subagents | No — symlink to canonical |

Cursor and Claude **do not** read `.agents/agents/` for subagent discovery — they load `.cursor/agents/` and `.claude/agents/` respectively. `harness init` and `harness sync` create symlinks (or copies with `--copy`).

## 5. Cursor vs Claude

| Agent | Loads automatically | Adapter locations |
|-------|---------------------|-------------------|
| Cursor | `.cursor/rules/*.mdc`, `.cursor/agents/*.md` | `.cursor/rules/`, `.cursor/agents/` |
| Claude Code | `.claude/rules/*.md`, `.claude/agents/*.md` | `.claude/rules/`, `.claude/agents/` |

Both read the same canonical body from `.nextstage-harness/rules/` (rules) and `.agents/agents/` (personas). Rule adapters are generated files; persona adapters are symlinks to canonical (copies with `--copy`).

Skills load from `.agents/skills/` with symlinks to `.cursor/skills/` and `.claude/skills/` (default agents on init).

### Which personas install?

Matching depends on installed skills (see `packages/harness/src/agentPersonas.js`):

| Persona | Installs when skill present |
|---------|----------------------------|
| `code-coder` | `coder` or `execute-gitlab-issue` |
| `code-reviewer` | `code-reviewer` |
| `code-investigator` | `code-investigator` |
| `execution-orchestrator` | `execution-orchestrator` or `version-partitioner` |

Invoke in Cursor/Claude: `agent: code-coder`, delegate to subagent by name, etc.

## 6. Git policy

Commit:

- `.nextstage-harness/` (canonical rules + manifest)
- `.cursor/rules/`, `.claude/rules/` (generated rule adapters)
- `.agents/agents/`, `.cursor/agents/`, `.claude/agents/` (canonical personas + generated subagent adapters)
- `.agents/skills/` and `skills-lock.json` (Skills CLI)
- `AGENTS.md`, `CLAUDE.md` (if present)

Do not commit adapter-only edits without updating canonical and re-running `sync`.

## 7. CI

Add to your pipeline when harness is installed:

```bash
npx @nextstage-brasil/harness sync --check
```

Fails if someone edited `.cursor/rules/` or `.claude/rules/` without syncing from canonical.

## 8. Migration from legacy `.cursor/rules/`

For projects with existing `.cursor/rules/*.mdc` and no `.nextstage-harness/`:

```bash
npx @nextstage-brasil/harness migrate-rules
npx @nextstage-brasil/harness sync --check
git add .nextstage-harness/ .cursor/rules/ .claude/rules/
```

`migrate-rules` extracts bodies, infers manifest entries from Cursor frontmatter, and runs sync. Existing canonical files are skipped unless `--force`.

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| `sync --check` fails in CI | Edit canonical under `.nextstage-harness/rules/`, run `sync`, commit adapters |
| Adapters missing after init | Run `harness sync` manually |
| Windows symlink issues | Use `harness init --copy` or Skills CLI `--copy` |
| Monorepo product folder | Set `--dir` to product root; `{product_root}` = that folder |
| Legacy skills reference `.cursor/rules/` | Run `migrate-rules`; skills use `{harness_root}` with legacy fallback |

## 10. Post-install agent prompts

Run these **in Cursor or Claude Code** after `harness init` (not auto-invoked by CLI).

### 10.0 Project AGENTS.md (CLI — automatic on init)

`harness init` runs `harness agents-md` automatically. No AI — lists installed skills, personas, and layout from disk.

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force   # overwrite hand-edited file
```

**Output:** `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md` only)

**Optional refine (brownfield / monorepo):** skill `agents-md-generator` — project-specific prose and conventions.

### 10.1 Architecture rules (technical constitution)

**Skill:** `architecture-rules-generator`

**Prompt:**

```
Scan this codebase and generate architecture-rules.md for {product_root}. Then run harness sync.
```

**Output:** `.nextstage-harness/rules/architecture-rules.md`

**Then:**

```bash
npx @nextstage-brasil/harness sync
```

### 10.2 Brownfield map (brownfield preset only)

**Skill:** `bootstrap-brownfield`

**Prompt:**

```
Bootstrap brownfield analysis for {product_root} before we plan version 1.0.
```

**Output:** `docs/context/brownfield-map.md`

### 10.3 Business reverse spec (optional)

**Skill:** `codebase-reverse-spec`

**Prompt:**

```
Reverse-engineer this codebase into a technology-agnostic system description. Save to docs/context/system-reverse-spec.md
```

**Output:** `docs/context/system-reverse-spec.md`

### Recommended order (existing codebases)

```
architecture-rules-generator → bootstrap-brownfield → codebase-reverse-spec → clarify-requirements
```

Rationale: CLI already wrote baseline `AGENTS.md` on init; constitution next; then stack map and business spec.

**Greenfield with no code yet:** skip §10.1–10.3 until you have a codebase to scan.
