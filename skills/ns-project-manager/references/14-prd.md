# PRD — product requirements document (PM)

On-demand version PRD. Lean by default. Acceptance criteria live in section 6. **Not** spec-driven `requirements.md`. **Not** a replacement for Phase 2 `01-requirements.md`.

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

Each gap token becomes one open-question row (section 13). Fill **Blocks** with the RF or OBJ ids that cannot be built or measured until it is answered, else `—`.

## Ids and traceability

- `OBJ-NN` objectives (section 3), `RF-NN` functional requirements (section 6), `NFR-NN` non-functional (section 7), `Q-NN` open questions (section 13).
- Each in-scope line in section 4 names its RF ids. Each RF names the OBJ ids it supports and its source in the input.
- Header **Ready for build**: `no — blocked by Q-NN` when any open question blocks an in-scope RF; else `yes`. Computed, not guessed.

## Prerequisites

Never invent stakeholders, systems, metrics, dates, baselines, priorities, or scope.

- `version_san` missing: ask once, then stop.
- Phase 2 stories exist: RF text and acceptance match those stories. Do not add behavior.
- Transcript only: write the PRD in this turn. Do not open Phase 1.

## Workflow

1. Resolve `version_san` and the profile set.
2. If SDD `requirements.md` exists for that version: one line, do not touch it.
3. Load `assets/prd.template.md`.
4. Keep section order. Drop optional sections the profile or the evidence does not call for. Never drop a required section.
5. Fill `{field}` from input, Phase 1, or Phase 2. Else gap token.
6. Language matching for the final document. Ids stay `RF-01`. Priority tags stay `P0` / `P1` / `P2`.
7. Strip the metadata comment, every `<!-- hint -->`, every `<!-- prd-profile -->`, and the `[REQUIRED]` / `[OPTIONAL]` tags.
8. Validate, then write `docs/versions/{version_san}/pm/prd.md` when persistence is on — same text as the chat draft.

## Validation (before the gate)

- Every required section for the active profile is present and non-empty.
- Every `RF-NN` has a story, a source, and at least two acceptance checks (happy path and error or edge).
- Every in-scope item in section 4 maps to an RF, and every RF appears in section 4.
- Every gap token has a `Q-NN` row; **Ready for build** matches the `Blocks` column.
- Guardrail metrics appear only when the input names one.
- No HTML comment left. No `{field}` left.
- No number, date, name, or priority that the input did not state.
- Section 10 does not compute price, hours, or function points.

## Output

Filled PRD for the active profile. State **Ready for build** in one line (and the blocking `Q-NN` ids, if any). Close with the draft warning and one gate: "Confirm this PRD, or adjust scope, requirements, or acceptance criteria?"

## Behavioral constraints

- Acceptance criteria stay in section 6. Do not defer them to Phase 2 or to SDD.
- No architecture, API design, or task breakdown.
- No RICE, sprint plan, forecast, or commercial-budget run in this mode.
- No `create_issue`.
- Generic "user" is invalid. Unnamed role = gap token, not an invented title.
