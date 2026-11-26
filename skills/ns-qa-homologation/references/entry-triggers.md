# Entry triggers — explicit invocation only

Skill: `ns-qa-homologation`. **No automatic routing**: never URL-driven. Host table row **0** (`ns-harness` → `references/code-skill-routing.md`) fires on an explicit keyword only.

## Routing rule

Homologation keyword + issue URL/IID ≠ bare `ISSUE_URL`: **keyword wins** (priority 0). Bare `ISSUE_URL` without keyword → `ns-execution-gitlab-issue` (priority 1). Generated consumer `AGENTS.md` carries the same exception on its `ISSUE_URL` hard stop when this skill is installed. Dev delivery never starts homologation; it only leaves `qa-handoff.md` (`ns-execution-gitlab-issue` Phase 5). Runs in-session; bridge `qa-agent` only when asked by name.

## Use when

- `/ns-qa-homologation <ISSUE_URL or IID>` (preferred)
- "homologate <ISSUE_URL>" / "homologar <ISSUE_URL>" (user-language keyword)
- "acceptance QA" / "run QA on this delivered issue"
- "plan the homologation of #123" (L0 plan + report)
- "discover the QA profile" (profile discovery only)

Keyword + issue reference required. Keyword alone without issue → ask for the issue.

## Do not use as entry

- Bare `ISSUE_URL` / "implement this issue" / "execute issue #123" → `ns-execution-gitlab-issue` (priority 1)
- Delivery proof of a diff vs ACs after `Code Review: Approved` → `ns-judge`
- Write / refactor Cypress specs, scaffold E2E → `ns-e2e-tests`
- Code / MR review → `ns-reviewer`
- Product bug report (screen expected vs actual) → `ns-bug-report-diagnosis` (priority 4a)
- Plan E2E task markdown inside a version → `ns-spec-driven`

## Example phrases

- "homologate https://gitlab…/issues/482"
- "homologar #482"
- "acceptance QA for group/app#482, plan only"
