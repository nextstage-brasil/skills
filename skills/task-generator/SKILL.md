---
name: task-generator
description: Transform atomic implementation work into rich task markdown files for backend and frontend layers with dependencies, estimates, and layer-specific checklists. Use during SDD planning when generating task-NNN-*.md from requirements features — not for E2E or unit test tasks (use specialized generators). Requires requirements.md. Output English task files under version tasks folder.
depends:
  - nextstage-harness
---

# Task Generator

Convert one atomic slice of a Feature into a detailed `task-NNN-slug.md` for engineers or coding agents.

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`. Load `{harness}/rules/*.mdc` for the task layer. Read `requirements.md` strictly — do not invent tables or endpoints.

## Scope

- **Layers:** Backend, Frontend, Infrastructure
- **Not this skill:** E2E → `e2e-test-generator`; Backend unit tests → `unit-test-task-generator`

## Golden rule

No one-line summaries. The implementer must know what to do, where (probable paths), which stack/rules apply, and validation criteria. Never repeat the summary verbatim in the detailed section.

## Inputs

- Atomic task description (from orchestrator)
- Layer type: Backend | Frontend | Infra
- `{product_root}/docs/versions/{version_san}/requirements.md`
- Task number `NNN` and dependency tasks

## Dependencies

- FK parents before children — task order reflects migration/API order
- Frontend consuming an API → backend task precedes frontend task
- See `references/task-schema.md` for full file template

## Classification

- **Error** — bug in existing feature
- **Improvement** — behavior change to existing feature
- **Implementation** — new feature

## Frontend extras

When task touches UI:

- **data-testid contract** — kebab-case, prefixed (`btn-`, `input-`, `form-`, etc.)
- Auth forms: marketing panel, PasswordInput, i18n keys per frontend rules when present
- i18n: all strings via translation keys; `useFormat()` for dates/currency
- Navigation: `groupKey` when adding menu items (if nav rules exist)

## Backend extras

When `uses_grogoo: false` (default): Sanctum, manual modules — no Grogoo references.

When multitenancy: explicit `company_id` / ownership validation in criteria.

## Output path

`{product_root}/docs/versions/{version_san}/tasks/task-NNN-slug.md`

For subversions: under `subversions/{subversion_san}/tasks/`.

## References

| File | When |
|------|------|
| `references/task-schema.md` | Full markdown template and header fields |

## Related skills

- `unit-test-task-generator` — after backend implementation tasks
- `e2e-test-generator` — after frontend tasks with UI
- `execution-handoff-generator` — after **all** tasks for the version are written (planning closure)
