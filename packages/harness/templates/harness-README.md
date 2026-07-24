# NextStage harness

Canonical project rules for AI agents. Edit here — not under `.cursor/` or `.claude/`.

## Layout

| Path | Role |
|------|------|
| `rules/*.md` | Rule bodies — edit these |
| `manifest.json` | Registers rules for `harness sync` |

Generated adapters (do not edit):

- `.cursor/rules/*.mdc`
- `.claude/rules/*.md`

## Add a rule

```bash
npx @nextstage-brasil/harness add-rule my-rule --description "Short purpose"
```

Scoped to file globs instead of always-on:

```bash
npx @nextstage-brasil/harness add-rule api-conventions --globs "apps/**/*.ts" --description "API conventions"
```

This creates `rules/<name>.md`, updates `manifest.json`, and runs sync.

## Edit a rule

1. Edit `rules/<name>.md` (and `manifest.json` only if description / globs / alwaysApply change).
2. Run:

```bash
npx @nextstage-brasil/harness sync
```

## Skills

| Create / edit | Path |
|---------------|------|
| Skills | `.agents/skills/<name>/` |

Install catalog skills with `npx skills add` or `harness init`. For full brownfield onboarding after init, run `/harness-prepare` in your agent (or `npx @nextstage-brasil/harness prepare` for instructions).

Then run `harness sync` so Claude Code skill adapters stay in sync. Cursor reads `.agents/skills/` directly.

## Mental model

- **Truth:** `.nextstage-harness/` (rules) and `.agents/skills/`
- **Mirrors:** `.cursor/` and `.claude/` — generated or symlinked
