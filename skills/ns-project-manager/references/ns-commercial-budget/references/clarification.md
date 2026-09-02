# Clarification (commercial budget)

Ask only what blocks a credible client budget (Features + Function Points + hours + macro table + risk margins). Do not ask which FP method (default APF: IFPUG CPM latest, SISP only when CPM does not cover) or whether to add COSMIC; include CFP only if the human already asked. Batch questions — no drip one-at-a-time across turns.

## Limits

- **Max 5 questions** in first clarification message.
- **Max 1 follow-up round** (again ≤5 questions, only blockers that appeared after answers).
- If human says `proceed with assumptions` / `quick mode`: skip further questions; mark gaps in document.

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
6. **Rates for Custo (optional)** — R$/h and/or R$/PF **only if** human wants macro Custo column filled; else leave `—` / `_pending rates_`.
7. **Acceptance depth** — must-have SLAs or volumes stakeholder will commit (do not invent).
8. **Persist or chat-only** — write/overwrite `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` (header bumps Sequência + Gerado em)?

Misplaced-file **STOP gate** (`../../pm-persist.md`) is **not** a clarification question and is **not** skipped by `proceed with assumptions` / `quick mode`. Persist stays blocked until the human explicitly confirms or declines the path action.

Do **not** invent rates. Skip rates question when human already said ignore pricing.

## Framing

- One short context sentence, then numbered questions.
- End with: may answer partially, or say `proceed with assumptions` / `quick mode`.

## After answers

Map into Premissas / ressalvas, Feature boundaries, hours productivity premise (cite team experience **and** reverse-spec/map reuse signals). Unanswered blockers become `[LACUNA: …]` or `[ASSUMPTION: …]` — never silent invention (`anti-hallucination.md`).
