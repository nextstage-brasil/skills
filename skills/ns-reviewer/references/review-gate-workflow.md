# Review gate workflow (mandatory)

Fixed close for implementation skills. **Two sequential gates.** Code first (`ns-reviewer`), then delivery (`ns-judge`). Each `Approved` only at score **10**/10.

**Not** "run any review". Code path = `ns-reviewer` (**MUST** via `reviewer-agent` when available — `../../ns-harness/references/subagent-dispatch.md`). Judge path = **same parent** reads `../ns-judge/SKILL.md` **in-session** after reviewer child returns `Code Review: Approved`. No `judge-agent` in v1. Human `/ns-judge` = session face only.

`ns-reviewer` is **read-only** and **MUST NOT** dispatch `ns-judge`.

Callers: `ns-coder` (ad-hoc / C2), `ns-autonomous` (standalone closure), `ns-execution-gitlab-issue` (Phase 4), `run-implementation` Step 5 (SDD version closure). `C2` under `ns-autonomous` inherits `ns-coder` gate.

**Exception — SDD handoff tasks:** `ns-coder` under `execution-handoff` / `run-implementation` **must not** invoke reviewer **or** judge per task. Parent runs **once** at version closure (Step 5).

`ns-spec-driven` Close does **not** run a second pair if Step 5 already did.

Not a version (no `docs/versions/` task list): `ns-coder` ad-hoc / C2, and `ns-execution-gitlab-issue` Phase 4, still close **that unit** with the same pair (code then judge).

## Who calls ns-judge

Same parent that already calls `ns-reviewer`. Only after last code verdict is `Code Review: Approved`.

| Parent | When | Then, only if `Code Review: Approved` |
| ------ | ---- | ------------------------------------- |
| `run-implementation` Step 5 | all version tasks done | `ns-judge` closure (`requirements.md`) |
| `ns-autonomous` | standalone version closure | same |
| `ns-coder` ad-hoc / C2 | that implementation finished (no version tasks) | `ns-judge` adhoc; skip AC proof if no `--requirements` / `--ac-file` |
| `ns-execution-gitlab-issue` Phase 4 | that issue delivered | `ns-judge` issue (`--ac-file`) |

Sequence: tests; `ns-reviewer`; `ns-judge` only if `Code Review: Approved`; `ns-living-spec` only if `Delivery Review: Approved`.

Rejected/Blocked on code → **do not** run `ns-judge`. Fix → code re-review (max 3). Judge never sees dirty code.

Judge Rejected → fix map → implement. Product files changed → code review again (must `Approved`) → then judge again. Judge is never first look at new code.

## Invocation (code — only allowed path)

1. **MUST** dispatch `reviewer-agent` when available — `../../ns-harness/references/subagent-dispatch.md`. Bridge Session boot at cold start (`../../ns-harness/references/session-boot.md`, then `ns-reviewer`). Inline `Skill(ns-reviewer)` while bridge present = forbidden.
2. **Else** (bridge missing) read `../SKILL.md`; follow active mode (ad-hoc diff, version closure, Issue review).
3. Reviewer run = this skill (bridge or direct) — not paraphrase, not platform persona.
4. Last line from reviewer: `Code Review: {Approved|Rejected|Blocked}`.

**Forbidden substitutes** (unless the human explicitly requests that substitute for this run):

- Cursor Task subagents: `senior-tech-lead-reviewer`, `bugbot`, `security-review`
- Any other persona, generic "code review", or improvised checklist in place of `ns-reviewer`

**Allowed:** `reviewer-agent` (harness thin bridge). It is **not** a substitute.

## Invocation (judge)

1. Last line from reviewer **must** be `Code Review: Approved`. Else stop. No judge.
2. Read `../../ns-judge/SKILL.md` in-session (`references/workflow.md` for CLI). Python optional; missing `python3` or script exit 1 → skip scripts, residual still runs. Never Blocked because Python absent.
3. Last line from judge: `Delivery Review: {Approved|Rejected|Blocked}`. Adhoc with no AC source: AC proof `n/a`; residual still emits the line.

