# UI contract extract

When version scope includes UI: **Specify** writes `docs/versions/{version_san}/ui-contract.md` from `source/` `ui-screen` sections (`requirements-generator.md`). Template: `templates/ui-contract.template.md`.

Skip file when no UI in scope. Clarify-Strict does **not** write this file.

## Extract

- One screen or modal group per section.
- Strings **verbatim** from `source/` **or** D2-registered layout SSoT (`reference-sources.md`, role `ui-layout`). Never invent empty-state / error strings. Missing copy + no registered SSoT = D1/D2 open — do not write filler.
- Elements: type, handler, copy, visibility rules.
- `data-testid`: kebab-case, prefixed (`btn-`, `input-`, `form-`, …) — same contract as `task-schema.md`. Derive from element role + screen slug; if source already names test ids, copy verbatim.

## Task grain

One screen or modal group = **one** frontend task when **≥6** elements (`task-generator.md`).

## Execution

UI task without this file when UI in scope = forbidden (`SKILL.md`). Unit checkpoint: every contract element + handler present; report divergence before next wave (`orchestrator.md`). Closure: `ns-reviewer` walks this file when present.
