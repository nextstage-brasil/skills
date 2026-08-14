# Entry triggers — priority 1

Skill: `ns-execution-gitlab-issue`. Host scans this row before priorities 2–5.

## Use when

- User provides a GitLab `ISSUE_URL`
- "Implement this issue" / "execute issue #123" with GitLab context
- Issue reference (`#123`) when MCP GitLab is available and execution is intended

## Do not use as entry

- Local ad-hoc coding without an issue → `ns-coder` (priority 5)
- Autonomous local plan without issue → `ns-autonomous` (priority 3)
- Diagnosis-only without execution intent → `ns-investigator` (priority 4)

## Example phrases

- "https://gitlab…/issues/482"
- "Implement GitLab issue 482"
- "Run issue #482 end to end"
