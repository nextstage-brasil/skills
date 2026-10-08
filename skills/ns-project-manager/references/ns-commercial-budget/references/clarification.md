# Clarification (commercial budget)

The scope comes from the **approved PRD** (`prd-gate.md`). Clarification here asks only **budget context**: what the PRD does not and should not contain (team, productivity, rates, persistence, value-speech context). Do not ask which FP method (default APF: IFPUG CPM latest, SISP only when CPM does not cover) or whether to add COSMIC; include CFP only if the human already asked.

Never ask about scope, actors, business rules, exceptions, constraints or priorities. A doubt of that kind is a PRD defect: stop and follow `prd-gate.md` → Step 5.

Batch questions. No drip, one at a time, across turns.

## Limits

- Max 5 questions in the first message; max 1 follow-up round (again ≤5, only new blockers).
- `proceed with assumptions` / `quick mode`: stop asking. Budget-context gaps → `[LACUNA]` / `[ASSUMPTION]`. Scope gaps are never covered this way.

## Prefer answers already in prompt **or product context**

Do not re-ask what the PRD, prior chat turns or `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` already state.

## Question bank (pick ≤5)

Highest-value gaps for this scope:

1. **`{version_san}`** — only when the PRD does not name it.
2. **Value-speech context (client export, optional)** — segment, main reported pain, alternatives under evaluation, only if missing from the PRD and a question slot remains. **Not** a blocker. Valor agregado is always addressed to the **decision-maker** (`sales-value-speech.md`); do not ask “who do we pitch to?” as if the operator were the addressee.
3. **Team experience (prefer when estimating hours)** — seniority of builders; tenure on product/project; involvement depth (core maintainers vs occasional). Goal: calibrate codebase/domain knowledge before hours. Optionally ask house productivity (h/PF) if a standard exists. Ask h/CFP only when COSMIC was requested.
4. **Rates for Custo (optional)** — R$/h and/or R$/PF **only if** human wants macro Custo column filled or asks the PF price / says they do not know it. Unknown PF price: read `pf-unit-price.md`, convert the USD anchor with the day's local FX, and **offer** the mean (plus band). Fill Custo only after they accept. Else leave `—` / `_pending rates_`.
5. **Persist or chat-only** — write/overwrite `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` (header bumps Sequência + Gerado em)?

Misplaced-file **STOP gate** (`../../pm-persist.md`) is **not** a clarification question and is **not** skipped by `proceed with assumptions` / `quick mode`. Persist stays blocked until the human explicitly confirms or declines the path action.

Do **not** invent rates. The Floripa suggestion is an offer, not a silent fill. Skip rates question when human already said ignore pricing. A price-only question is answered from `pf-unit-price.md` and does not open a budget.

## Framing

- One short context sentence, then numbered questions.
- End with: may answer partially, or say `proceed with assumptions` / `quick mode`.

## After answers

Map into Premissas / ressalvas (budget context only) and the hours productivity premise (cite team experience **and** reverse-spec/map reuse signals). Unanswered budget-context blockers become `[LACUNA: …]` or `[ASSUMPTION: …]` — never silent invention (`anti-hallucination.md`).

An answer that changes scope is not applied here. Stop and send it to the PRD (`prd-gate.md` → Step 5).
