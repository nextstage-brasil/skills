# Entry triggers — priority 3

Skill: `ns-code-autonomous` (standalone pipeline). Host scans after priorities 1–2, before 4–5.

## Use when

- "Run autonomously" / "execute this plan autonomously"
- Local plan file path (`.plan.md`, pasted execution plan) **without** GitLab issue
- Ad-hoc multi-step autonomous implementation, no `ISSUE_URL`

## Do not use as entry

- GitLab issue origin → `ns-execution-gitlab-issue` (priority 1); this skill runs only as Phase 2 engine under that flow
- Single quick edit → `ns-code-coder` (priority 5)
- Partitioned version with `version-roadmap.md` → `ns-execution-orchestrator` via `ns-spec-driven`

## Example phrases

- "Run this plan autonomously in a worktree"
- "Execute the attached execution-handoff locally, no GitLab"
- "Autonomous run — plan pasted below"
