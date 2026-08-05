# Rules sync

Canonical project rules: `{harness_root}/rules/*.md`. Adapters generated — prefer edit canonical or `harness add-rule`, then `npx @nextstage-brasil/harness sync`.

**Orphan Cursor rules:** hand-created `.cursor/rules/*.mdc` (Cursor UI) not in `manifest.rules` → next `harness sync` absorbs into canonical + manifest (maps `description` / `alwaysApply` / `globs`). Prefer canonical edits still; orphans safe. `sync --check` reports orphans as drift (no write).

## Layout

```
.nextstage-harness/
  README.md              # human guide — where to edit, how to add rules
  manifest.json          # adapter config (v1 schema) — rules + agents + subagents
  rules/
    architecture-rules.md   # constitution (always loaded)
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

| Agent                    | Reads skills from                                  | Harness sync                                                |
| ------------------------ | -------------------------------------------------- | ----------------------------------------------------------- |
| Cursor (incl. subagents) | `.agents/skills/` at project root                  | None — canonical path is enough                             |
| Claude Code              | `.claude/skills/` (not `.agents/skills/` natively) | Symlink `.agents/skills/{name}/` → `.claude/skills/{name}/` |

Cursor subagents spawned during a session use the same project skill catalog as the parent agent — no separate `.cursor/skills/` copy required.

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
      "name": "backend-rules",
      "canonical": "rules/backend-rules.md",
      "cursor": { "globs": "backend/**" },
      "claude": { "paths": ["backend/**"] }
    }
  ],
  "subagents": [
    {
      "name": "coder-agent",
      "skill": "ns-code-coder",
      "description": "(NS) Thin bridge to ns-code-coder…",
      "model": { "cursor": "composer-2.5[fast=false]", "claude": "sonnet" },
      "readonly": false
    }
  ]
}
```

| Field                   | Meaning                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                  | Base filename for adapters (`{name}.mdc` / `{name}.md`)                                                                                        |
| `canonical`             | Path relative to `{harness_root}/`                                                                                                             |
| `cursor.alwaysApply`    | Cursor always-on when `true`; default for `add-rule` is `false` (agent-requested via description). Mutually exclusive with `globs` when `true` |
| `cursor.globs`          | Cursor glob scope (path-scoped; do not combine with `alwaysApply: true`)                                                                       |
| `cursor.description`    | **Required** — Cursor "when to apply" header; sync fails if missing                                                                            |
| `claude.paths`          | Claude path scope array; `null` = global (omit `paths:` frontmatter)                                                                           |
| `subagents[].name`      | Adapter basename → `.cursor/agents/{name}.md`, `.claude/agents/{name}.md`                                                                      |
| `subagents[].canonical` | Path relative to `{harness_root}/` (default `agents/{name}.md`)                                                                                |
| `subagents[].skill`     | Installed skill the bridge loads                                                                                                               |
| `subagents[].model`     | **Project-owned** — `harness update` never overwrites                                                                                          |
| `subagents[].readonly`  | No write tools when `true` (reviewer default); filled from catalog if missing                                                                  |

### Default subagents (seeded when skill is installed)

| Name                | Skill                   | Default model (cursor / claude)               | `readonly` |
| ------------------- | ----------------------- | --------------------------------------------- | ---------- |
| `coder-agent`       | `ns-code-coder`         | `composer-2.5[fast=false]` / `sonnet`         | `false`    |
| `reviewer-agent`    | `ns-code-reviewer`      | `grok-4.5[effort=medium,fast=false]` / `opus` | `true`     |
| `task-writer-agent` | `ns-sdd-task-generator` | `composer-2.5[fast=false]` / `haiku`          | `false`    |

Presets that install those skills get matching bridges on `init` / `sync` / `update`. Each bridge body: read `AGENTS.md` → architecture rules → follow the skill. Seeded bridges = **required** dispatch targets when present — see `subagent-dispatch.md`.

