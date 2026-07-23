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
  .agents/skills/                   # Installed skills (Skills CLI canonical)
  .cursor/skills/ → symlink          # Cursor skill adapters (harness sync)
  .claude/skills/ → symlink          # Claude skill adapters (harness sync)
  .agents/docs/                     # Optional agent-oriented notes
  docs/context|specs|versions/      # SDD artifacts
```

**Rules:** edit `.nextstage-harness/rules/` → `harness sync` → `.cursor/rules/`, `.claude/rules/`. Prefer `harness add-rule <name>` for new rules (creates stub, updates `manifest.json`, syncs). See `.nextstage-harness/README.md`.

**Skills:** canonical in `.agents/skills/` (Skills CLI). `harness sync` also symlinks to `.cursor/skills/` and `.claude/skills/` so Cursor discovers them in `/` (Skills CLI omits this for Cursor as a "universal" agent). Invoke via the Skills menu / slash (e.g. `/code-coder`).

## 2. Commands

| Command | Description |
|---------|-------------|
| `npx @nextstage-brasil/harness` | Interactive init (default) |
| `harness init [options]` | Install skills + scaffold + sync |
| `harness prepare` | Print full brownfield prepare instructions (`/harness-prepare`) |
| `harness sync` | Regenerate rule and skill adapters from canonical |
| `harness add-rule <name>` | Create canonical rule + manifest entry + sync |
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
| `--dir <path>` | Target project directory |
| `--source <path>` | Skills source override |
| `--description <text>` | With `add-rule`: short purpose |
| `--globs <patterns>` | With `add-rule`: comma-separated globs (not always-apply) |
| `--force` | Overwrite existing (`migrate-rules`, `agents-md`, `add-rule`) |
| `--dry-run` | Show resolved plan without installing |

## 3. Install scenarios

### Greenfield (new project)

```bash
npx @nextstage-brasil/harness --preset recommended --yes
```

Creates scaffold, stub `architecture-rules.md`, syncs adapters. Run `harness-architecture-rules` in your agent when code exists.

### Brownfield (existing codebase)

```bash
npx @nextstage-brasil/harness --preset brownfield --yes
```

Same scaffold plus brownfield skills. Follow post-install prompts (§10).

### Skills only (no harness scaffold)

```bash
npx skills add nextstage-brasil/skills --full-depth -y --skill code-coder
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

### Skills

| Path | Role | Edit? |
|------|------|-------|
| `.agents/skills/<name>/` | Canonical skills (Skills CLI) | **Yes** |
| `.cursor/skills/<name>/` | Cursor skill adapter | No — symlink |
| `.claude/skills/<name>/` | Claude Code skill adapter | No — symlink |

## 5. Cursor vs Claude

| Agent | Loads automatically | Adapter locations |
|-------|---------------------|-------------------|
| Cursor | `.cursor/rules/*.mdc`, `.cursor/skills/` | `.cursor/rules/`, `.cursor/skills/` |
| Claude Code | `.claude/rules/*.md`, `.claude/skills/` | `.claude/rules/`, `.claude/skills/` |

Both read the same canonical bodies from `.nextstage-harness/rules/` (rules) and `.agents/skills/` (skills). Rule adapters are generated files; skill adapters are symlinks to canonical (copies with `--copy`).

## 6. Git policy

Commit:

- `.nextstage-harness/` (canonical rules + manifest)
- `.cursor/rules/`, `.claude/rules/` (generated rule adapters)
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

### 10.0 Full prepare (recommended — brownfield preset)

**Skill:** `harness-prepare` (`/harness-prepare`)

**CLI check:**

```bash
npx @nextstage-brasil/harness prepare
```

**Prompt:**

```
Run full harness prepare for {product_root}.
```

**Chain (automatic, one session):**

1. `harness-architecture-rules` → `.nextstage-harness/rules/architecture-rules.md`
2. `npx @nextstage-brasil/harness sync`
3. `harness-bootstrap-brownfield` → `docs/context/brownfield-map.md`
4. `harness-codebase-reverse-spec` → `docs/context/system-reverse-spec.md`
5. `harness-agents-md` → `AGENTS.md` + `CLAUDE.md`

**Greenfield with no code yet:** skip until application code exists.

### 10.1 CLI AGENTS.md baseline (automatic on init)

`harness init` runs `harness agents-md` automatically. No AI — lists installed skills and layout from disk.

```bash
npx @nextstage-brasil/harness agents-md
npx @nextstage-brasil/harness agents-md --force   # overwrite hand-edited file
```

**Output:** `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md` only)

Step 5 of `/harness-prepare` refines this with project context.

### 10.2 Individual worker skills (optional)

Use when you need only one artifact:

| Skill | Output |
| ----- | ------ |
| `harness-architecture-rules` | `.nextstage-harness/rules/architecture-rules.md` |
| `harness-bootstrap-brownfield` | `docs/context/brownfield-map.md` |
| `harness-codebase-reverse-spec` | `docs/context/system-reverse-spec.md` |
| `harness-agents-md` | `AGENTS.md`, `CLAUDE.md` |

After architecture rules, always run `npx @nextstage-brasil/harness sync`.

### Recommended order (when not using harness-prepare)

```
harness-architecture-rules → harness sync → harness-bootstrap-brownfield → harness-codebase-reverse-spec → harness-agents-md
```

Rationale: constitution first; context artifacts next; AGENTS.md last so it links to all outputs.
