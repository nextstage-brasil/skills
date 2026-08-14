# Product context boot (commercial budget)

Before clarifying or generating Features, align the free-form scope with **what the product already does** when context artifacts exist under `docs/context/`.

Produced by brownfield reverse-spec when that workflow has been run (reverse-spec + brownfield map).

## When to run

Always after Session boot and **before** clarification questions (or before generate in quick mode). Skip only if `docs/context/` does not exist.

## Read order (mandatory when files exist)

**Existence = mandatory read.** Do not grep headers, skim, or skip body when an artifact is present. Skip this boot only when `docs/context/` does not exist.

1. **List** `docs/context/`, including one level of subfolders.
2. If `docs/context/system-reverse-spec.agent.md` **exists** → read it **in full** (entities, use cases, rules, access, integrations).
3. If `docs/context/system-reverse-spec.md` **exists** → read sections relevant to the requested scope (entities, use cases, business rules, access, integrations touched by the ask). When **only** the `.md` exists (no `.agent.md`), it is the complete source — read accordingly.
4. If `docs/context/brownfield-map.md` **exists** → read it **in full** — modules/gaps that affect brownfield effort (do not duplicate stack prose).
5. Optionally read `docs/context/stack-confirmed.md` only if hours or assumptions need stack constraints already confirmed — do not turn stack into Features.

Do **not** invent missing reverse-spec content. Do **not** run reverse-spec from this skill unless the human explicitly asks.

## Reuse inventory gate (before sizing)

When any context artifact from the read order above exists, build a **reuse inventory** (internal / maintainer chat — not a client-facing dump) **before** Features, FP, COSMIC CFP, or hours:

| Scope piece | Classification | Signal from reverse-spec / map |
|-------------|----------------|--------------------------------|
| {capability, entity, flow, integration…} | `reuse` \| `extend` \| `net-new` | {what the doc already covers} |

Rules:

- **Features:** prefer delta (`extend` / `reuse`); do not recreate documented capability as greenfield.
- **FP / CFP / hours:** discount documented reuse; hours premise must cite these signals.
- **Blocked:** do not advance to sizing without this inventory when context files were present.

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

In **Premissas / ressalvas**, state that the budget sizes **delta on a known product** (reuse applied) — not merely that context was "consulted". Do **not** dump file paths or technical excerpts for the client. Translate reverse-spec facts into **product language** (`references/product-voice.md`). Keep full paths and the reuse inventory table for the maintainer chat summary only if useful.
