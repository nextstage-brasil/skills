# PRD — product requirements document (PM)

On-demand version PRD. **Not** spec-driven `requirements.md`. **Not** a replacement for Phase 2 `01-requirements.md`.

## What a PRD is

A PRD is the **formal reference document** for a delivery. The development team builds from it, QA and the client homologate against it, and approvers sign it. Its readers were **not in the conversation**. They do not know the rounds, the proposals, the budget or what the analyst assumed.

So the PRD:

- states **decisions**, not discussion. Every rule reads as fact in the present tense: "The system shows…", "Only the Supervisor profile can…".
- is **self-contained**. Each functional requirement can be understood alone by someone outside the project: who acts, when, what the system does, under which rules, with which result, and how acceptance is checked.
- is the **basis for homologation**. Acceptance criteria are concrete enough for QA or the client to run them and say pass or fail.
- carries **no process**. The conversation, the decision register, the budget and the working state of the analysis stay in chat. They never appear in the document.

Writing rules: `references/prd-writing-standard.md`. Read it before writing any section.

## Decisions are closed in chat, then written

The PRD is written **after** business decisions are closed, not while they are being discussed.

1. Run `references/decision-coverage.md` (coverage scan, rule probes, cross-round detectors) on the scope. Keep the decision register.
2. Open decisions that affect any in-scope requirement → send the **proposal batch in chat** and stop. Do not write the PRD yet. One line explains why: the PRD states decisions, and these are still open.
3. The human answers or accepts the recommendations ("all recommended", "use the recommendations") → those answers become **decisions**. Write the PRD with each decision stated as a requirement or a business rule.
4. The human asks for the PRD **before** deciding ("write it anyway", "quero o rascunho já", "proceed with assumptions" without accepting the recommendations) → write it with header **Status: Draft** (`Rascunho`). Each undecided point appears once, as a neutral formal question in §13 and as `TO BE DEFINED` / `A DEFINIR` in the rule it affects. No proposals, no recommendations, no blocking lists, no process notes.

A PRD with status **Approved** has an empty §13.

## Distinct artifacts — do not touch

| File | Owner | This mode |
|---|---|---|
| `docs/versions/{version_san}/pm/prd.md` | This mode | Write / update |
| `docs/versions/{version_san}/pm/decision-register.md` | `decision-coverage.md` | Read and update. Never copied into the PRD |
| `docs/<project-slug>/01-requirements.md` | Phase 2 | Read if present. Do not rewrite |
| `docs/versions/{version_san}/sdd/requirements.md` | `ns-spec-driven` | Never read or write |

One line in chat if an SDD `requirements.md` exists: distinct artifact, not updated here.

## Persist path

`docs/versions/{version_san}/pm/prd.md` — `references/pm-persist.md`. Not `docs/<project-slug>/prd.md`. Not `docs/roadmap.md`. Not `sdd/requirements.md`.

## Router triggers

"PRD", "product requirements document", "documento de requisitos de produto", "escreve o PRD", "gera o PRD".

Do not trigger on a bare "requirements" or "especificação" — those stay Phase 2 or `ns-spec-driven`.

## Profiles

Pick from the request. Unstated = `small-feature`.

| Profile | When | Sections |
|---|---|---|
| `small-feature` | Default. One feature, agile slice, one-pager. | 1, 2, 3, 4, 6, 11, 13, 14 |
| `new-product` | New product or large initiative. | Required sections, plus optional sections that have sourced data, plus 15 |
| `ai-data` | AI, model, agent, or analytics in scope. | Add 9. Combines with the base profile. |
| `client-project` | Client delivery, contract, approvers. | Add 10. Combines with the base profile. |

Optional sections (5, 7, 8, 12) render only when the input has something to put there, and only outside `small-feature` — except 9, 10, and 15, which follow their profile. Section 16 (Glossary) renders in any profile when the document uses domain terms an outside reader could misread.

