# Clarify Requirements

Entry shell for Clarify-Strict. Ambiguities **before** Specify. Doctrine: `clarify-strict.md`.

## Harness

`../../../ns-harness/references/session-boot.md` + `../../../ns-harness/references/artifact-layout.md`.

Stack/architecture questions = stack detection — not this phase.

## When to use

- Medium+ pipeline (Clarify **mandatory** — `auto-sizing.md`)
- Vague / incomplete scope; ambiguous terms
- First version without prior docs
- Resume with open critical unknowns (`session-continuity.md`) — re-enter here, not Specify
- Intake persisted `source/` — still run checklist vs inventory

Grain: version `docs/versions/{version_san}/`. Per-issue GitLab grill-me = `ns-requirements-enricher` (not this file).

## Workflow

### Step 0 — Brownfield gate (before analysis)

**Do not grep or explore application source** until this step completes.

1. Check `docs/context/brownfield-map.md`.
2. Detect brownfield signals: `backend/`, `frontend/`, `src/`, `app/`, or equivalent (not docs-only).
3. **Brownfield signals + map missing:**
   - Stop — no clarification questions yet.
   - Invoke **`/ns-harness`** `bootstrap-brownfield.md`; output `docs/context/brownfield-map.md`.
   - Tell user brownfield context required before refining scope.
   - Resume at **Step 0.4** once map exists.
4. **Greenfield** (no application code) — skip bootstrap; Step 1.
5. **Map already exists** — **Step 0.4** before any scope analysis.

#### Step 0.4 — Brownfield refresh gate (mandatory human confirmation)

**Stop. No Step 1 until human replies.**

1. Read `docs/context/brownfield-map.md`.
2. Extract map date from `**Date:**` header. Absent → `date unknown`.
3. Present gate in **natural chat** (conversation language; English template below). No phase jargon, `Reply:`, telegraphic dumps. See `human-communication.md`.

```
There's already a codebase map at docs/context/brownfield-map.md
(last updated {date from file, or "date unknown"}).

Want me to re-scan the repo and update it, or keep this one and move on to scope questions?

- refresh — re-scan and update the map
- keep — use the map as-is
```

4. **Wait for explicit reply.** Valid: `refresh` / `keep` (or clear natural equivalent).
5. **Never assume** `keep` (recent map, urgency, pasted spec).
6. On **`refresh`:** `/ns-harness` `bootstrap-brownfield.md` (update in place), then Step 1 with new map.
7. On **`keep`:** note human accepted map date `{date}`; Step 1 with existing file.
8. Ambiguous reply: ask once more — no Step 1 until `refresh` or `keep` clear.

Also read `docs/context/system-reverse-spec.agent.md` when present (prefer over prose); else `system-reverse-spec.md` after gate.

Allowed reads before Step 1 (brownfield): user scope, `brownfield-map.md`, reverse-spec pair, `.nextstage-harness/rules/architecture-rules.md`, `docs/versions/{version_san}/` for active version (incl. `source/`).

**Forbidden before Step 1:** ad-hoc grep in `backend/` / `frontend/` / `src/` to "reduce ambiguity"; skip Step 0.4 when map exists.

### Step 1 — Analyze raw scope

Read user description, brownfield (if Step 0), Intake `source/` if present (`source-registry.md`). Flag gaps vs **blocking category checklist** in `clarify-strict.md` (actors/permissions; states/transitions; payload type+nullability; error/rejection matrix; pagination/limits/constants; UI; integration/auth; persistence/migration; out-of-scope; NFRs; test evidence).

Brownfield map = **what exists** — ask only **what this version changes or adds**. Derive questions from source inventory + unclassified/thin sections.

### Step 2 — Ask questions

Load `clarify-strict.md`. Category checklist drives questions. Multi-round until **critical unknowns = 0**. **5 questions** = per-round grouping guideline, not cap. Sensitive items need round-trip confirm. Silence / `proceed` / `quick mode` / `assume` / `pode seguir` ≠ confirmation. **`Tudo sim` / `all yes`** = yes on remaining yes/no confirms only (not open questions).

Plain language, numbered, self-contained — conversational, not form. Never "before Clarify/Specify" — name next deliverable.

Present (adapt language). **Must** number every ask `1.`, `2.`, … in one sequence (open questions then sensitive confirms). Tell human they may reply by number only.

```
A few open points before we lock the version inputs:

1. [observable-behavior question]
2. [next]
3. Confirm: page starts at 1 and size is 300? (yes/no)

Reply by number, e.g. 1: agency of the key only  2: block like failed login  3: yes
Tudo sim / all yes = yes on remaining yes/no confirms only.
```

### Step 3 — Write contracts, stop at Gate 0

After answers (or `skip clarify` escape in `clarify-strict.md`):

1. Write `docs/versions/{version_san}/clarify-contract.md` + `unknowns-register.md` from templates.
2. Assumed items = premises **with impact** in clarify-contract. Waivers quoted in unknowns-register.
3. **Stop.** Gate 0 (`gates.md` `requirements_inputs_confirmed`). Do **not** write `requirements.md`. Do **not** ask "write the requirements document" until Gate 0 passes.

### Step 4 — Hand off to Specify

Only after Gate 0 pass (`gates.md`: `(critical unknowns = 0 AND explicit Gate 0 human confirm) OR recorded skip-clarify waiver`). Pass `clarify-contract.md` + `unknowns-register.md` + `source/` into `requirements-generator.md`.

## Critical rules

- **Brownfield without map:** `/ns-harness` `bootstrap-brownfield.md` first — never skip via codebase grep
- **Brownfield with map:** Step 0.4 mandatory — show date; wait `refresh` or `keep`
- **Human chat:** natural language; deliverables not phase names; never caveman-compress chat
- **No one-round cap** — no "document reasonable assumptions" without premises + impact
- **No `requirements.md`** in this workflow
- **No stack/architecture questions**
- `"don't know"` on critical: keep unknown **or** premise with impact after human accept — never silent smallest-scope fill
- `skip clarify`: waiver path in `clarify-strict.md`

## Integration

1. Planning start. Brownfield + no map: `/ns-harness` `bootstrap-brownfield`.
2. Brownfield refresh gate. Intake (`source/`). `clarify-strict`. Gate 0.
3. Gate 0 pass: `requirements-generator`. Gate 1.

## Related

- `clarify-strict.md` — checklist, rounds, escape
- `/ns-harness` `bootstrap-brownfield.md` — map missing + code exists
- `requirements-generator.md` — after Gate 0
- `/ns-harness` `architecture-rules-generator.md` — constitution stub (separate)
- `/ns-requirements-enricher` — per-issue GitLab grill-me. This file = **version** Clarify-Strict. No GitLab comments here.
