# Multi-agent dispatch

## Building the dispatch order

From single implicit unit or `execution-plan.md` DAG (`planning-decision.md`):

1. Parallel group: no DAG edge **and** disjoint file scopes.
2. DAG edge or overlapping scope → sequential, dependency order.
3. Scope overlap uncertain → prefer sequential — wrong parallel = merge conflicts in worktree.

## Dispatching a unit

**Gate before edit:** shell/subagent inside `WORKTREE_ROOT` on `WORK_BRANCH`. Else refuse unit — no silent main-checkout writes.

Each unit (**MUST** harness **`coder-agent`** when available — `../../../ns-harness/references/subagent-dispatch.md`; else `ns-coder`):

- Work only inside `WORKTREE_ROOT` (or `.worktrees/{version_san}/` standalone) — never main checkout, never `main`/`master`/`SOURCE_BRANCH`.
- Receives: scope/AC, resolved Q&A, file boundary, harness rules.
- Follows `ns-coder` rules (diff-first, read before write, no unrelated refactors).
- Completes full per-task cycle + **review gate** (`../../ns-reviewer/references/review-gate-workflow.md`) — **`reviewer-agent` / `ns-reviewer` only**; `Approved` = **10**. Score **9** = Lift. Unit `blocked` if rounds exhaust without `Approved`.
- Escalates new destructive doubt via doubt protocol — does not resolve alone.
- Failed worktree isolation → unit `blocked`, not soft continue on main checkout.
- **Engine mode** (`ns-execution-gitlab-issue`): no route to `ns-execution-gitlab-issue` on `ISSUE_URL` in scope — doubt protocol to caller.

### Subagent prompt template

```
Implement work unit {unit_id} inside {WORKTREE_ROOT} on branch {WORK_BRANCH}.
MUST dispatch coder-agent when available; else follow ns-coder skill.
Preflight: confirm pwd and git branch match WORKTREE_ROOT / WORK_BRANCH before any edit.
If you are on main/master/base branch or outside WORKTREE_ROOT: stop and report blocked — do not implement.
Scope: {unit description / acceptance criteria}
File boundary: {files or directories this unit owns — do not touch files outside this boundary}
Resolved context: {relevant Q&A from the doubt protocol, or "none"}
Harness rules: {paths to applicable rule files}
Review gate: after implementation, follow ns-coder + review-gate-workflow.md — MUST reviewer-agent when available (else ns-reviewer), max 3 rounds, Approved only at score 10, Lift at Rejected+9, mandatory re-review after Criticals or Lift.
Report: files changed, summary of the diff, review round (1/2/3), score, exact Code Review: verdict line, any new destructive doubt (do not guess on it).
```

## Checkpoint commits

- One commit per completed sequential unit, or one per completed parallel batch (all units in that batch finished) — committed inside the worktree as work progresses.
- Commit message: `<type>(unit): <imperative summary>` — these are internal checkpoints, not the final delivery commit. The caller (`ns-execution-gitlab-issue`) squashes to one Conventional Commit at delivery; the standalone pipeline may keep them or squash per its own closure preference.
- Never skip a checkpoint to "batch" multiple units into one commit — checkpoints are what make a paused/resumed run (doubt escalation) safe to pick back up.

## Fix-loop re-dispatch

When re-invoked with reviewer findings (`Rejected`), treat as one new unit (or split if unrelated) — dispatch only those units; skip units already `Approved`.
