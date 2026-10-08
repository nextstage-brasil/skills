# PRD — product requirements document (PM)

On-demand version PRD. Lean by default. Acceptance criteria live in section 6. **Not** spec-driven `requirements.md`. **Not** a replacement for Phase 2 `01-requirements.md`.

A PRD is done when development has **no business questions left**, not when it looks complete. Every PRD draft and revision runs `references/decision-coverage.md` first.

## Distinct artifacts — do not touch

| File | Owner | This mode |
|---|---|---|
| `docs/versions/{version_san}/pm/prd.md` | This mode | Write / update |
| `docs/<project-slug>/01-requirements.md` | Phase 2 | Read if present. Do not rewrite. |
| `docs/versions/{version_san}/sdd/requirements.md` | `ns-spec-driven` | Never read or write |

One line in output if an SDD `requirements.md` exists: distinct artifact, not updated here.

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

Optional sections (5, 7, 8, 12) render only when the input has something to put there, and only outside `small-feature` — except 9, 10, and 15, which follow their profile. Section 16 (Glossary) may render in any profile when the input uses domain terms an implementer could misread.

`small-feature` still names the persona inside the RF story. It does not add section 5.

## Gap token

Missing required fact: do not guess.

- English document: `TO BE DEFINED`
- Portuguese document: `A DEFINIR`

Each gap token becomes one open-question row (section 13) **with a recommended answer** (`decision-coverage.md` Step 4). Fill **Blocks** with the RF or OBJ ids that cannot be built or measured until it is answered, else `—`.

A gap token is not only for facts the input left blank. Every coverage dimension that is `open` or `assumed` for an in-scope RF is a gap too, even when the input never mentioned it.

## Ids and traceability

- `OBJ-NN` objectives (section 3), `RF-NN` functional requirements (section 6), `NFR-NN` non-functional (section 7), `Q-NN` open questions (section 13).
- Each in-scope line in section 4 names its RF ids. Each RF names the OBJ ids it supports and its source in the input.
- `Q-NN` ids are the decision register ids (`decision-coverage.md` Step 5). Same id in chat, register, §13 and §14.
- Header **Readiness**: the state from `decision-coverage.md` (Draft / Business-validated / Dev-lens checked / Frozen). Computed from the register, never upgraded because the text looks finished. **Frozen** only on the human's explicit word.
- Header **Ready for build**: `yes` only when Readiness is Dev-lens checked or Frozen **and** no open question blocks an in-scope RF. Otherwise `no — blocked by Q-NN`. Computed, not guessed.

## Prerequisites

Never invent stakeholders, systems, metrics, dates, baselines, priorities, or scope.

- `version_san` missing: ask once, then stop.
- Phase 2 stories exist: RF text and acceptance match those stories. Do not add behavior.
- Transcript only: write the PRD **draft** in this turn. Do not open Phase 1. The proposal batch for open decisions goes in the same reply, after the PRD.

## Workflow

1. Resolve `version_san` and the profile set.
2. If SDD `requirements.md` exists for that version: one line, do not touch it.
3. **Decision coverage** — `references/decision-coverage.md` Steps 1–3: dimensions for each in-scope capability, rule probes for each business rule, cross-round detectors against every earlier round and artifact (budget, register, reverse-spec). Load or create `docs/versions/{version_san}/pm/decision-register.md` (`assets/decision-register.template.md`) and update it. `ai-data` profile: D13 is mandatory.
4. Load `assets/prd.template.md`.
5. Keep section order. Drop optional sections the profile or the evidence does not call for. Never drop a required section.
6. Fill `{field}` from input, Phase 1, Phase 2, or `answered` register rows. Else gap token. Answered decisions go **into** the RF they govern (business rules, acceptance), not only into §14.
7. Language matching for the final document. Ids stay `RF-01`. Priority tags stay `P0` / `P1` / `P2`.
8. Strip the metadata comment, every `<!-- hint -->`, every `<!-- prd-profile -->`, and the `[REQUIRED]` / `[OPTIONAL]` tags.
9. **Developer-lens self-check** — `decision-coverage.md` Step 6. Business questions found go back to the register and the proposal batch. Decisions found only in chat get written into the PRD.
10. Validate, then write `docs/versions/{version_san}/pm/prd.md` (and the register) when persistence is on — same text as the chat draft.

## Validation (before the gate)

- Every required section for the active profile is present and non-empty.
- Every `RF-NN` has a story, a source, and at least two acceptance checks (happy path and error or edge).
- Every in-scope item in section 4 maps to an RF, and every RF appears in section 4.
- Every gap token has a `Q-NN` row with a recommended answer; **Ready for build** matches the `Blocks` column and the Readiness state.
- §13 coverage table has one row per in-scope RF. No dimension is blank, and every `n/a` has a reason.
- No `C-NN` conflict is open while Readiness is above Draft.
- No "frozen", "congelado", "escopo fechado", "sem pendências" or "no open items" anywhere unless Readiness is Frozen.
- Guardrail metrics appear only when the input names one.
- No HTML comment left. No `{field}` left.
- No number, date, name, or priority that the input did not state.
- Section 10 does not compute price, hours, or function points.

## Output

Filled PRD for the active profile. Then, in chat:

1. One line: **Readiness**, **Ready for build** and the blocking `Q-NN` ids, if any.
2. One line: the developer-lens result (`decision-coverage.md` Step 6).
3. The **proposal batch** for every `open` / `assumed` decision (`decision-coverage.md` Step 4), grouped by dimension. Skip this only when nothing is open.
4. Close with the draft warning and one gate: "Answer the proposals by number (or 'all recommended'), or adjust scope, requirements, or acceptance criteria?"

## Behavioral constraints

- Acceptance criteria stay in section 6. Do not defer them to Phase 2 or to SDD.
- No architecture, API design, or task breakdown.
- No RICE, sprint plan, forecast, or commercial-budget run in this mode.
- No `create_issue`.
- Generic "user" is invalid. Unnamed role = gap token, not an invented title.
- Do not spend a round polishing sections, diagrams or wording while decisions are open. Close decisions first.
- A later round never resets the register. Each new answer is checked against all earlier ones (contradiction detector).
