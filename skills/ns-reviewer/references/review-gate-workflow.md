# Review gate workflow (mandatory)

Fixed workflow for implementation skills closing with code review. **Not** "run any review" — only `ns-reviewer` (**MUST** via `reviewer-agent` when available — `../../ns-harness/references/subagent-dispatch.md`).

Callers: `ns-coder` (ad-hoc / C2), `ns-autonomous` (standalone closure), `ns-execution-gitlab-issue` (Phase 4), `run-implementation` Step 5 (SDD version closure). `C2` under `ns-autonomous` inherits `ns-coder` gate.

**Exception — SDD handoff tasks:** `ns-coder` under `execution-handoff` / `run-implementation` **must not** invoke gate per task. Parent runs **once** at version closure (Step 5).

## Invocation (only allowed path)

1. **MUST** dispatch `reviewer-agent` when available — `../../ns-harness/references/subagent-dispatch.md`. Bridge Session boot at cold start (`../../ns-harness/references/session-boot.md`, then `ns-reviewer`). Inline `Skill(ns-reviewer)` while bridge present = forbidden.
2. **Else** (bridge missing) read `../SKILL.md`; follow active mode (ad-hoc diff, version closure, Issue review).
3. Reviewer run = this skill (bridge or direct) — not paraphrase, not platform persona.

**Forbidden substitutes** (unless the human explicitly requests that substitute for this run):

- Cursor Task subagents: `senior-tech-lead-reviewer`, `bugbot`, `security-review`
- Any other persona, generic "code review", or improvised checklist in place of `ns-reviewer`

**Allowed:** `reviewer-agent` (harness thin bridge). It is **not** a substitute.

Substituting with forbidden personas breaks the contract: score gate, verdict line, and (Issue mode) GitLab comment are defined only on `ns-reviewer`.

## Reviewer verdict vs caller close

`ns-reviewer` **`Approved`** = zero Criticals **and** score **= 10**. Caller **close** = `Approved`. Score **9** = `Rejected` (Lift). No second rubric — score caps in `../SKILL.md`.

## Rounds (max 3)

| After review | Condition | Next action |
| ------------ | --------- | ----------- |
| Pass (ship) | `Approved` (score **= 10**, zero Criticals) | Caller may close (`ns-coder`: living specs if conditional, then final report; others: delivery / `Fatto!`) |
| Lift | `Rejected` **and** score **= 9**, rounds left | In-scope quality fix toward **10** → tests if in scope → **mandatory re-review** via `reviewer-agent` / `ns-reviewer` |
| Fail | Criticals **or** score ≤ **8**, rounds left | Minimal fix in scope → tests if in scope → **mandatory re-review** via `reviewer-agent` / `ns-reviewer` |
| Stop | `Blocked`, or 3 rounds exhausted | Report **blocked** — never fabricate success |

**After Critical fix** (or Lift at 9): new `ns-reviewer` round **required** (**MUST** `reviewer-agent` when available). Fix alone does not clear gate.

P2 suggestions: **do not** block when `Approved` (score **10**). Score **9** still **Lift** even if P2 only.

## Pre-review (callers with implementation)

Before the first review round:

- Run tests covering changed files per `AGENTS.md` and `../../ns-harness/references/docker-and-testing.md`.
- If the diff removes exports, constants, env flags, or public symbols: search the repo for remaining call sites and resolve before review.

## Done gate (non-negotiable)

Do **not** use "done", "concluído", "complete", or success language unless:

1. Last `ns-reviewer` verdict is `Approved` (score **10**), or
2. Run explicitly **blocked** (verdict `Blocked`, or 3 rounds exhausted) with open Criticals and/or last score stated.

Score **9** = `Rejected` — **not** done. `Rejected` + local fix **without** new `Approved` round = **not** done.

## Final report (callers)

Every closure response **must** include:

| Field | Required value |
| ----- | -------------- |
| Active skill | e.g. `ns-coder` |
| Reviewer skill | `ns-reviewer` only (via `reviewer-agent` when dispatched) |
| Review round | Last round executed: `1`, `2`, or `3` |
| Score | Last overall score from reviewer |
| Verdict | Exact parseable line from reviewer: `Code Review: {Approved\|Rejected\|Blocked}` |
| Living specs | When caller is `ns-coder`: `updated` \| `skipped: {reason}` \| `n/a` |
| Layout SSoT | When caller is `ns-coder`: `{path} read` \| `none registered` |

Then: summary of changes, follow-ups, and blocked items if applicable.
