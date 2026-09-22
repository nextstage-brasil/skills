# Entry triggers — priority 4b

Skill: `ns-investigator`. Host scans after priorities 1–3 and 4a, before 5.

## Use when (diagnosis only — no implement request)

- "Why does X break?"
- "What's causing this error?"
- "Investigate this failure"
- "Root cause of …"
- Paste-only: stack trace, CI log, test output, exception — **no** fix/implement words, **no** screen story
- "CI failed on main" / "pipeline broke" without "fix it"

## Do not use as entry

- Product report / screen expected vs actual / "what is happening on this screen" → `ns-bug-report-diagnosis` (priority 4a)
- "Fix …" / "implement …" / "quick fix" → `ns-coder` (priority 5)
- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` (priority 1)
- Multi-day / version scope → `ns-spec-driven` (priority 2)

## vs priority 4a (`ns-bug-report-diagnosis`)

| This skill (4b) | Bug-report diagnosis (4a) |
| --------------- | ------------------------- |
| Stack, CI, log, failing test | Screen / product story |
| RCA + Suggested Code | Tester language + fixer pointer, no patch |

## vs priority 5 (`ns-coder`)

| This skill (4b) | Coder (5) |
| --------------- | --------- |
| Understanding only | Code change requested |
| "Why does login fail?" (error/log) | "Fix login failure" |
| Stack trace paste only | Stack trace + "fix this" |
| "CI is red" | "CI is red — fix it" |

One clarifying question if ambiguous. If still unclear after that, host defaults to priority **5**.
