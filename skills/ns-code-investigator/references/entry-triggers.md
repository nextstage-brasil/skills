# Entry triggers — priority 4

Skill: `ns-code-investigator`. Host scans after priorities 1–3, before 5.

## Use when (diagnosis only — no implement request)

- "Why does X break?"
- "What's causing this error?"
- "Investigate this failure"
- "Root cause of …"
- Paste-only: stack trace, CI log, test output, exception — **no** fix/implement words
- "CI failed on main" / "pipeline broke" without "fix it"

## Do not use as entry

- "Fix …" / "implement …" / "quick fix" → `ns-code-coder` (priority 5)
- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` (priority 1)
- Multi-day / version scope → `ns-spec-driven` (priority 2)

## vs priority 5 (`ns-code-coder`)

| This skill (4) | Coder (5) |
| -------------- | --------- |
| Understanding only | Code change requested |
| "Why does login fail?" | "Fix login failure" |
| Stack trace paste only | Stack trace + "fix this" |
| "CI is red" | "CI is red — fix it" |

One clarifying question if ambiguous. If still unclear after that, host defaults to priority **5**.
