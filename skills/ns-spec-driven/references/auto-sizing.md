# Auto-sizing (Small / Medium / Large)

Classify every request **once** at session boot. Re-classify only if scope materially changes.

## Heuristics

| Signal | Size |
| ------ | ---- |
| One sentence, ≤3 files, no new domain concepts | **Small** |
| New feature, multiple components, needs acceptance criteria | **Medium** |
| Cross-cutting, multiple modules, slices, or compliance gates | **Large** |
| Existing version folder with requirements but no tasks | **Medium** (skip clarify if requirements solid) |
| Existing handoff with pending tasks | **Resume** (size from handoff, not re-plan) |
| User explicitly asks for full SDD / version doc | **Medium+** minimum |

## Phase inclusion by size

| Phase | Small | Medium | Large |
| ----- | ----- | ------ | ----- |
| Clarify | Skip | If ambiguous | If ambiguous |
| Specify | Skip | Yes | Yes |
| Consistency | Skip | Skip | Yes (before tasks) |
| Partition | Skip | If multi-slice signaled | If scope spans independent slices |
| Tasks + handoff | Skip | Yes | Yes |
| Execute | Yes (`ns-coder`) | Yes | Yes |
| Close (review + living spec) | Optional | Yes | Yes |

## Safety valve

Stop informal execution and **upgrade to Medium+** when:

- More than ~3 files will change without task file.
- Scope grows beyond original one-liner (new entities, integrations, migrations).
- User adds "also include…" that implies new bounded context.
- Inline steps exceed one focused coding session.

Action: pause coding → read `requirements-generator.md` (and downstream references) → regenerate tasks and handoff → resume execute.

## Version id

- Default: ask once or infer from user (`2.1`, `1.0.0`).
- Sanitize for paths: `2.1` → `2.1`, `v1.0.0` → `1.0.0`.
- Reuse existing folder under `docs/versions/` when user points at it.
