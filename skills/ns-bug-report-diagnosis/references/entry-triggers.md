# Entry triggers — priority 4a

Skill: `ns-bug-report-diagnosis`. Host scans after priorities 1–3, **before** 4b and 5. Scan **1 → 5** stays intact; 4 still beats 5.

After the eight-section report, this skill **dispatches** `ns-execution-gitlab-issue` (if `ISSUE_URL`) or `ns-coder`, unless diagnose-only. See `continue-handoff.md`.

## Use when (product report)

- Relato / ticket / described screenshot / "what is happening" / "diagnose this"
- Expected vs actual **on a screen** (button hangs, list vs detail disagree, save then reopen shows something else)
- `/ns-bug-report-diagnosis`
- Paste of a product story (who, screen, expected, actual) — even without naming this skill

Screen story still wins **4a** even when the user will want a fix afterwards. Diagnose first, then dispatch. Do not skip this skill to go straight to coder on a screen story without implement-only wording.

## Diagnose-only opt-out (report, then stop)

- "só diagnostica" / "diagnose only" / "não corrige" / "do not fix" / "don't change code" / "não mexa no código"
- `/ns-bug-report-diagnosis` with an explicit request not to implement

## Do not use as entry

- "Fix …" / "implement …" / "quick fix" **without** a screen story → `ns-coder` (priority 5)
- GitLab `ISSUE_URL` **execution as the host's first skill** ("implement this issue", bare URL) → `ns-execution-gitlab-issue` (priority 1)
- Stack trace / CI log / test output **with no screen story** → `ns-investigator` (priority 4b)
- Multi-day / version scope → `ns-spec-driven` (priority 2)
- DB-only inspection when the consumer has a DB skill

An `ISSUE_URL` **inside** this skill (user already on 4a) is read-only via MCP, then continue-handoff sends **G** with `diagnosis_complete`. Host scan still gives bare execution `ISSUE_URL` to priority 1.

## vs priority 4b (`ns-investigator`)

| This skill (4a) | Investigator (4b) |
| --------------- | ----------------- |
| Screen / product story | Stack, CI, log, failing test |
| Two audiences: tester + fixer pointer | RCA + Suggested Code |
| No patch **here**; then G or C | Minimal fix proposal; human gate remains |

## vs priority 5 (`ns-coder`)

| This skill (4a) | Coder (5) |
| --------------- | --------- |
| Screen story first, then dispatch C/G | Code change requested without a screen story, or C after `diagnosis_complete` |
| "The publish button spins forever" | "Fix the publish button" (no product story) |
| Ticket pasted as a report | Ticket + "implement this" as host entry, or BRD payload |

`diagnosis_complete: true` on a coder handoff = implement intent. Coder must **not** bounce back to 4a.

## Examples (first match still follows 1 → 5)

| User message | Winner |
| ------------ | ------ |
| "When I publish, the UI hangs with no error" | **4a** this skill, then dispatch **C** |
| Same + "do not fix" | **4a** this skill, then **stop** |
| Screen story + `ISSUE_URL` (already in 4a) | **4a** then dispatch **G** |
| Paste of a stack trace, no screen story | **4b** `ns-investigator` |
| "Fix this" / "implement the patch" (no screen story) | **5** `ns-coder` |

Recover symptom from URL / issue body / screenshot / session when the paste looks empty. Ask one clarifying question and stop only if still empty **and** no URL. Do not default to coder from an empty 4a report.
