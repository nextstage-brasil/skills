---
name: ns-code-coder
description: "(NS) Ad-hoc coding worker — bug fixes, small refactors, scripts, migrations — without full SDD. Entry priority 5: use for \"just implement this\", \"quick fix\", or concrete coding without execution-handoff (also C2 under ns-code-autonomous). Do NOT use for GitLab ISSUE_URL (ns-execution-gitlab-issue), multi-day/version scope (ns-spec-driven), diagnosis-only (ns-code-investigator), or when execution-handoff.md exists. Do NOT generate requirements/tasks/handoff."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.6"
depends:
  - ns-harness
  - ns-code-investigator
  - ns-code-frontend-design
  - ns-code-best-practices
  - ns-code-backend-tests
  - ns-code-e2e-tests
  - ns-code-docs-writer
  - ns-code-reviewer
  - ns-code-autonomous
  - ns-sdd-living-spec-consolidator
---

# Code Coder

Central **execution worker** for ad-hoc diffs (and as `C2` subagent under `ns-code-autonomous`). **Not the front door** — the host agent picks entry per `../ns-harness/references/code-skill-routing.md`.

## Workflow mode (mandatory)

This skill is a **fixed workflow**, not a loose checklist. Steps run in order; handoffs use **named skills** or harness project bridges (`coder-agent` / `reviewer-agent` per `../ns-harness/references/subagent-dispatch.md`). Do not substitute platform Task personas or improvised review.

Canonical review gate: `../ns-harness/references/review-gate-workflow.md` — steps 7–9 **ad-hoc / C2 only**. Review **only** via `reviewer-agent` → `ns-code-reviewer` (**MUST** bridge when available; else skill direct); max **3** rounds; Critical fix → **re-review** mandatory; no success without pass or **blocked**. After **Approved**: **Living specs** (8) if match, then **Final report** (9).

**Exception — SDD handoff mode:** caller `run-implementation` / `execution-handoff.md` (or dispatch says SDD task mode) → **skip** review gate + living specs. Parent owns review at version closure. See **When invoked under execution-handoff**.

## Routing (read first)

| Signal | Redirect |
| ------ | -------- |
| GitLab `ISSUE_URL` detected | **Stop** → `ns-execution-gitlab-issue` |
| Multi-day / version / SDD scope | `ns-spec-driven` |
| Obscure bug, root cause unclear | `ns-code-investigator` |
| Ad-hoc diff ready | `reviewer-agent` → `ns-code-reviewer` (review loop below) |

