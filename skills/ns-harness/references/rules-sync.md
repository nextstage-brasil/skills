# Rules sync

Canonical: `.nextstage-harness/rules/*.md`. Adapters generated — edit canonical or `harness add-rule`, then `npx @nextstage-brasil/harness sync`.

**Orphan Cursor rules:** hand-created `.cursor/rules/*.mdc` not in `manifest.rules` — next `harness sync` absorbs into canonical + manifest (maps `description` / `alwaysApply` / `globs`). Prefer canonical edits; orphans safe. `sync --check` reports orphans as drift (no write).

## Layout

```
.nextstage-harness/
  README.md              # human guide — where to edit, how to add rules
  manifest.json          # adapter config (v1 schema) — rules + agents + subagents
  rules/
    architecture-rules.md   # constitution (always loaded)
    project-rules.md        # project-local settings (always loaded; human-edited)
    backend-rules.md        # optional layer rules
  agents/
    coder-agent.md          # canonical subagent body (edit here)
    reviewer-agent.md

.cursor/rules/*.mdc         # generated — Cursor rule adapter (orphans absorbed on sync)
.claude/rules/*.md          # generated — Claude Code rule adapter
.cursor/agents/*.md         # generated — Cursor subagent adapters
.claude/agents/*.md         # generated — Claude Code subagent adapters

.agents/skills/             # canonical — Skills CLI (Cursor reads here directly)
.claude/skills/             # symlinked — harness sync (Claude Code only)
```

**Agent skill discovery**

| Agent | Reads skills from | Harness sync |
| ----- | ----------------- | ------------ |
| Cursor (incl. subagents) | `.agents/skills/` at project root | None — canonical path enough |
| Claude Code | `.claude/skills/` (not `.agents/skills/` natively) | Symlink `.agents/skills/{name}/` → `.claude/skills/{name}/` |

Cursor subagents use same skill catalog as parent — no `.cursor/skills/` copy.

## Manifest schema (v1)

```json
{
  "version": 1,
  "agents": ["cursor", "claude-code"],
  "rules": [
    {
      "name": "architecture-rules",
      "canonical": "rules/architecture-rules.md",
      "cursor": {
        "alwaysApply": true,
        "description": "Technical constitution for AI agents"
      },
      "claude": { "paths": null }
    },
    {
      "name": "project-rules",
      "canonical": "rules/project-rules.md",
      "cursor": {
        "alwaysApply": true,
        "description": "Project-local rules for AI agents"
      },
      "claude": { "paths": null }
    },
    {
      "name": "backend-rules",
      "canonical": "rules/backend-rules.md",
      "cursor": { "globs": "backend/**" },
      "claude": { "paths": ["backend/**"] }
    }
  ],
  "subagents": [
    {
      "name": "coder-agent",
      "skill": "ns-coder",
      "description": "(NS) Thin bridge to ns-coder…",
      "model": { "cursor": "composer-2.5[fast=false]", "claude": "sonnet" },
      "readonly": false
    }
  ]
}
```

| Field | Meaning |
| ----- | ------- |
| `name` | Base filename for adapters (`{name}.mdc` / `{name}.md`) |
| `canonical` | Path relative to `.nextstage-harness/` |
| `cursor.alwaysApply` | Cursor always-on when `true`; default for `add-rule` is `false` (agent-requested via description). Mutually exclusive with `globs` when `true` |
| `cursor.globs` | Cursor glob scope (path-scoped; do not combine with `alwaysApply: true`) |
| `cursor.description` | **Required** — Cursor "when to apply" header; sync fails if missing |
| `claude.paths` | Claude path scope array; `null` = global (omit `paths:` frontmatter) |
| `subagents[].name` | Adapter basename → `.cursor/agents/{name}.md`, `.claude/agents/{name}.md` |
| `subagents[].canonical` | Path relative to `.nextstage-harness/` (default `agents/{name}.md`) |
| `subagents[].skill` | Installed skill bridge loads |
| `subagents[].model` | **Project-owned** — `harness update` never overwrites |
| `subagents[].readonly` | No write tools when `true` (reviewer default); filled from catalog if missing |

