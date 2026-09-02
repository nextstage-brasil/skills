# Task Generator

Convert Features into `task-NNN-slug.md`. Unit = **1 Feature × 1 impl layer = 1 implementation task** (+ capped test tasks — **Decomposition**).

Face (**MUST** spawn project agent `task-writer-agent` by exact name when bridge exists — adapter `model`, not parent inherit — `../../../ns-harness/references/subagent-dispatch.md`). This file = worker body, not invite inline from `ns-spec-driven`.

## Session boot

`../../../ns-harness/references/session-boot.md` steps 1–6 first; task-generator adds:

- Load **all** `.nextstage-harness/rules/*.md` marked **always-applicable** in harness `manifest.json`, plus layer rules for target layer.
- Load **agent-requested** rules when `manifest.json` `description` matches task scope (persistence, auth, tenancy, build). No manifest: scan `rules/*.md`; read files whose scope matches.
- Unread mandatory rules = **incomplete boot**. Do not pick stack default to fill gap.
- **Stack signals:** detected stack implies expected sibling rule — `../../../ns-harness/references/architecture-rules/stack-signals.md`. Rule present: load. Absent: ask or mark `needs-clarification` — never assume framework default.
- Legacy: `.cursor/rules/*.mdc` only if `.nextstage-harness/` absent.
- Read `requirements.md` strict — invent no tables or endpoints.

## Scope

- **Impl layers (this file):** Backend, Frontend, Infrastructure
- **Test layers (after impl):** unit-tests via `unit-test-task-generator.md`; e2e via `e2e-test-task-generator.md` — same Feature, separate tasks
- **Then (MUST read, same `task-writer-agent` session):** after backend implementation tasks then `unit-test-task-generator.md`; after frontend UI tasks then `e2e-test-task-generator.md`

## Golden rule

No one-line summaries. Implementer must know what, where (probable paths), stack/rules, validation. Never repeat summary verbatim in detailed section.

**Write paths:** `Files to create or modify` = **concrete repo-relative paths** (collision input for `delivery-units.md`). No globs, placeholders — `task-schema.md`. No extra **public** functions beyond spec operations (private helpers OK).

## Grounding (blocking)

Before card, every **named symbol** (class, command, helper, DTO, migration path) must be one of:

| Source | OK |
| ------ | -- |
| Named in version `source/` (cite anchor `Sx`) | Yes |
| Grep-confirmed in repo | Yes |
| Named in loaded rules | Yes |
| Listed under **New artifacts** with command that creates it | Yes |

Else: remove symbol or mark `needs-clarification`. Do not dispatch grounded-on-assumption cards.

**`intelligent_saas` chat grounding:** frontend symbols that call agent-api (`VITE_*` / `NEXT_PUBLIC_*` to runtime, LangGraph SDK import, `EventSource` to agent-api) = **not grounded** — mark `needs-clarification`; chat UI **MUST** cite Application routes only.

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
- Resolved `requirements.md` — `sdd/` first, else legacy version root (`artifact-layout.md` **Legacy path resolution**)
- Resolved `source/` + `spec-coverage.md` when present — refuse cards for unmapped mappable sections
- Resolved `ui-contract.md` when UI in scope
- **D1 on Contract:** `### Contract` still has `TBD` / `impl.` / `to be defined` / range in constant cell / limit adjectives (`short`, `generic`) and no premise cite: refuse / `needs-clarification`. Do not emit card.
- Task number `NNN` and dependency tasks

## Dependencies

- FK parents before children — task order reflects migration/API order
- Frontend consuming API then backend task precedes frontend task
- See `task-schema.md` for full file template

## Frontend extras

When task touches UI:

- **UI grain:** one screen or modal group = **one** task if **≥6** elements (`ui-contract.md`)
- **data-testid contract** — from `ui-contract.md` when present; else kebab-case, prefixed (`btn-`, `input-`, `form-`, etc.)
- Every card: **Source refs** header (`task-schema.md`)
- Auth forms: marketing panel, PasswordInput, i18n keys per frontend rules when present
- i18n: all strings via translation keys; `useFormat()` for dates/currency
- Navigation: `groupKey` when adding menu items (if nav rules exist)
- **Layout SSoT (when registered for screen):** `reference-sources.md` row `role: ui-layout`, or card cites `*-visual.md` → **Validation criteria** must include that SSoT's **Quick visual checklist** items (verbatim or equivalent DOM/surface checks). Prose like "copy the visual structure" is **not** a criterion.
- **`intelligent_saas` chat card:** `Files to create or modify` lists **Application** chat/SSE/resume/history endpoints only — never agent-api URLs, env, or SDK.
- **`intelligent_saas` forbidden on frontend card:** `VITE_*` / `NEXT_PUBLIC_*` pointing at agent-api; LangGraph SDK import in frontend; `EventSource` or fetch to agent runtime = `needs-clarification`, not dispatch.

## Backend extras

Persistence, auth, tenancy, clock, ID conventions from `architecture-rules.md` + mandatory project rules — **not** this file.

| Rule | Action |
| ---- | ------ |
| Name command, base class, helper | Only if seen in loaded rules or repo. Rules silent: mark `needs-clarification` — no default pick. |
| DTO/class for table | Must not invent when project builder/generator already produces that table. |
| Migration/builder in repo vs `requirements.md` snippet | Repo wins (types, nullability, timestamps). |
| Reusable pattern (raw SQL, upsert, custom repository) | Only when card cites existing repo file with same purpose. |
| `architecture-rules.md` conflict | Card wrong — fix before dispatch. Card never authorizes constitution violation. |

## Output path

`docs/versions/{version_san}/sdd/tasks/task-NNN-slug.md`

For subversions: under `subversions/{subversion_san}/tasks/`.

## References

| File             | When                                     |
| ---------------- | ---------------------------------------- |
| `task-schema.md` | Full markdown template and header fields |

## Related

- `unit-test-task-generator.md` — after backend implementation tasks (**MUST** read)
- `e2e-test-task-generator.md` — after frontend tasks with UI (**MUST** read)
- `execution-handoff.md` — after all tasks (+ Gate 4 + units only when required)
- `delivery-units.md` — only when Gate 4 requires (publish or parallel); see `gates.md`