After adding a new canonical rule file, add a matching entry to `manifest.json`, then run `sync`. Prefer:

```bash
npx @nextstage-brasil/harness add-rule <name> \
  --description "When this applies — e.g. NsUtil consumer constraints when editing ns-util-dependent code"
```

That creates the stub, sets `cursor.alwaysApply: false` (default) + `description` in the manifest, and syncs adapters. Pass `--always-apply` for always-on (e.g. constitution siblings that must load every session).

### Do not (broken Cursor adapters)

- Put YAML `alwaysApply` / `description` only in canonical `rules/*.md` — sync **strips** frontmatter; metadata must live in `manifest.json`.
- Register a rule in `manifest.json` without `cursor.description` and without `alwaysApply` or `globs` — `harness sync` fails; Cursor would otherwise get an empty apply mode.
- Expect hand-edits to a **registered** adapter to stick — next sync regenerates from canonical (orphans not in manifest are absorbed once, then managed).

## Adapter generation

`harness sync` (also runs at end of `harness init` when scaffold is enabled):

1. **Absorb orphans** — `.cursor/rules/*.mdc` whose basename is not in `manifest.rules`: write canonical body, map frontmatter → manifest (`description` required — default `Project rule: {name}`; `alwaysApply` preferred over `globs` if both; else `alwaysApply: false`), persist manifest. Skip names already registered (canonical wins).
2. Strip YAML frontmatter from canonical body before wrapping.
3. If canonical lacks body-only HTML hint, **write hint into canonical**.
4. Write `.cursor/rules/{name}.mdc` / `.claude/rules/{name}.md` with Cursor/Claude frontmatter + generation marker + body — **hint stripped** from adapter.
5. Embed `<!-- harness-sync:sha256=<hash> -->` for drift detection.
6. Symlink `.agents/skills/{name}/` → `.claude/skills/{name}/` when Claude Code is a target. Cursor uses `.agents/skills/` directly — legacy `.cursor/skills/` harness symlinks removed on sync.
7. Seed `manifest.subagents` for installed default skills (preserve `model`), ensure `agents/{name}.md`, write agent adapters.

Generation marker (first line of body):

```html
<!-- generated by @nextstage-brasil/harness sync — do not edit -->
```

## Commands

| Command                       | Behavior                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `harness add-rule <name>`     | Create stub + manifest entry + sync (`--description`, `--globs`, `--force`)                         |
| `harness add-subagent <name>` | Create canonical `agents/{name}.md` + manifest entry + sync (`--skill`, `--description`, `--force`) |
| `harness sync`                | Absorb orphan `.mdc` → regenerate rule adapters + Claude skill symlinks + subagent bridges          |
| `harness sync --check`        | CI mode — no writes; exit 1 on adapter drift **or** orphan `.mdc` not in manifest                   |

## Git policy

Commit canonical sources only:

- `.nextstage-harness/` (`rules/`, `agents/`, `manifest.json` including `subagents`)
- `.agents/skills/` and `skills-lock.json`
- `AGENTS.md`, `CLAUDE.md` (when present)

Generated adapters under `.cursor/rules/`, `.cursor/agents/`, and `.claude/` are **gitignored** — `harness sync` adds them to `.gitignore` on init/update. Regenerate after clone:

```bash
npx @nextstage-brasil/harness sync
```

Do not hand-edit registered adapter files long-term. Custom rules: `.nextstage-harness/rules/` / `harness add-rule`, or create in Cursor UI and run `harness sync` to absorb.

**CI:** run `harness sync` as smoke that canonical + manifest valid. Use `harness sync --check` after editing canonical to verify adapters match before commit.

## AGENTS.md sync marker

`AGENTS.md` may contain a managed block updated by sync:

```html
<!-- harness-sync-managed: last-sync=2026-07-07T12:00:00.000Z -->
```

Do not hand-edit registered adapters — lost on next sync.