Entry priority **5** (default). Harness table: `../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

### When to use (entry)

- Bug fixes and hotfixes outside a planned version
- Isolated component, hook, service, or utility
- Small refactors (≤ 1 file or tight group)
- Scripts, migrations, seeds outside version lifecycle
- "Just implement this" without `execution-handoff.md`

### When invoked as C2 (engine mode)

When `ns-code-autonomous` dispatches as work-unit subagent in existing worktree: unit scope only. Do **not** re-route to `ns-execution-gitlab-issue` on `ISSUE_URL` in code/comments — context, not routing. Escalate destructive doubts to caller (`A`), not GitLab skills. No living-spec consolidator as C2 — version closure/caller owns. Complete ad-hoc **Review loop** unless caller says SDD handoff / defer review.

### When invoked under execution-handoff (SDD task mode)

Parent `run-implementation` (classic SDD) or dispatch **SDD handoff / execution-handoff task**:

1. Task scope: `../ns-sdd-execution-handoff-generator/references/run-implementation.md`; handoff updates: `../ns-sdd-execution-handoff-generator/SKILL.md`.
2. Implement + unit/integration only. No E2E.
3. **Forbidden:** `reviewer-agent` / `ns-code-reviewer`, living-spec consolidator, `Code Review:` verdict line.
4. Report to parent: files changed, tests run, blockers. Parent Step 5 review once all tasks done.
5. Skip `AGENTS.md` / full rule re-read if Session boot already ran this session — re-read only if `agents.local.md` or harness rules changed.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. **Complete Session boot (blocking)** there before any other step in this skill.

## Session inputs

| Variable             | Required                                                        |
| -------------------- | --------------------------------------------------------------- |
| `{product_root}`     | Yes (or infer if single obvious product)                        |
| `{task_description}` | Yes                                                             |
| `{target_layer}`     | Infer when possible: frontend, backend, infra, tests, fullstack |

## Scope isolation

Operate only under `{product_root}/**` plus harness docs. Do not read other products in a monorepo unless asked.

## Boot (mandatory)

Complete **Session boot (blocking)** in `../ns-harness/references/harness-discovery.md`, then:

1. **`AGENTS.md`** — Ad-hoc / C2: full re-read (and `agents.local.md` if present). SDD handoff: skip if Session boot already ran unless `agents.local.md` / harness rules changed. Obey orders — no invented paths or cross-product changes.
2. `git status` and `git diff`
3. **Read target files before writing**

**Success criterion:** `AGENTS.md` orders + project rules + task scope = success; inventing paths, SDD artifacts (except handoff updates when parent owns them), or cross-product changes = failure.

## Implementation rules

- **Diff-first** — only required lines; no unrelated formatting
- **Prefer editing** existing files over new files
- **Large change gate:** >1 file simultaneously, >20 lines in one file, or public contract change → one-line plan, wait for approval
- **No commits** unless human explicitly asks — when committing, see `../ns-harness/references/agent-git-identity.md`
- **No SDD version artifacts** — no `task-NNN.md`, `requirements.md`, `execution-handoff.md`, or `docs/versions/` writes. Conditional living-spec updates under `docs/specs/` via `ns-sdd-living-spec-consolidator` are allowed (see **Living specs**).
- **No gratuitous comments** unless requested
- Run tests per `AGENTS.md` Docker and testing; project-specific container and commands live in `architecture-rules.md`
- Under `execution-handoff.md` / `run-implementation`: **unit/integration only** — no E2E (human at version end); no review gate (parent Step 5)

## Per-task cycle

**SDD handoff mode:** stop after step 6; report to parent; skip 7–9.

1. Understand task
2. Load rules — `AGENTS.md` orders (full re-read: first cycle this session, or rules/`agents.local.md` changed)
3. Explore (grep/head large fixtures — no full test dumps)
4. Identify minimal diff
5. Apply (or plan if large-change gate)
6. Run tests if in scope (see **Pre-review**)
7. **Review loop** — **MUST** `reviewer-agent` when available (else `ns-code-reviewer`); `../ns-harness/references/review-gate-workflow.md`
8. **Living specs (conditional)** — see below
9. **Final report** — mandatory fields; never skip verdict or round count

### Pre-review (before step 7)

- Tests covering changed files per `AGENTS.md` and `../ns-harness/references/docker-and-testing.md`.
- Diff removes exports/constants/env flags/public symbols: search remaining call sites; resolve before review.

## Review loop (mandatory ad-hoc / C2; skip SDD handoff)

After step 6, run `../ns-harness/references/review-gate-workflow.md` before done — **except SDD handoff** (return to parent; no review).

- **MUST** invoke **`reviewer-agent`** when available (else **`ns-code-reviewer`**) on the working-tree diff (`git diff`) — bridge/skill loads `AGENTS.md` then reviewer workflow; no `ISSUE_URL`, no version-closure path. Just the ad-hoc diff.
- **Max 3 rounds.** Score gate from `ns-code-reviewer`: pass ≥**9**/10, ideal **10**/10.
  - **Pass:** zero Critical Issues **and** overall score ≥ **9**/10 → proceed to step 8.
  - **Fail** (Criticals **or** score ≤ **8**) with rounds left → apply the minimal diff that clears Criticals and lifts quality to ≥9 (`reviewer-agent` / `ns-code-reviewer` is read-only, so this skill applies the fixes), re-run tests if in scope, then **mandatory re-review** via `reviewer-agent` (**MUST** when available; else `ns-code-reviewer`).
  - **Rounds exhausted** still failing the gate → **stop and report as blocked**. List unresolved Criticals and/or the last score. Do not report success. Skip step 8 (living specs).
