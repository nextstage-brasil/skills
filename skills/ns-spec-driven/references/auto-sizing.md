# Auto-sizing (Small / Medium / Large)

Classify every request **once** at session boot. Re-classify only if scope materially changes.

## Heuristics

| Signal | Size |
| ------ | ---- |
| One sentence, ≤3 files, no new domain concepts | **Small** |
| New feature, multiple components, needs acceptance criteria | **Medium** |
| Cross-cutting, multiple modules, slices, or compliance gates | **Large** |
| Existing version folder with requirements but no tasks | **Medium** (skip Clarify only if requirements solid **and** no open critical in `unknowns-register.md`) |
| Existing handoff with pending tasks | **Resume** (size from handoff, not re-plan) |
| User explicitly asks for full SDD / version doc | **Medium+** minimum |
| Dense source (contract/schema tables or ~8+ sections) | **Large** min; Consistency **mandatory** |

## Phase inclusion by size

| Phase | Small | Medium | Large |
| ----- | ----- | ------ | ----- |
| Clarify | Skip | **Yes** (skip only resume/solid-requirements per heuristic above) | **Yes** |
| Specify | Skip | Yes | Yes |
| Consistency | Skip | Skip (Yes if `source/` exists) | Yes (before tasks; **mandatory** if `source/`) |
| Partition | Skip | If multi-slice signaled | If scope spans independent slices |
| Tasks + handoff | Skip | Yes | Yes |
| Execute | Yes (`ns-coder`) | Yes | Yes |
| Close (review + living spec) | Optional | Yes | Yes |

## Safety valve

Stop informal execution. **Upgrade to Medium+** when:

- More than ~3 files will change without task file.
- Scope grows beyond original one-liner (new entities, integrations, migrations).
- User adds "also include…" that implies new bounded context.
- Inline steps exceed one focused coding session.

Action: pause coding. Read `requirements-generator.md` (and downstream references). Regenerate tasks and handoff. Resume execute.

## Version id

- Default: ask once or infer from user (`2.1`, `1.0.0`).
- Sanitize for paths: `2.1` stays `2.1`, `v1.0.0` becomes `1.0.0`.
- Reuse existing folder under `docs/versions/` when user points at it.
