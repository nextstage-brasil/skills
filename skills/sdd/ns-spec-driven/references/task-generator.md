# Task Generator

Convert one atomic Feature slice into detailed `task-NNN-slug.md` for engineers or coding agents.

Face (**MUST** spawn `task-writer-agent` when bridge exists — `../../../ns-harness/references/subagent-dispatch.md`). This file = worker body, not invite inline from `ns-spec-driven`.

## Session boot

See `../../../ns-harness/references/session-boot.md`. Load `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent. Read `requirements.md` strict — invent no tables or endpoints.

## Scope

- **Layers:** Backend, Frontend, Infrastructure
- **Then (MUST read, same `task-writer-agent` session):** after backend implementation tasks then `unit-test-task-generator.md`; after frontend UI tasks then `e2e-test-task-generator.md`

## Golden rule

No one-line summaries. Implementer must know what, where (probable paths), which stack/rules, validation criteria. Never repeat summary verbatim in detailed section.

## Inputs

- Atomic task description (from face)
- Layer type: Backend | Frontend | Infra
- `docs/versions/{version_san}/requirements.md`
- Task number `NNN` and dependency tasks

## Dependencies

- FK parents before children — task order reflects migration/API order
- Frontend consuming API then backend task precedes frontend task
- See `task-schema.md` for full file template

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

`docs/versions/{version_san}/tasks/task-NNN-slug.md`

For subversions: under `subversions/{subversion_san}/tasks/`.

## References

| File             | When                                     |
| ---------------- | ---------------------------------------- |
| `task-schema.md` | Full markdown template and header fields |

## Related

- `unit-test-task-generator.md` — after backend implementation tasks (**MUST** read)
- `e2e-test-task-generator.md` — after frontend tasks with UI (**MUST** read)
- `execution-handoff.md` — after **all** version tasks written (planning closure)
