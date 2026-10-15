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

Grain: version `docs/versions/{version_san}/sdd/`. Per-issue GitLab grill-me = `ns-requirements-enricher` (not this file).

## Workflow

### Step 0 — Brownfield gate (before analysis)

**Code-read ban** ends when Step 0.4 resolves (`auto-keep` | `keep` | `refresh`). Until then: do not grep or explore application source. Greenfield (no application code): no ban.

1. Check `docs/context/brownfield-map.md`.
2. Detect brownfield signals: `backend/`, `frontend/`, `src/`, `app/`, or equivalent (not docs-only).
3. **Brownfield signals + map missing:**
   - Stop — no clarification questions yet.
   - Invoke **`/ns-harness`** `bootstrap-brownfield.md`; output `docs/context/brownfield-map.md`.
   - Tell user brownfield context required before refining scope.
   - Resume at **Step 0.4** once map exists.
4. **Greenfield** (no application code) — skip bootstrap; Step 1.
5. **Map already exists** — **Step 0.4** before any scope analysis.

#### Step 0.4 — Brownfield refresh gate

Runs before Step 1 when map exists. Human halt **only** when freshness unproven.

**Clock:** never `**Date:**`; never `git log --after=YYYY-MM-DD` (midnight; same-day commits look newer than header).
- Map **clean** vs HEAD (`git status --porcelain --no-optional-locks -- docs/context/brownfield-map.md` empty): clock = `git log -1 --format=%ct -- docs/context/brownfield-map.md` (clone/checkout resets file mtime; git commit time is the real clock).
- Map **dirty/untracked**: clock = filesystem mtime epoch seconds (`date -r docs/context/brownfield-map.md +%s`). Fresh rewrite after same-day commits still auto-keeps.

1. Read `docs/context/brownfield-map.md`. Extract `**Date:**`. Absent → date unknown.
2. App pathspecs = brownfield signal dirs that exist: `backend/`, `frontend/`, `src/`, `app/` (same as Step 0). None exist → repo root excluding `docs/` (`. ':!docs'`).
3. Readonly git only. No content grep of application source.
   - Stale if `git log -1 --format=%ct -- <pathspecs>` greater than clock.
   - Stale if `git status --porcelain --no-optional-locks -- <pathspecs>` non-empty (dirty or untracked under those pathspecs).
4. **Auto-keep** (do not wait) only when ALL true: Date header present, git succeeds, clock resolved (non-empty `%ct` or successful `date -r`), not stale, app pathspecs clean. Chat: one natural sentence (conversation language) that the map dated `{date}` matches the current code, then Step 1. Record gate `auto-keep`.
5. **Ask** (template below) and wait when ANY: date unknown, not a git repo, git command fails, clock unresolved (empty `%ct` or `date -r` failure — gitignored / never-committed map), stale commits, dirty/untracked app pathspecs. Never assume `keep` from urgency, pasted spec, or recent Date header alone.

```
There's already a codebase map at docs/context/brownfield-map.md
(last updated {date from file, or "date unknown"}).

Want me to re-scan the repo and update it, or keep this one and move on to scope questions?

- refresh — re-scan and update the map
- keep — use the map as-is
```

6. On **`refresh`:** `/ns-harness` `bootstrap-brownfield.md` (update in place), then Step 1 with new map.
7. On **`keep`:** note human accepted map date `{date}`; Step 1 with existing file.
8. Ambiguous reply: ask once more — no Step 1 until `refresh` or `keep` clear.

Also read `docs/context/system-reverse-spec.agent.md` when present (prefer over prose); else `system-reverse-spec.md` after gate.

Allowed reads before Step 1 (brownfield): user scope, `brownfield-map.md`, reverse-spec pair, `.nextstage-harness/rules/architecture-rules.md`, `docs/versions/{version_san}/sdd/` for active version (incl. `source/`).

**Forbidden before Step 1:** ad-hoc grep in application source to reduce ambiguity or decide freshness; skip Step 0.4 when map exists. Git `log`/`status` on app pathspecs allowed. No product-path special-case — map is repo context.

### Step 1 — Analyze raw scope

Read user description, brownfield (if Step 0), Intake `source/` if present (`source-registry.md`). Flag gaps vs **blocking category checklist** in `clarify-strict.md` (actors/permissions; states/transitions; payload type+nullability; error/rejection matrix; pagination/limits/constants; UI; integration/auth; persistence/migration; out-of-scope; NFRs; test evidence).

Brownfield map = **what exists** — ask only **what this version changes or adds**. Derive questions from source inventory + unclassified/thin sections.

**Reuse claim:** open that application path and run **D4** (`clarify-strict.md`) before Gate 0. Map text ≠ path evidence.

### Step 2 — Ask questions

Load `clarify-strict.md`. Category checklist drives questions. Multi-round until **critical unknowns = 0**. **5 questions** = per-round grouping guideline, not cap. Sensitive items need round-trip confirm. Silence / `proceed` / `quick mode` / `assume` / `pode seguir` ≠ confirmation. **`Tudo sim` / `all yes`** = yes on remaining yes/no confirms only (not open questions).

Plain language, numbered, self-contained — conversational, not form. Never "before Clarify/Specify" — name next deliverable.

Present (adapt language). **Must** number every ask `1.`, `2.`, … in one sequence (open questions then sensitive confirms). Tell human they may reply by number only.

```
A few open points before we lock the version inputs:

1. [observable-behavior question]
2. [next]
3. Confirm: {constant} = {value}? (yes/no)

Reply by number, e.g. 1: {answer}  2: {answer}  3: yes
Tudo sim / all yes = yes on remaining yes/no confirms only.
```

### Step 3 — Write contracts, stop at Gate 0

After answers (or `skip clarify` escape in `clarify-strict.md`):

1. Write `docs/versions/{version_san}/sdd/clarify-contract.md` + `unknowns-register.md` from templates.
2. Assumed items = premises **with impact** in clarify-contract. Waivers quoted in unknowns-register.
3. **Stop.** Gate 0 (`gates.md` `requirements_inputs_confirmed`). Do **not** write `requirements.md`. Do **not** ask "write the requirements document" until Gate 0 passes.

### Step 4 — Hand off to Specify

Only after Gate 0 pass (`gates.md`: `(critical unknowns = 0 AND explicit Gate 0 human confirm) OR recorded skip-clarify waiver`). Pass `clarify-contract.md` + `unknowns-register.md` + `source/` into `requirements-generator.md`.

## Critical rules

- **Brownfield without map:** `/ns-harness` `bootstrap-brownfield.md` first — never skip via codebase grep
- **Brownfield with map:** Step 0.4 always. Auto-keep when freshness proven (clock vs git, pathspecs clean). Else wait `refresh`/`keep`. Never keep from Date header alone. Code-read ban ends on `auto-keep` | `keep` | `refresh`
- **Reuse claim:** Step 1 runs D4 before Gate 0 (`clarify-strict.md`)
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