- Keep fixes within the original task scope. If a Critical (or score-blocking Warning) requires changes outside scope (public contract, cross-product, multi-day work), stop and escalate per **Stop conditions** instead of expanding the diff.
- Suggestions (P2) alone do not block when score is already ≥9: carry them into the final report as follow-ups.

## Living specs (step 8, conditional)

Only after `Code Review: Approved` (not as C2). Invoke **`ns-sdd-living-spec-consolidator`** in **ad-hoc** mode when **all** are true:

1. `{product_root}/docs/specs/` exists
2. Diff is **behavioral** (API, schema, UX, or domain behavior) — skip cosmetic / rename-only / pure refactor
3. Skill is available (installed via `depends`)

Pass: mode `ad-hoc`, `{task_description}`, approved `git diff`. Read consolidator `SKILL.md` and follow it. Do not invent `{version_san}` or write under `docs/versions/`.

**Skip** (note reason in final report) when any condition fails, review is not Approved, or consolidator reports skipped.

## Final report (step 9)

No success language until gate passes or **blocked** (`review-gate-workflow.md`). **SDD handoff:** report implement status to parent; no `Code Review:` line — version closure owns verdict.

Every ad-hoc / C2 closure response **must** include:

| Field | Value |
| ----- | ----- |
| Active skill | `ns-code-coder` |
| Reviewer skill | `ns-code-reviewer` (via `reviewer-agent` when dispatched) |
| Review round | Last round executed: `1`, `2`, or `3` |
| Score | Last overall score from reviewer |
| Verdict | Exact line: `Code Review: {Approved\|Rejected\|Blocked}` |
| Living specs | `updated` \| `skipped: {reason}` \| `n/a` (blocked/rejected) |

Then: what changed, follow-ups, and blocked Criticals if applicable.

## Stop conditions

| Condition                                       | Action               |
| ----------------------------------------------- | -------------------- |
| `{product_root}` unclear with multiple products | Ask once             |
| Large change gate                               | Plan + wait          |
| Public contract or cross-product boundary       | Stop, explain, ask   |
| Task needs multi-day SDD planning               | Redirect to `ns-spec-driven` |

## Related skills

- `ns-code-reviewer` — mandatory review loop after implementation (see **Review loop**)
- `ns-sdd-living-spec-consolidator` — conditional ad-hoc living-spec update after Approved (see **Living specs**)
- `ns-code-investigator` — if blocked by unclear bug
- `ns-code-autonomous` — autonomous multi-agent execution (GitLab issue or local plan); for a GitLab issue, use `ns-execution-gitlab-issue` instead

## Forbidden

- SDD **version** artifact generation (`docs/versions/`, handoff, requirements/tasks)
- Living-spec consolidator **before** `Code Review: Approved`, or when `{specs_root}/` is missing
- Cross-product access without scope
- Commits without explicit request
- Refactors outside task scope
- **Review substitutes** — Cursor Task subagents (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or any review not executed via `reviewer-agent` / `ns-code-reviewer` `SKILL.md`. Harness `reviewer-agent` is **allowed**.
- **Skipping re-review** — reporting success after a fix when the previous `ns-code-reviewer` verdict was `Rejected` or score < 9 without a new passing round (ad-hoc / C2)
- **Success without verdict** — ad-hoc / C2 closure without the mandatory **Final report** fields and a parseable `Code Review:` line
- **Per-task review under handoff** — `reviewer-agent` / `ns-code-reviewer` during `run-implementation` task (parent owns Step 5)
