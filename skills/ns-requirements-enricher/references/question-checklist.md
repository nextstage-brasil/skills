# Question checklist (scarce blockers)

Phase 3. Promote to numbered questions **only** when issue + comments + **code** leave a **product** gap that would force the implementing agent to guess.

Zero such gaps → ready. No filler.

Rewrite every candidate so **issue author (requester)** answers in plain language. Technical discovery stays in your notes. The brief and the questions state requirements only — no paths, classes, or files.

Open questions: chat only. Never the GitLab comment. Screen facts first. Then each question in **three blocks**. The arrow line is a new line. A period then `➡️` on the same line is invalid.

```text
Q1 — Short title
One or two sentences: what the screen does vs the request.

➡️ Recommended: concrete default. What changes and what stays.
```

Blank line before `➡️`. Label in the user's language (`➡️ Recomendado:` in Portuguese). Same language as the brief. No mix.

Closer: reply by number (`1: …`) or "all yes" / "all recommended". Then close requirements in chat. Not a PRD. Accepted defaults move into What changes, Acceptance, or Assumptions. Posted comment has no question list.

Technique (not version Clarify): numbered batch; blocking vs assumed vs drop; unresolved-value and contradiction detectors. Never write version artifacts.

## Do NOT ask (never promote)

- Missing / wrong labels (Team, Type, Priority, Severity, RF, …)
- Base branch, GATE 1, `develop-*` vs `develop_*`, remote branch existence
- Schema, table, column, class, file path, env var, SQL, payload shape
- "How should we implement…"
- Version, PO, milestone-as-version, Gate 0 version scope, "full version"
- Safe defaults (put in Assumptions)

## Scope (product)

- [ ] What is **out of scope** for this delivery (other screens, reports, export)? Ask only if the issue could reasonably include them and the agent would guess.
- [ ] Applies to **all** tenants/clients or only one context? Ask only if code/tenancy makes both plausible.
- [ ] Must existing screen/filter behavior stay unchanged outside request? Default yes in Assumptions unless text conflicts.

## Behavior / UX

- [ ] Happy path: what does user do, see, on which screen? Skip if issue already names screens (exemplar grain).
- [ ] When does filter/action **apply** (immediately vs after Search/Save)?
- [ ] Empty list, error, no permission: what should appear? Assume current screen pattern unless request changes it.
- [ ] Combined selections: must match **all** criteria or **any** one?
- [ ] Double submit / toggle again: what happens?

## Data as user sees it (not schema)

- [ ] What counts as "linked", "latest role", "active", "uppercase", etc. in business language — only if code has more than one meaning.
- [ ] External integration visible to user (syncs automatically? editable on screen?)?

## Permissions (user-facing)

- [ ] Who can see/use new control? Assume same profile as today's screen unless request expands audience.

## Done / acceptance

- [ ] How will requester **accept** that it is done? Prefer restating issue steps in Acceptance. Ask only if those steps cannot be verified.

## Rewrite examples

| Bad (dev) | Good (requester) |
| --------- | ---------------- |
| Missing Team label | _(omit)_ |
| Which branch `develop-1.32`? | _(omit — no version/branch questions)_ |
| Filter `PESSOA\|CLUBE` in `linktable`? | Should the Club filter list only people linked to that club? |
| Separate `filtroLastFuncao` per entity? | Does "latest role only" apply when filtering by Club as well as Federation? |
| Which phpunit path? | For acceptance, is checking the People Search screen with the cases in the issue enough? |
| Is this in the next version? | _(omit)_ |
