# Multi-agent dispatch

## Building the dispatch order

From single implicit unit or `execution-plan.md` DAG (`planning-decision.md`):

1. Parallel group: no DAG edge **and** disjoint file scopes.
2. DAG edge or overlapping scope → sequential, dependency order.
3. Scope overlap uncertain → prefer sequential — wrong parallel = merge conflicts in worktree.

## Unit count gate (spawn)

| Units | Action |
| ----- | ------ |
| **1** | Follow `ns-coder` **in A session** inside `WORKTREE_ROOT`. **MUST NOT** spawn `coder-agent`. Defer review to caller (G Phase 4) or standalone step 5. |
| **≥2** | **MUST** `coder-agent` when available per unit (else `ns-coder`). Parallel only disjoint + no DAG edge. |

See `../../../ns-harness/references/subagent-dispatch.md` spawn gate.

## Dispatching a unit (≥2 or spawned worker)

**Gate before edit:** shell/subagent inside `WORKTREE_ROOT` on `WORK_BRANCH`. Else refuse unit — no silent main-checkout writes.

Each unit:

- Work only inside `WORKTREE_ROOT` (or `.worktrees/{version_san}/` standalone) — never main checkout, never `main`/`master`/`SOURCE_BRANCH`.
- Receives: scope/AC, resolved Q&A, file boundary, harness rules.
- Follows `ns-coder` rules (diff-first, read before write, no unrelated refactors).
- **Implement only** — **FORBIDDEN** per-unit `reviewer-agent` / `ns-reviewer` / `ns-judge`. Parent owns review once at closure.
- Escalates new destructive doubt via doubt protocol — does not resolve alone.
- Failed worktree isolation → unit `blocked`, not soft continue on main checkout.
- **Engine mode** (`ns-execution-gitlab-issue`): no route to `ns-execution-gitlab-issue` on `ISSUE_URL` in scope — doubt protocol to caller.

### Subagent prompt template (≥2 units)

```
Implement work unit {unit_id} inside {WORKTREE_ROOT} on branch {WORK_BRANCH}.
MUST use coder-agent when available; else follow ns-coder skill.
Preflight: confirm pwd and git branch match WORKTREE_ROOT / WORK_BRANCH before any edit.
If you are on main/master/base branch or outside WORKTREE_ROOT: stop and report blocked — do not implement.
Scope: {unit description / acceptance criteria}
File boundary: {files or directories this unit owns — do not touch files outside this boundary}
Resolved context: {relevant Q&A from the doubt protocol, or "none"}
Harness rules: {paths to applicable rule files}
Review: DEFER — implement only; do NOT invoke reviewer-agent / ns-reviewer / ns-judge. Parent owns closure review.
Report: files changed, summary of the diff, blockers, tokens, any new destructive doubt (do not guess on it).
```

## Checkpoint commits

- One commit per completed sequential unit, or one per completed parallel batch (all units in that batch finished) — committed inside the worktree as work progresses.
- Commit message: `<type>(unit): <imperative summary>` — internal checkpoints, not final delivery. Caller (`ns-execution-gitlab-issue`) squashes to one Conventional Commit at delivery; standalone may keep or squash per closure preference.
- Never skip checkpoint to "batch" multiple units into one commit — checkpoints make paused/resumed runs (doubt escalation) safe.

## Fix-loop re-dispatch

When re-invoked with reviewer findings (`Rejected`), treat as one new unit (or split if unrelated) — dispatch only those units; skip units already done. Same unit-count gate: 1 = in-session; ≥2 = spawn.