`small-feature` still names the persona inside the RF. It does not add section 5.

## Gap token (Draft only)

- English document: `TO BE DEFINED`
- Portuguese document: `A DEFINIR`

Used only in a Draft the human explicitly asked for. Each gap token has exactly one §13 row, written as a neutral question. An Approved PRD has no gap token.

## Ids

- `OBJ-NN` objectives (§3), `RF-NN` functional requirements (§6), `RN-NN.n` business rules inside an RF, `NFR-NN` non-functional (§7), `Q-NN` open questions (§13, Draft only).
- Each in-scope line in §4 names its RF ids. Each RF names the OBJ ids it supports.
- Register ids (`C-NN`), dimension codes (`D1`–`D14`), readiness states and round numbers are **working ids**. They never appear in the PRD.

## Prerequisites

Never invent stakeholders, systems, metrics, dates, baselines, priorities, or scope.

- `version_san` missing: ask once, then stop.
- Phase 2 stories exist: RF text and acceptance match those stories. Do not add behavior.
- Transcript only: run the decision protocol first. Do not open Phase 1.

## Workflow

1. Resolve `version_san` and the profile set.
2. If SDD `requirements.md` exists for that version: one line, do not touch it.
3. **Decision coverage** — `references/decision-coverage.md`. `ai-data` profile: D13 is mandatory. Open decisions affect in-scope requirements → proposal batch in chat, stop (see **Decisions are closed in chat, then written**).
4. Read `references/prd-writing-standard.md`. Load `assets/prd.template.md`.
5. Keep section order. Drop optional sections the profile or the evidence does not call for. Never drop a required section.
6. Compose the text from the input, Phase 1, Phase 2 and **every decided register row**. Each decision is rewritten, not pasted, into the RF it governs (behavior, business rules, exceptions, acceptance), following `prd-writing-standard.md` → From decisions to requirement text. Check that no decided row was left out. §14 only logs when and by whom it was decided.
7. Language matching for the final document. Ids stay `RF-01`. Priority tags stay `P0` / `P1` / `P2`.
8. Strip the metadata comment, every `<!-- hint -->`, every `<!-- prd-profile -->`, and the `[REQUIRED]` / `[OPTIONAL]` tags.
9. **Outside-reader check** — `prd-writing-standard.md` → Outside-reader check. Every business question it raises goes back to the chat proposal batch, never into the document as a note.
10. **Process-leak check** — `prd-writing-standard.md` → Forbidden content. Remove every hit.
11. Validate, then write `docs/versions/{version_san}/pm/prd.md` when persistence is on — same text as the chat draft.

## Validation (before the gate)

- Every required section for the active profile is present and non-empty (§13 Approved: "None." / "Nenhuma.").
- Every `RF-NN` follows the RF structure in `prd-writing-standard.md`: actor, trigger, behavior, business rules, exceptions, acceptance with at least a happy path and an error or edge case.
- Every in-scope item in §4 maps to an RF, and every RF appears in §4.
- Each RF passes the outside-reader check alone.
- Zero hits from the forbidden-content list.
- No number, date, name, or priority that the input or a decision did not state.
- No HTML comment left. No `{field}` left.

## Output

In the document: the PRD only.

In chat, after the document (never inside it):

1. One line: status (Draft / In review / Approved) and how many open questions remain.
2. One line: outside-reader check result.
3. Draft with open questions: the proposal batch (`decision-coverage.md` Step 4).
4. Close with the draft warning and one gate: "Confirm this PRD, or adjust scope, requirements or acceptance criteria?"

## Behavioral constraints

- No architecture, API design, task breakdown, or technical solution.
- No RICE, sprint plan, forecast, price, hours, function points or budget in this mode or in the document.
- No `create_issue`.
- Generic "user" is invalid. Unnamed role = open decision, not an invented title.
- A later round never resets the register. Each new answer is checked against all earlier ones.
