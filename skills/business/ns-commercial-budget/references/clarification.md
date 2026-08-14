# Clarification (commercial budget)

Ask only what blocks a credible client budget (Features + FP + COSMIC + hours + macro table + risk margins). Batch questions — do not drip one-at-a-time across many turns.

## Limits

- **Max 5 questions** in the first clarification message.
- **Max 1 follow-up round** (again ≤5 questions, only for blockers that appeared after answers).
- If the human says `proceed with assumptions` / `quick mode`: skip further questions; mark gaps in the document.

## Prefer answers already in the prompt **or product context**

Do not re-ask what the free-form description already states. Deduplicate against prior chat turns **and** against `docs/context/system-reverse-spec.agent.md` (or `.md`) / `brownfield-map.md` when those were loaded in intake.

## Question bank (pick ≤5)

Choose the highest-value gaps for this scope:

1. **`{version_san}` / product label** — slug for `docs/versions/{version_san}/` (placeholder ok).
2. **In / out of scope (delta)** — what must ship vs explicit exclusions; when reverse-spec exists, ask what **changes/adds** vs what already works.
3. **Actors / personas** — who uses the system (roles), and any external systems touched — skip if already clear in reverse-spec Access / Integrations.
4. **Constraints** — deadline, compliance (e.g. LGPD), brownfield vs greenfield, known stack — skip stack if `brownfield-map` / `stack-confirmed` already covers it.
5. **Team experience (prefer when estimating hours)** — seniority of the people who will build this; how long they have worked on this product/project; depth of involvement (core maintainers vs occasional contributors). Goal: calibrate knowledge of the codebase/domain before stating hours. Optionally ask house productivity (h/PF or h/CFP) if they have a standard.
6. **Rates for Custo (optional)** — R$/h and/or R$/PF **only if** the human wants the macro table Custo column filled; otherwise leave `—` / `_pending rates_`.
7. **Acceptance depth** — any must-have SLAs or volumes the stakeholder will commit to (do not invent).
8. **Persist or chat-only** — write/overwrite `commercial-budget-internal.md` (header bumps Sequência + Gerado em)?

Do **not** invent rates. Skipping the rates question is fine when the human already said to ignore pricing.

## Framing

- One short context sentence, then the numbered questions.
- End with: they may answer partially, or say `proceed with assumptions` / `quick mode`.

## After answers

Map answers into Premissas / ressalvas, Feature boundaries, and the hours productivity premise (cite team experience **and** reverse-spec/map reuse signals). Unanswered blockers become `[LACUNA: …]` or `[ASSUMPTION: …]` — never silent invention (see `anti-hallucination.md`).