### Default subagents (seeded when skill installed)

| Name | Skill | Default model (cursor / claude) | `readonly` |
| ---- | ----- | ------------------------------- | ---------- |
| `coder-agent` | `ns-coder` | `composer-2.5[fast=false]` / `sonnet` | `false` |
| `reviewer-agent` | `ns-reviewer` | `grok-4.5[effort=medium,fast=false]` / `opus` | `true` |
| `task-writer-agent` | `ns-spec-driven` (`references/task-generator.md`) | `composer-2.5[fast=false]` / `haiku` | `false` |

Presets get bridges on `init` / `sync` / `update`. Bridge body: obey `AGENTS.md` (no tool-Read) → Session boot (`session-boot.md`) → skill. Seeded bridges = **required** dispatch when present — `subagent-dispatch.md`.

New canonical rule: manifest entry + `sync`. Prefer:

```bash
npx @nextstage-brasil/harness add-rule <name> \
  --description "When this applies — e.g. NsUtil consumer constraints when editing ns-util-dependent code"
```

Stub + `cursor.alwaysApply: false` (default) + `description`, syncs adapters. `--always-apply` for always-on siblings (rare).

### Do not (broken Cursor adapters)

- YAML `alwaysApply` / `description` only in canonical `rules/*.md` — sync **strips** frontmatter; metadata in `manifest.json`.
- Register rule without `cursor.description` + without `alwaysApply` or `globs` — sync fails.
- Expect hand-edits to **registered** adapter to stick — sync regenerates (orphans absorbed once, then managed).

## Adapter generation

`harness sync` (end of `harness init` when scaffold enabled):

1. **Absorb orphans** — `.cursor/rules/*.mdc` not in manifest: write canonical, map frontmatter → manifest (`description` required — default `Project rule: {name}`; `alwaysApply` over `globs` if both; else `alwaysApply: false`), persist. Skip registered names.
2. Strip YAML from canonical before wrap.
3. Missing body-only HTML hint: **write into canonical**.
4. Write `.cursor/rules/{name}.mdc` / `.claude/rules/{name}.md` — frontmatter + marker + body; **hint stripped** from adapter.
5. `<!-- harness-sync:sha256=<hash> -->` for drift.
6. Symlink `.agents/skills/{name}/` → `.claude/skills/{name}/` for Claude Code. Cursor uses `.agents/skills/` — legacy `.cursor/skills/` symlinks removed on sync.
7. Seed `manifest.subagents` (preserve `model`), ensure `agents/{name}.md`, write agent adapters.

Marker (first body line):

```html
<!-- generated by @nextstage-brasil/harness sync — do not edit -->
```

## Commands

| Command | Behavior |
| ------- | -------- |
| `harness add-rule <name>` | Stub + manifest + sync (`--description`, `--globs`, `--force`) |
| `harness add-subagent <name>` | Canonical `agents/{name}.md` + manifest + sync (`--skill`, `--description`, `--force`) |
| `harness sync` | Absorb orphan `.mdc` → rule adapters + Claude symlinks + subagent bridges |
| `harness sync --check` | CI — no writes; exit 1 on drift **or** orphan `.mdc` not in manifest |

## Git policy

Commit canonical only: `.nextstage-harness/` (`rules/`, `agents/`, `manifest.json` + `subagents`); `.agents/skills/` + `skills-lock.json`; `AGENTS.md`, `CLAUDE.md`.

Generated `.cursor/rules/`, `.cursor/agents/`, `.claude/` **gitignored** — `harness sync` adds to `.gitignore` on init/update. After clone:

```bash
npx @nextstage-brasil/harness sync
```

Don't hand-edit registered adapters long-term. Custom rules: `.nextstage-harness/rules/` / `harness add-rule`, or Cursor UI + `harness sync` to absorb.

**CI:** `harness sync` smoke; `harness sync --check` after canonical edits before commit.
