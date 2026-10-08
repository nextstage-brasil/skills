<!--
TEMPLATE METADATA (skill only — strip this whole comment from the final document)
template: decision-register
template_version: 1.0
Protocol: references/decision-coverage.md
- One register per version: docs/versions/{version_san}/pm/decision-register.md
- Same Q-NN ids as the chat batch. Source of the PRD's decisions: every decided row is rewritten into the PRD as requirement text, never pasted as question/answer.
- Update every round. PRD and budget are generated from the decisions here; on conflict, this file wins.
- Translate headings and labels to the human's language. Ids and D1–D14 stay as-is.
-->

# Decision register — {version_san}

| Field | Value |
|---|---|
| **Readiness** | {Draft \| Business-validated \| Dev-lens checked \| Frozen} |
| **Open decisions** | {n} ({Q ids}) |
| **Unapproved assumptions** | {n} ({Q ids}) |
| **Open conflicts** | {n} ({C ids}) |
| **Last round** | {round_number} — {YYYY-MM-DD} |

## Coverage

<!-- One row per in-scope capability. Cell = answered / n/a: reason / assumed (Q-NN) / open (Q-NN). Drop D13 column when no automation or AI is in scope. -->

| Capability | D1 Plan | D2 Roles | D3 Defaults | D4 Config level | D5 Values | D6 Exceptions | D7 Inputs | D8 Time | D9 Output | D10 Lifecycle | D11 Blast radius | D12 Data/privacy | D13 AI | D14 Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| {RF-01 / Feature 001} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} | {state} |

## Decisions

| ID | Dim | Capability | Question | Recommended | Answer | Source | Status | Blocks |
|---|---|---|---|---|---|---|---|---|
| Q-01 | D{k} | {RF/Feature ids} | {question} | {proposal} | {answer or —} | {round N, who} | {open \| assumed \| answered \| n/a} | {RF ids, estimate, —} |

## Conflicts

| ID | Statement A (source) | Statement B (source) | Proposal | Resolution | Status |
|---|---|---|---|---|---|
| C-01 | {text} ({round/doc}) | {text} ({round/doc}) | {proposal} | {decision or —} | {open \| resolved} |

## Developer-lens log

| Date | Business questions surfaced | Technical left to engineering | Returned by development after handoff |
|---|---|---|---|
| {YYYY-MM-DD} | {n} ({Q ids}) | {m} | {k or —} |
