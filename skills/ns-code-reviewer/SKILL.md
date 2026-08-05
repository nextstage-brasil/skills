---
name: ns-code-reviewer
description: (NS) Senior Tech Lead code review on SOLID, clean code, performance, security, and testability. Use proactively after writing or modifying code, before opening PRs, after implementation closure, or when the user asks for a code review, PR review, or issue review gate — even if they do not name this skill. For GitLab issue execution with ISSUE_URL, use Issue review mode. Do NOT use for root-cause debugging (use ns-code-investigator).
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.3"
depends:
  - ns-harness
  - mcp-gitlab-usage
---

# Code Reviewer

Deep, constructive review of code changes against project rules and acceptance criteria.

## Caller contract (workflow callers)

When invoked by `ns-code-coder`, `ns-code-autonomous`, or `ns-execution-gitlab-issue`:

- The caller **must** read this `SKILL.md` and run this skill — not a Cursor Task subagent (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or improvised review.
- Gate rules for callers: `../ns-harness/references/review-gate-workflow.md`.
- Every response to a workflow caller **must** end with the exact parseable line: `Code Review: {Approved|Rejected|Blocked}` and include the overall score in **Executive Summary**.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. **Complete Session boot (blocking)** there before any other step in this skill.

## Workflow

1. **Re-read `AGENTS.md` (mandatory)** — Read `{product_root}/AGENTS.md` in full again for this review (and `agents.local.md` if present). Judge the diff against those orders and project rules — do not rely on memory from earlier in the session or from a prior Session boot.
2. Run `git diff` (and `git status` if needed).
3. Focus on modified files and surrounding context.
4. Start immediately — do not ask permission to begin.

### Ad-hoc diff mode (from `ns-code-coder`)

When the invoker passes a working-tree diff only (no `ISSUE_URL`, no version-closure path):

1. Review `git diff` on the working tree.
2. Apply **Score gate** and severity rules below.
3. Last line of response to parent: `Code Review: {Approved|Rejected|Blocked}`

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

### Scoring unit

Score the **quality of the touched module/file after the diff**, not whether the hunk alone is correct. A minimal patch that leaves or worsens SSoT/DRY/OCP in that file **cannot** score 9–10.

### Score caps (apply the lowest that fits)

| Condition in the touched module | Max score |
|---------------------------------|-----------|
| New/changed behavior with config/lookup **split across 2+ places** (SSoT) | **7** |
| Same resolution block copied in **2+ functions** in the diff scope (DRY) | **7** |
| Predictable extension requires editing **3+ points** in the same file (weak OCP, e.g. provider) | **7** |
| Diff correct, zero Critical, but mediocre / inconsistent pattern in the file | **7–8** |

**9:** zero Critical **and** the smells above are absent or resolved in the touched module; predictable extension has one source of truth.

**10:** same as 9 **plus** no obvious fallback/redundancy; uniform pattern across the file.

### Anti-inflation

- **Forbidden:** “minimal diff / tests pass / AC ok ⇒ 10”
- **Required** in Executive Summary: one sentence justifying the score against this rubric (e.g. “cap 7 — apiKey outside preset”)

### Smell severity (SSoT / DRY / weak OCP)

Split SSoT or duplicated resolution in the touched module is at least a **Warning** (not Suggestion only). Prefer **Warning + score cap** over auto-Critical for these architectural smells. Keep **Critical** for bugs, security, and AC failures. Score ≤ 8 already forces `Rejected`.

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
- One sentence justifying the score against the score-cap rubric
- Two-line overall assessment

### Critical Issues

Omit only if none. Logic bugs, security, and AC / behavioral-proof failures. Do **not** list SSoT/DRY/weak-OCP smells here — those are **Warning** under Architecture and Clean Code, enforced by the score cap (see **Smell severity**).

### Architecture and Clean Code Improvements

Refactoring suggestions, component boundaries, patterns.

### Refactored Code

Include only when user requests concrete fixes.

## Constraints

- **Read-only.** Do not edit, create, or delete files — output is a review report, not a fix
- **Not substitutable.** Workflow callers must invoke this skill by name; platform review subagents are not equivalent unless the human explicitly requests them for this run
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
