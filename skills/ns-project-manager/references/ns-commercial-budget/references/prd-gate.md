# PRD gate (commercial budget)

The budget prices a scope. The scope is defined in the **approved PRD**, not in the budget. So the budget starts from an approved PRD, takes every Feature from it, and never decides scope on its own.

Order: **decisions (chat) → PRD approved → budget.**

## Step 1 — Locate the PRD (first thing, before any clarification)

Accept either source:

1. **File:** `docs/versions/{version_san}/pm/prd.md`.
2. **Chat:** a PRD pasted or attached in this conversation.

Both exist and differ: ask once which one is current. Do not merge them.

## Step 2 — Check approval

The PRD is **approved** when either:

- its header **Status** is `approved` / `Aprovado` (or later: `in development`, `delivered`) **and** §13 Open questions is empty ("None." / "Nenhuma."), or
- the human explicitly states in this conversation that this PRD is approved.

Anything else (Draft, In review, open questions in §13, gap tokens `TO BE DEFINED` / `A DEFINIR` in a requirement) is **not approved**.

## Step 3 — No approved PRD: stop and build it

Do not open the budget. No Features, no FP, no hours, no partial or provisional budget.

Reply in one short message:

- No PRD found → "The budget starts from the approved PRD. Send it (file or paste), or I build it now."
- PRD found but not approved → state why in one line (status, number of open questions), and offer to finish it.

When the human agrees, switch to PRD mode (`../../14-prd.md`): decisions in chat, then the PRD, then approval. Resume the budget only after approval. The budget never answers PRD questions itself.

Price-only questions (`pf-unit-price.md`) do not need a PRD.

## Step 4 — Budget from the approved PRD

- **Scope:** every in-scope RF becomes part of a Feature. Nothing outside the PRD's scope is priced. Out-of-scope items stay out.
- **Traceability:** the internal budget maps each Feature to its RF ids. The client export keeps product language.
- **Business rules and acceptance** in Features come from the PRD's RFs, rewritten in product voice (`product-voice.md`). No new rule is invented.
- **Clarification** asks only budget context: team experience and productivity, rates, persistence, value-speech context (`clarification.md`). Never scope, actors, rules, exceptions or priorities.
- **Header:** both budget docs cite the PRD they price: `**PRD de referência:** {path or "enviado no chat"} — {PRD version / last updated}`.

## Step 5 — Scope doubt during the budget: stop

A scope doubt is anything the budget needs and the PRD does not settle: an RF too vague to size, a rule with two readings, an RF that conflicts with the reverse-spec or brownfield map, a capability the human mentions that is not in the PRD, a scope change requested during the budget.

When one appears:

1. **Stop the budget.** Do not size, persist or bump the Sequência.
2. List each doubt in chat as a **PRD defect**: which RF, what is missing or conflicting, one line each.
3. Say that the PRD must evolve first and offer to run PRD mode now.
4. If the human answers a scope doubt inside the budget conversation, do not apply the answer to the budget. Take it to PRD mode, update the PRD, get it approved again, then resume the budget from the new version.

Never record scope answers in Premissas, `[ASSUMPTION]`, `[LACUNA]` or Notas técnicas to get around the stop. `[LACUNA]` and `[ASSUMPTION]` in the budget cover budget context only (productivity, rates, team).
