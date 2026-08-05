# Review gate workflow (mandatory)

Fixed workflow for implementation skills that close with a code review. **Not** "run any review" — only the named skill `ns-code-reviewer` (preferably via the harness bridge `reviewer-agent`).

Callers: `ns-code-coder`, `ns-code-autonomous` (standalone closure), `ns-execution-gitlab-issue` (Phase 4). Subagents dispatched as `C2` inherit the same gate from `ns-code-coder`.

## Invocation (only allowed path)

1. **Prefer** harness project agent `reviewer-agent` when available — see `subagent-dispatch.md`. That bridge loads `AGENTS.md` then `ns-code-reviewer`.
2. **Else** read `../ns-code-reviewer/SKILL.md` and follow its workflow for the active mode (ad-hoc diff, version closure, or Issue review).
3. The reviewer run is this skill (via bridge or direct) — not a paraphrase, not a platform persona that "acts like" the reviewer.

**Forbidden substitutes** (unless the human explicitly requests that substitute for this run):

- Cursor Task subagents: `senior-tech-lead-reviewer`, `bugbot`, `security-review`
- Any other persona, generic "code review", or improvised checklist in place of `ns-code-reviewer`

**Allowed:** `reviewer-agent` (harness thin bridge). It is **not** a substitute.

Substituting with forbidden personas breaks the contract: score gate, verdict line, and (Issue mode) GitLab comment are defined only on `ns-code-reviewer`.

## Rounds (max 3)

| After review | Condition | Next action |
| ------------ | --------- | ----------- |
| Pass | Zero Criticals **and** score ≥ **9**/10 | Caller may close (`ns-code-coder`: living specs step if conditional, then final report; others: delivery / `Fatto!`) |
| Fail | Criticals **or** score ≤ **8**, rounds left | Minimal fix in scope → re-run tests if in scope → **mandatory re-review** via `reviewer-agent` / `ns-code-reviewer` |
| Stop | `Blocked`, or 3 rounds exhausted still failing | Report **blocked** — never fabricate success |

**After fixing a Critical:** a new `ns-code-reviewer` round is **required** (prefer `reviewer-agent`). A fix alone does not clear the gate.

## Pre-review (callers with implementation)

Before the first review round:

- Run tests covering changed files per `AGENTS.md` and `docker-and-testing.md`.
- If the diff removes exports, constants, env flags, or public symbols: search the repo for remaining call sites and resolve before review.

## Done gate (non-negotiable)

Do **not** use "done", "concluído", "complete", or success language unless **one** of:

1. Last `ns-code-reviewer` verdict is `Approved` (score ≥ 9, zero Criticals), or
2. The run is explicitly **blocked** (verdict `Blocked`, or 3 rounds exhausted) with open Criticals and/or last score stated.

A `Rejected` verdict followed by a local fix **without** a passing re-review is **not** done.

## Final report (callers)

Every closure response **must** include:

| Field | Required value |
| ----- | -------------- |
| Active skill | e.g. `ns-code-coder` |
| Reviewer skill | `ns-code-reviewer` only (via `reviewer-agent` when dispatched) |
| Review round | Last round executed: `1`, `2`, or `3` |
| Score | Last overall score from reviewer |
| Verdict | Exact parseable line from reviewer: `Code Review: {Approved\|Rejected\|Blocked}` |
| Living specs | When caller is `ns-code-coder`: `updated` \| `skipped: {reason}` \| `n/a` |

Then: summary of changes, follow-ups, and blocked items if applicable.
