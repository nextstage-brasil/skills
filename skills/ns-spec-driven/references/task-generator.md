# Task Generator

Convert Features into detailed `task-NNN-slug.md` for engineers or coding agents. Unit = **1 Feature × 1 impl layer = 1 implementation task** (+ capped test tasks — see **Decomposition**).

Face (**MUST** spawn `task-writer-agent` when bridge exists — `../../../ns-harness/references/subagent-dispatch.md`). This file = worker body, not invite inline from `ns-spec-driven`.

## Session boot

See `../../../ns-harness/references/session-boot.md`. Load `.nextstage-harness/rules/*.md`. Read `architecture-rules.md` first. Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent. Read `requirements.md` strict — invent no tables or endpoints.

## Scope

- **Impl layers (this file):** Backend, Frontend, Infrastructure
- **Test layers (after impl):** unit-tests via `unit-test-task-generator.md`; e2e via `e2e-test-task-generator.md` — same Feature, separate tasks
- **Then (MUST read, same `task-writer-agent` session):** after backend implementation tasks then `unit-test-task-generator.md`; after frontend UI tasks then `e2e-test-task-generator.md`

## Golden rule

No one-line summaries. Implementer must know what, where (probable paths), which stack/rules, validation criteria. Never repeat summary verbatim in detailed section.

## Decomposition

| Rule | Criteria |
| ---- | -------- |
| **Unit (impl)** | **1 Feature × 1 impl layer = 1 implementation task** — shippable in one worker session |
| **Unit (tests)** | Same Feature: **at most** 1 unit-HTTP task + 1 E2E task (via test generators) — do not further split those |
| **Split when** | \>~8 files; schema/migration and API/runtime share one task **and** FK parents must land before children in same worker (split migration task then API task); mixed impl layers |
| **Never split** | FormRequest / Service / Controller of same module; the capped unit-HTTP or E2E task for that Feature |
| **Merge when** | Task \<~2 files and same layer/module as neighbor |
| **`tasks est.`** | Count = impl tasks (Feature × layer) + test tasks — same unit partitioner uses for **4–7 tasks/slice** target |

No mega-task (whole Feature all layers). No one-task-per-class (FormRequest alone, Service alone).

## Inputs

- Feature + layer (from face / Gate 3 plan)
- Layer type: Backend | Frontend | Infra | unit-tests | e2e
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
