# Migration guide — harness 1.x

`@nextstage-brasil/harness@0.n` does **not** read this catalog layout. Reinstall:

```bash
npx @nextstage-brasil/harness@1 init
npx @nextstage-brasil/harness@1 --preset spec-driven --yes
```

## What changed

1. **Flat layout** — all catalog skills at `skills/<name>/` (domain folders removed 2026-08-14 so cross-skill paths resolve after install).
2. **Renames** — category prefixes dropped (e.g. `ns-code-coder` → `ns-coder`).
3. **SDD pipeline consolidated** — seven internal workers plus unit/e2e test-task generators are now `references/` inside `ns-spec-driven`. Invoke only `/ns-spec-driven`.
4. **Business face consolidated** — `ns-commercial-budget`, `ns-delivery-schedule`, and `ns-requirements-enricher` are nested under `ns-project-manager/references/`. Invoke only `/ns-project-manager`.
5. **Presets** — declarative JSON in `presets/`; harness reads `presets/index.json` at runtime.
6. **`nsutil-mcp` removed** — not a catalog skill; generated in the application at use time.

## Rename map (install by new name)

| Old | New |
| --- | --- |
| `ns-code-coder` | `ns-coder` |
| `ns-code-reviewer` | `ns-reviewer` |
| `ns-code-investigator` | `ns-investigator` |
| `ns-code-autonomous` | `ns-autonomous` |
| `ns-sdd-living-spec-consolidator` | `ns-living-spec` |
| `ns-code-e2e-tests` | `ns-e2e-tests` |
| `ns-code-backend-tests` | `ns-backend-tests` |
| `ns-code-frontend-design` | `ns-frontend-design` |
| `ns-code-docs-writer` | `ns-docs-writer` |
| `ns-code-best-practices` | `ns-best-practices` |
| `ns-harness-agents-md` | `ns-harness` |
| `ns-harness-codebase-reverse-spec` | `ns-harness` |
| `ns-harness-architecture-rules` | `ns-harness` |
| `ns-harness-bootstrap-brownfield` | `ns-harness` |
| `ns-prepare` | `ns-harness` |
| `ns-pm-delivery-schedule` | `ns-project-manager` |

Retired SDD workers redirect to `ns-spec-driven` via `retired-skills.json`. Retired business skills redirect to `ns-project-manager`.

## Full history

See [`skills/_meta/MIGRATION.md`](skills/_meta/MIGRATION.md) for complete tables, path moves, and dependency notes.

## Manual peer install (until skills#861)

```bash
npx skills add nextstage-brasil/skills --skill ns-spec-driven --full-depth -y
npx skills add nextstage-brasil/skills --skill ns-coder --full-depth -y
```
