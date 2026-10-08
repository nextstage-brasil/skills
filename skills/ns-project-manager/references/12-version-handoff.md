# Version handoff — execution card (PM)

Version/epic-level handoff for execution. **Not** spec-driven task handoff. No task lines, tokens, or time estimates — those live in spec-driven `docs/versions/{version_san}/sdd/tasks/`.

## Distinct artifact — do not touch SDD handoff

`docs/versions/{version_san}/sdd/execution-handoff.md` = spec-driven SDD artifact. **Never** read or write it in this mode. One line in output if it exists: distinct from PM handoff below.

## Persist path

`docs/versions/{version_san}/pm/execution-handoff.md` only — see `references/pm-persist.md`.

## Router triggers

"card de versão", "handoff", "fecha a versão", "o que entregar para execução", "version card", "close the version".

## Prerequisites

Data from prior phases only — never invent:
- Phase 1: version identity, objective/OKR.
- Phase 2: scope in/out (if structured).
- Phase 3: DAG Mermaid, layer table, edges with reasons, critical path, reorder flags.
- Phase 4 (when exists): layer→sprint map.
- Phase 5 (when exists): P50/P85 dates.

Missing sprint map or forecast dates: field = `—`. Never fabricate.

**Decision gate.** Read `docs/versions/{version_san}/pm/decision-register.md` when present (`references/decision-coverage.md`). Any `open` / `assumed` decision or open `C-NN` conflict that blocks an in-scope capability means the card is **not ready for execution**:

- Say so in the first line of the output, with the blocking Q / C ids.
- Send the proposal batch for those items.
- Do not label the card "ready", "frozen" or "congelado".

No register and no PRD: run the coverage scan on the scope you have before filling the card.

## Workflow

1. Resolve `version_san` from user or `docs/versions/`.
2. If `docs/versions/{version_san}/sdd/execution-handoff.md` **or** legacy `docs/versions/{version_san}/execution-handoff.md` exists: one line — SDD artifact, not updated here. Never read, STOP-move, delete, read-for-merge, or treat as misplaced PM.
3. Load template `assets/version-handoff.template.md`.
4. Fill only from produced data; `—` for missing Phase 4/5 fields.
5. Layer status: `pending` default; `in_progress` / `done` only if human or tracker state provided.
6. Write `docs/versions/{version_san}/pm/execution-handoff.md` when persist enabled.

## Output

Filled handoff markdown matching template sections. Gate: "Confirm handoff card, or adjust scope/DAG before scheduling?"

## Behavioral constraints

- Generate only from existing phase outputs — no invented sprints, dates, or scope.
- Layer order always from Phase 3 DAG — never RICE-only order on dependent pipeline.
- No mutation of spec-driven `sdd/execution-handoff.md`.
- Execution never starts on open business decisions. Developers should receive decisions, not questions.
