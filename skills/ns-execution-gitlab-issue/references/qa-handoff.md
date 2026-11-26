# QA handoff (Phase 5)

Dev → QA contract = one file. Never calls QA. Homologation starts only when a human invokes `ns-qa-homologation`.

## When

Phase 4 returned `Code Review: Approved` **and** `Delivery Review: Approved`, Phase 3 step 4 done, MR open (`MR_URLS`). Any other outcome → no handoff.

## File

`docs/qa/handoff/{issue_iid}/qa-handoff.md` in **main checkout** (not worktree). `docs/qa/` gitignored: never staged, never committed, never in MR. Overwrite on re-delivery (reused branch).

| Section | Content |
| ------- | ------- |
| Header | `issue: <project>#<iid>` · `mr: <project>!<iid>` + URL · `branch: <WORK_BRANCH>` · `target: <SOURCE_BRANCH>` · `commit: <sha>` · `delivered: <UTC ISO>` |
| `## Acceptance criteria` | One line per AC, from the Phase 4 `--ac-file` synthesis. `- AC-<n>: <observable behavior>`; ids in source order, stable, one behavior each, no renumbering. Optional suffix ` (criticality: critical\|high\|medium\|low)` only when the issue states it |
| `## How to verify` | Numbered steps: entry point, data needed, action, expected result per AC id. Bug flow: original reproduction steps + "defect no longer reproduces"; reuse diagnosis section 3 ("How to check after the fix") when `diagnosis_complete` payload has it |
| `## Notes` | Optional: known limits, flags, migrations. No credentials, no environment values |

No AC found in synthesis → write the header + `How to verify` from issue text and state `ACs: none stated` — never invent ACs.

## Issue template (SDD unit mode only)

Unit issue description has `## Homologation` (`ns-spec-driven` → `templates/gitlab-unit-issue.template.md`). After the file is written:

1. `read_issue` → current description (never use a stale copy).
2. Replace **only** the `## Homologation` body with the AC list (`- AC-<n>: …`). Other sections byte-identical.
3. `update_issue` with the full description. Section missing → skip; log once.

External issue mode: no template edit.

## Stop

Handoff ends the run. Never: set a QA status, dispatch `qa-agent`, invoke `ns-qa-homologation`, comment "ready for QA" on a partner issue.

## Consumer

`ns-qa-homologation` Q1 reads the file when present (`../../ns-qa-homologation/references/intake.md`); Q2 reuses AC ids verbatim. Absent → tracker text only.