## Verdict vs caller close

`ns-reviewer` **`Approved`** = zero Criticals **and** score **= 10**. `ns-judge` **`Approved`** = same bar on delivery proof (`../../ns-judge/SKILL.md` Score gate — copy, not a second rubric). Caller **close** = **both** `Approved`. Score **9** on either gate = `Rejected` (Lift).

## Rounds (max 3 per gate)

### Code

| After review | Condition | Next action |
| ------------ | --------- | ----------- |
| Pass (ship to judge) | `Code Review: Approved` (score **= 10**, zero Criticals) | Parent invokes `ns-judge` |
| Lift | `Rejected` **and** score **= 9**, rounds left | In-scope quality fix toward **10** → tests if in scope → **mandatory re-review** via `reviewer-agent` / `ns-reviewer`. No judge. |
| Fail | Criticals **or** score ≤ **8**, rounds left | Minimal fix in scope → tests if in scope → **mandatory re-review**. No judge. |
| Stop | `Blocked`, or 3 rounds exhausted | Report **blocked** — never fabricate success. No judge. |

**After Critical fix** (or Lift at 9): new `ns-reviewer` round **required**. Fix alone does not clear gate.

P2 suggestions: **do not** block when `Approved` (score **10**). Score **9** still **Lift** even if P2 only.

### Delivery

| After judge | Condition | Next action |
| ----------- | --------- | ----------- |
| Pass | `Delivery Review: Approved` (score **= 10**, zero Criticals) | Caller may close (`ns-living-spec` if conditional, then final report / `Fatto!`) |
| Lift | `Rejected` **and** score **= 9**, rounds left | Fix map → implement. If product files changed: **code review first** (must `Approved`) then judge again |
| Fail | Criticals **or** score ≤ **8** (missing AC token / unmet ledger / missing testid), rounds left | Same as Lift |
| Stop | `Blocked`, or 3 judge rounds exhausted | Report **blocked** |

`prove_ac.py` exit 2: `Delivery Review: Rejected`, no residual LLM, counts as a Fail round.

## Pre-review (callers with implementation)

Before the first **code** review round:

- Run tests covering changed files per `AGENTS.md` and `../../ns-harness/references/docker-and-testing.md`.
- If the diff removes exports, constants, env flags, or public symbols: search the repo for remaining call sites and resolve before review.

## Done gate (non-negotiable)

Do **not** use "done", "concluído", "complete", or success language unless:

1. Last `ns-reviewer` verdict is `Approved` (score **10**) **and** last `ns-judge` verdict is `Approved` (score **10**), or
2. Run explicitly **blocked** (either gate `Blocked`, or 3 rounds exhausted on that gate) with open Criticals and/or last score stated.

Score **9** = `Rejected` — **not** done. `Rejected` + local fix **without** new `Approved` round = **not** done.

## Final report (callers)

Every closure response **must** include:

| Field | Required value |
| ----- | -------------- |
| Active skill | e.g. `ns-coder` |
| Reviewer skill | `ns-reviewer` only (via `reviewer-agent` when dispatched) |
| Review round | Last code round: `1`, `2`, or `3` |
| Code score | Last overall score from reviewer |
| Code verdict | Exact parseable line: `Code Review: {Approved\|Rejected\|Blocked}` |
| Judge skill | `ns-judge` (in-session; `n/a` if code never Approved) |
| Judge round | Last delivery round: `1`, `2`, or `3` \| `n/a` |
| Delivery score | Last overall score from judge \| `n/a` |
| Delivery verdict | Exact line: `Delivery Review: {Approved\|Rejected\|Blocked}` \| `n/a` (code not Approved). Adhoc AC proof may be `n/a` inside judge report when no `--requirements` / `--ac-file` |
| Living specs | When caller is `ns-coder`: `updated` \| `skipped: {reason}` \| `n/a` |
| Layout SSoT | When caller is `ns-coder`: `{path} read` \| `none registered` |

Then: summary of changes, follow-ups, and blocked items if applicable.
