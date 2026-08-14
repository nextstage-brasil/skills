# Question checklist (grill-me scan)

Use during Phase 3. Only promote items to numbered questions when the issue + comments + code leave a **product** gap.

Rewrite every candidate so the **issue author (requester)** can answer in plain language. Technical discovery stays in Assumptions.

## Do NOT ask (never promote)

- Missing / wrong labels (Team, Type, Priority, Severity, RF, …)
- Base branch, GATE 1, `develop-*` vs `develop_*`, remote branch existence
- Schema, table, column, class, file path, env var, SQL, payload shape
- "How should we implement…"

**Milestone exception:** at most one question — "Is the milestone on this issue correct?" — only if version/product release is genuinely ambiguous. Nothing about branches.

## Scope (product)

- [ ] What is **out of scope** for this delivery (other screens, reports, export)?
- [ ] Applies to **all** tenants/clients or only one context?
- [ ] Must existing screen/filter behavior stay unchanged outside the request?

## Behavior / UX (prefer these)

- [ ] Happy path: what does the user do, see, on which screen?
- [ ] When does the filter/action **apply** (immediately vs after Search/Save)?
- [ ] Empty list, error, no permission: what should appear?
- [ ] Combined selections: must match **all** criteria or **any** one?
- [ ] Double submit / toggle again: what happens?

## Data as the user sees it (not schema)

- [ ] What counts as "linked", "latest role", "active", etc. in business language?
- [ ] External integration visible to the user (syncs automatically? editable on screen?)?

## Permissions (user-facing)

- [ ] Who can see/use the new control (same profile as today's screen X)?
- [ ] Sensitive data: visible to the same audience as today?

## Done / acceptance

- [ ] How will the requester **accept** that it is done (steps on screen)?
- [ ] Only when description is silent: specific usage scenarios needed — ask in user language, not "unit vs E2E".

## Rewrite examples

| Bad (dev) | Good (requester) |
| --------- | ---------------- |
| Missing Team label | _(omit)_ |
| Which branch `develop-1.32`? | At most: Is the issue milestone correct? |
| Filter `PESSOA\|CLUBE` in `linktable`? | Should the Club filter list only people linked to that club? |
| Separate `filtroLastFuncao` per entity? | Does "latest role only" apply when filtering by Club as well as Federation? |
| Which phpunit path? | For acceptance, is testing on the People Search screen with 2–3 cases enough? |
