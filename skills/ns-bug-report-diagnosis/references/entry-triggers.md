# Entry triggers — priority 4a

Skill: `ns-bug-report-diagnosis`. Host scans after priorities 1–3, **before** 4b and 5. Scan **1 → 5** stays intact; 4 still beats 5.

## Use when (product report — no implement request)

- Relato / ticket / described screenshot / "what is happening" / "diagnose this"
- Expected vs actual **on a screen** (button hangs, list vs detail disagree, save then reopen shows something else)
- `/ns-bug-report-diagnosis`
- Paste of a product story (who, screen, expected, actual) — even without naming this skill

## Do not use as entry

- "Fix …" / "implement …" / "quick fix" → `ns-coder` (priority 5)
- GitLab `ISSUE_URL` **execution** ("implement this issue") → `ns-execution-gitlab-issue` (priority 1)
- Stack trace / CI log / test output **with no screen story** → `ns-investigator` (priority 4b)
- Multi-day / version scope → `ns-spec-driven` (priority 2)
- DB-only inspection when the consumer has a DB skill

An `ISSUE_URL` **inside** this skill (user already invoked diagnosis) is read-only via MCP. Host scan still gives bare execution `ISSUE_URL` to priority 1.

## vs priority 4b (`ns-investigator`)

| This skill (4a) | Investigator (4b) |
| --------------- | ----------------- |
| Screen / product story | Stack, CI, log, failing test |
| Two audiences: tester + fixer pointer | RCA + Suggested Code |
| No patch | Minimal fix proposal |

## vs priority 5 (`ns-coder`)

| This skill (4a) | Coder (5) |
| --------------- | --------- |
| Understanding only | Code change requested |
| "The publish button spins forever" | "Fix the publish button" |
| Ticket pasted as a report | Ticket + "implement this" |

## Examples (first match still follows 1 → 5)

| User message | Winner |
| ------------ | ------ |
| "When I publish, the UI hangs with no error" | **4a** this skill |
| Paste of a stack trace, no screen story | **4b** `ns-investigator` |
| "Fix this" / "implement the patch" | **5** `ns-coder` |

One clarifying question if the report is empty. If still empty after that, stop — do not default to coder from this skill.
