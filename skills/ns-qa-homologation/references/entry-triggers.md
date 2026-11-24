# Entry triggers — explicit invocation only

Skill: `ns-qa-homologation`. **No automatic routing**: a bare `ISSUE_URL` stays priority 1 (`ns-execution-gitlab-issue`). Host table wiring (`code-skill-routing.md` keyword row, priority 0) = Phase 6; until then this file is the trigger source.

## Reliable entry (until Phase 6)

**`/ns-qa-homologation <ISSUE_URL or IID>`**. Generated consumer `AGENTS.md` still hard-stops any GitLab `ISSUE_URL` to `ns-execution-gitlab-issue`, which sets `status_in_progress` on first act. Host routing that table can misroute keyword phrases → use the slash command.

Homologation keyword + URL ≠ bare `ISSUE_URL`: **keyword wins** (routing row for this lands in Phase 6).

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
