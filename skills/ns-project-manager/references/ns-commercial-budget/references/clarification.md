# Clarification (commercial budget)

Two kinds of questions, asked in the same batch:

1. **Budget context** (question bank below): what a credible budget needs (Features + Function Points + hours + macro table + risk margins). Do not ask which FP method (default APF: IFPUG CPM latest, SISP only when CPM does not cover) or whether to add COSMIC; include CFP only if the human already asked.
2. **Product decisions**: the coverage scan in `../../decision-coverage.md` (D1–D14 per Feature + rule probes + cross-round detectors). A budget is also a scope contract. Every decision left open here comes back later as a developer question and as rework on the estimate.

Batch questions. No drip, one at a time, across turns.

## Limits

- **Budget context:** max 5 questions in the first message; max 1 follow-up round (again ≤5, only new blockers).
- **Product decisions:** no fixed cap. Every question carries a recommended answer, so the human reviews instead of writing (`decision-coverage.md` Step 4). One batch per round with every open item; when there are more than 30, send the most blocking first and give the remaining count.
- `proceed with assumptions` / `quick mode`: stop asking. Context gaps → `[LACUNA]` / `[ASSUMPTION]`. Open decisions → `assumed` in the register, and the estimate stays **provisional** (`decision-coverage.md` → Provisional estimate seal).

## Prefer answers already in prompt **or product context**

Do not re-ask what free-form description already states. Deduplicate against prior chat turns **and** against `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` when loaded in intake.

## Question bank (pick ≤5)

Highest-value gaps for this scope:

1. **`{version_san}` / product label** — slug for `docs/versions/{version_san}/pm/` (placeholder ok).
2. **In / out of scope (delta)** — what must ship vs explicit exclusions; when reverse-spec exists, ask what **changes/adds** vs what already works.
3. **Actors / personas** — who uses system (roles), external systems touched — skip if clear in reverse-spec Access / Integrations.
3a. **Value-speech context (client export, optional)** — segment, main reported pain, alternatives under evaluation, only if missing and a question slot remains. **Not** a blocker. Valor agregado is always addressed to the **decision-maker** (`sales-value-speech.md`); do not ask “who do we pitch to?” as if the operator were the addressee.
4. **Constraints** — deadline, compliance (e.g. LGPD), brownfield vs greenfield, known stack — skip stack if `brownfield-map` / `stack-confirmed` already covers.
5. **Team experience (prefer when estimating hours)** — seniority of builders; tenure on product/project; involvement depth (core maintainers vs occasional). Goal: calibrate codebase/domain knowledge before hours. Optionally ask house productivity (h/PF) if a standard exists. Ask h/CFP only when COSMIC was requested.
6. **Rates for Custo (optional)** — R$/h and/or R$/PF **only if** human wants macro Custo column filled or asks the PF price / says they do not know it. Unknown PF price: read `pf-unit-price.md`, convert the USD anchor with the day's local FX, and **offer** the mean (plus band). Fill Custo only after they accept. Else leave `—` / `_pending rates_`.
7. **Acceptance depth** — must-have SLAs or volumes stakeholder will commit (do not invent).
8. **Persist or chat-only** — write/overwrite `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` (header bumps Sequência + Gerado em)?

Misplaced-file **STOP gate** (`../../pm-persist.md`) is **not** a clarification question and is **not** skipped by `proceed with assumptions` / `quick mode`. Persist stays blocked until the human explicitly confirms or declines the path action.

Do **not** invent rates. The Floripa suggestion is an offer, not a silent fill. Skip rates question when human already said ignore pricing. A price-only question is answered from `pf-unit-price.md` and does not open a budget.

## Framing

- One short context sentence, then numbered questions.
- End with: may answer partially, or say `proceed with assumptions` / `quick mode`.

## After answers

Map into Premissas / ressalvas, Feature boundaries, hours productivity premise (cite team experience **and** reverse-spec/map reuse signals). Unanswered blockers become `[LACUNA: …]` or `[ASSUMPTION: …]` — never silent invention (`anti-hallucination.md`).

Update the decision register every round and run the contradiction detector against all earlier rounds. Answered decisions go into the Feature they govern (**Regras**, **Limites desta entrega**, Critérios), not only into Premissas.

## Rounds and readiness

- A new round re-reads every earlier answer. A new answer that contradicts an old one opens a `C-NN` conflict. Ask which one wins; do not pick silently.
- Never call the scope "congelado", "fechado" or "sem pendências" unless the register says Frozen (`decision-coverage.md` → Readiness states).
- The chat summary at each round states: open decisions, open conflicts, unapproved assumptions, and the estimate status (provisional / firm).
