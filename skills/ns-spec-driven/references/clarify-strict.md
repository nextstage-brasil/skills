# Clarify-Strict

Highest-priority version-scope grill. Completeness **before** fidelity. Grill stops Gate 0. Later human confirm = Gate 1–4 + brownfield 0.4 (`gates.md`).

Entry shell: `clarify-requirements.md` (brownfield Step 0 / 0.4). Body = this file.

Grain: version under `docs/versions/{version_san}/`. **Not** per-issue GitLab (`ns-requirements-enricher`).

## Blocking category checklist

Every category **answered** | **assumed** (accepted premise in `clarify-contract.md`) | **waived** (row in `unknowns-register.md`). Critical unknown open = cannot leave Clarify-Strict.

| Category | Must pin |
| -------- | -------- |
| Actors / permissions | Who acts; role vs permission matrix |
| Entity states / transitions | States; legal transitions; illegal ones |
| Payload fields | Type + nullability per field |
| Error / rejection matrix | Trigger + client-visible outcome (HTTP). Artifact may store source codes; **chat** never asks human to name them |
| Pagination / limits / constants | Page size, max, enums, magic numbers |
| UI screens / elements / handlers / copy | Screens; controls; events; **verbatim** strings |
| Integration / auth | Protocol, identity, tokens |
| Persistence / migration | Tables, FK, migrate vs recreate |
| Out-of-scope | Explicit exclusions + reason |
| NFRs | Volume, SLA, security bar |
| Test evidence | What proves done |

## Source inventory

`docs/versions/{version_san}/source/` from Intake: questions from unclassified / thin sections + checklist gaps. Never invent contract values to close gap.

**Chat questions:** observable behavior only (when, who, HTTP, copy, numbers). Never ask human recall or confirm source codes (`FPA08`, ticket ids, `§`, `Sx`). Map code to situation in ask. Write codes only in `clarify-contract.md` / `unknowns-register.md` after human answers situation.

## Detectors (after checklist, before Gate 0)

Run **after** category checklist, **before** Gate 0. Topic mention in source ≠ category `answered`.

| Id | Hit | Close |
| -- | --- | ----- |
| **D1** Unresolved value | Range in limit/timeout cell; vague adjective on limit or error body; `TBD`; `impl.`; `to be defined`; empty copy slot | Single value, allowed set, or accepted premise. Limits / Errors / UI stay `open` until then |
| **D2** External source unanchored | Cite of prototype, screenshot folder, other repo, or “see existing requirements” used to close UI/copy | `answered` only if Intake registered path in `docs/context/reference-sources.md` **and** agent opened it (or human waived). Missing path = `open`. Status table inside pasted spec claiming planning done ≠ Gate 1 |
| **D3** Contradiction or capability | Two sections disagree; screen demands data declared persistence cannot supply | Record both sides. Do **not** pick winner |

**Not a detector:** delivery phase / order tables. Map as `spec-coverage.md` rows + partition/task order (`spec-coverage.md`, `version-partitioner.md`).

### D2 escape (mandatory)

Path registered but **unreachable** (outside workspace, no access): do **not** re-ask twice; do **not** block. Premise + impact (copy from that source at execution; diverge = UI rework). Severity **major**. Row in `unknowns-register.md`. Quote at Gate 1. Block on unreachable path drives `skip clarify` and loses gate.

### Criticality

Default detector hit = **major** (premise + impact, or waiver). **Critical** (blocks Gate 0) only if gap changes **public contract**, **persistence/schema**, or **makes the feature impossible**.

| Example | Severity |
| ------- | -------- |
| Report UI date range longer than only declared store; no other store | **critical** |
| Tenant-scoped secret; no lookup path for tenant | **critical** |
| Timeout or TTL as range in contract table | **major** — premise picks one bound + impact if wrong |
| Auth-failure limit only “short” / “generic” | **major** — premise picks value + what caller sees |
| Empty-state string missing; screen structure fully specified | **major** — premise “copy from registered layout source” |
| Display label vs never-hardcode (D3) | **major** unless it changes route or public identifier then **critical** |

Gate 0 pass unchanged: zero **critical** + human confirm, or recorded `skip clarify`. Majors ride as premises; Gate 1 lists them.

**UI close:** verbatim from `source/` **or** D2-registered layout SSoT plus listed target-app divergences.

## Multi-round

No one-round cap. Repeat until **critical unknowns = 0**.

- **5 questions** = per-round grouping guideline, not hard stop.
- **Number every ask** `1.` `2.` … one sequence for round (gaps then sensitive confirms). Invite reply `1: …` `2: sim`. Unnumbered wall of prose = forbidden.
- Round-trip **sensitive** items: constants, enums, transitions, rejection rules, UI flows/copy, inferences. Human must confirm those words.
- Silence, `proceed`, `quick mode`, `assume`, `pode seguir` **≠** confirmation.
- **`Tudo sim` / `all yes` / `sim em todos`:** yes on all remaining **yes/no** sensitive confirms (value already in ask). Not substitute for open questions.
- Assumptions only when written as **premises** in `clarify-contract.md` with **impact**.
- Non-answer: re-ask (`human-communication.md` Gate 0 voice). Do not fill gap silently.

## Artifacts (Step 3)

Write then **stop** at Gate 0 (`gates.md`):

| File | Role |
| ---- | ---- |
| `docs/versions/{version_san}/clarify-contract.md` | Scope, answered categories, assumed premises + impact, sensitive-item table |
| `docs/versions/{version_san}/unknowns-register.md` | Open / waived / accepted-with-risk |

Templates: `templates/clarify-contract.template.md`, `templates/unknowns-register.template.md`.

Do **not** write `requirements.md` here.

## Escape — `skip clarify`

Human says `skip clarify` (or clear equivalent):

1. Record **waiver** in `unknowns-register.md`.
2. Mark remaining criticals **accepted-with-risk**.
3. Quote waiver at **Gate 1** and **version closure**.

Without waiver: Gate 0 fail. Never Specify.

## Forbidden

- Specify with open critical unknown (no waiver)
- Silent assumption from unanswered critical
- Treat `proceed` / `pode seguir` as sensitive-item confirm
- Ignore `Tudo sim` on round that is only yes/no confirms
- Document “reasonable assumptions” without premises + impact
- Gate 0 / grill **chat** that quotes product error codes or asks human to confirm `FPA*` / ticket ids
- Dense UI inventory as `answered` when copy missing and no external SSoT
- Range / `TBD` / `impl.` / `to be defined` as `answered` without pin or premise
- Re-block loop on unreachable registered layout path (use D2 escape)
- Fourth detector for delivery phases (coverage + partition only)
