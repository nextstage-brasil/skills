---
name: ns-code-reviewer
description: (NS) Senior Tech Lead code review on SOLID, clean code, performance, security, and testability. Use proactively after writing or modifying code, before opening PRs, after implementation closure, or when the user asks for a code review, PR review, or issue review gate — even if they do not name this skill. For GitLab issue execution with ISSUE_URL, use Issue review mode. Do NOT use for root-cause debugging (use ns-code-investigator).
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
  - mcp-gitlab-usage
---

# Code Reviewer

Deep, constructive review of code changes against project rules and acceptance criteria.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. **Complete Session boot (blocking)** there before any other step in this skill.

## Workflow

1. Run `git diff` (and `git status` if needed).
2. Focus on modified files and surrounding context.
3. Start immediately — do not ask permission to begin.

### Version closure

When invoked at version closure, save output to `{product_root}/docs/versions/{version_san}/code-review-report.md` using `references/review-report.template.md`. Apply **Score gate**; end the chat response with `Code Review: {Approved|Rejected|Blocked}` so callers can parse the verdict.

### Issue review mode

When invoker passes `ISSUE_URL` (or `project_id` + `issue_iid`):

1. Delegate issue context to `ns-execution-gitlab-issue` context flow or `gitlab-issue-context-agent` — do not call `read_issue` yourself if a synthesis block is provided.
2. Diff `origin/<target>...origin/<source>` from synthesis — never review wrong branch.
3. **Requirement proof gate:** every AC needs behavioral evidence; producer-only code without consumer is Critical.
4. **Verdict (exactly one):** `Approved` | `Rejected` | `Blocked` — apply **Score gate** below.
5. Post internal GitLab comment via `mcp-gitlab-usage` — first line: `Code Review | YYYY-MM-DD HH:MM (UTC) | Verdict: {Approved|Rejected|Blocked}`
6. Last line of response to parent: `Code Review: {Approved|Rejected|Blocked}`

## Score gate (all modes)

Every review **must** include an overall score **1–10**. Callers treat this as a hard pass bar.

| Score | Meaning | Verdict impact |
|-------|---------|----------------|
| **10** | Ideal — ship as-is | Eligible for `Approved` |
| **9** | Minimum pass | Eligible for `Approved` |
| **≤8** | Below bar | **Must** be `Rejected` (even with zero Criticals) |

**`Approved` only when all are true:**

1. Zero Critical findings
2. Overall score **≥ 9**/10 (target **10**/10)
3. In Issue review mode: every AC is PASS with behavioral evidence

**`Rejected` when:** any Critical, **or** score ≤ 8, **or** (Issue mode) any AC fails behavioral proof.

Do not inflate scores to clear the gate. A clean but mediocre diff scores 7–8 and is Rejected until quality rises.

## Review priorities

Within each section, order by severity:

1. Critical (must fix before merge)
2. Warning (should fix)
3. Suggestion (consider)

When the diff touches `agent-api` (or LangGraph runtime paths), load `../ns-langgraph-agents/references/anti-patterns.md` and treat Placement, Prompt inject, Bind parity, Spec drift, and colon wire names as Critical if violated.

### SOLID and clean code

- SRP, OCP, LSP, ISP, DIP
- Naming, cyclomatic complexity, error handling, dead code

### Performance, security, testability

- N+1, unnecessary renders, missing validation
- SQL injection, XSS, sensitive logs
- Coupling that blocks testing

## Required output format

Structure every review as:

### Executive Summary

- Score 1–10 (see **Score gate** — pass bar ≥9, ideal 10)
- Two-line overall assessment

### Critical Issues

Omit only if none. Logic bugs, security, severe SOLID or architecture violations.

### Architecture and Clean Code Improvements

Refactoring suggestions, component boundaries, patterns.

### Refactored Code

Include only when user requests concrete fixes.

## Constraints

- **Read-only.** Do not edit, create, or delete files — output is a review report, not a fix
- Direct and constructive; no personal criticism
- Do not rewrite unrelated code
- Base findings on actual diff and rules read
- Match project conventions visible in codebase

## References

| File                                                 | When                             |
| ---------------------------------------------------- | -------------------------------- |
| `references/review-report.template.md`               | Version closure report           |
| `../ns-harness/references/artifact-layout.md` | Report path                      |
| `mcp-gitlab-usage`                                   | Posting internal review comments |
