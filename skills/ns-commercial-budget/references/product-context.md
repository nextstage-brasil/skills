# Product context boot (commercial budget)

Before clarifying or generating Features, align the free-form scope with **what the product already does** when context artifacts exist under `{product_root}/docs/context/`.

Produced by `ns-harness-prepare` / `ns-harness-codebase-reverse-spec` / `ns-harness-bootstrap-brownfield`. See `../ns-harness/references/artifact-layout.md`.

## When to run

Always after resolving `{product_root}` and **before** clarification questions (or before generate in quick mode). Skip only if `{product_root}/docs/context/` does not exist.

## Read order

1. **List** `{context_root}/` (`{product_root}/docs/context/`), including one level of subfolders.
2. **Prefer** `{context_root}/system-reverse-spec.agent.md` when present — agent-dense index (entities, use cases, rules, access, integrations).
3. Else read `{context_root}/system-reverse-spec.md` (human body) — skim entities, use cases, business rules, access, integrations relevant to the requested scope.
4. Read `{context_root}/brownfield-map.md` when present — modules/gaps that affect brownfield effort (do not duplicate stack prose).
5. Optionally skim `{context_root}/stack-confirmed.md` only if hours or assumptions need stack constraints already confirmed — do not turn stack into Features.

Do **not** invent missing reverse-spec content. Do **not** run `ns-harness-codebase-reverse-spec` from this skill unless the human explicitly asks.

## How to use for a sharper budget

Cross the human’s scope against the reverse-spec / map:

| Signal in context | Use in budget |
|-------------------|---------------|
| Entity / lifecycle already exists | Feature is **extend/reuse**, not greenfield create — note in description + hours premise |
| Use case / rule already covers part of the ask | Narrow Feature scope; avoid re-specifying as new capability |
| Access / roles documented | Reuse roles in acceptance criteria; do not invent new profiles |
| Integration already listed | Size as change to existing integration, not net-new connector (unless scope says new) |
| Negative rules / blocks | Reflect in acceptance criteria and Premissas |
| Gap / “validate with humans” | Promote to `[LACUNA: …]` if it blocks assertive sizing |
| Module absent from brownfield map | Higher uncertainty → `[ASSUMPTION: …]` or ask in clarification |

**Goal:** Features and hours reflect **delta on the known system**, not a blank-slate rewrite of documented behavior.

## Clarification interaction

- Do **not** re-ask what the reverse-spec or brownfield map already states.
- Prefer questions about **delta** (what this version changes/adds) and **team experience**.
- If context is missing: proceed with chat scope only; note in Premissas `[LACUNA: system-reverse-spec ausente em docs/context/]` (or equivalent) — still deliverable.

## Citations in the deliverable

In **Premissas / ressalvas**, list which context files were read (paths only). Do not paste large excerpts from the reverse-spec into the commercial budget.
