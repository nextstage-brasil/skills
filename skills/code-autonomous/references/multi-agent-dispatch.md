# Multi-agent dispatch

## Building the dispatch order

From the single implicit unit, or from `execution-plan.md`'s DAG (see `planning-decision.md`):

1. Group units with no DAG edge between them **and** disjoint file scopes (no unit in the group touches a file another unit in the group also touches) — these can run in parallel.
2. Anything with a DAG edge, or overlapping file scope with another pending unit, runs sequentially, in dependency order.
3. When in doubt about scope overlap, prefer sequential — a wrong parallel dispatch causes merge conflicts inside the worktree, which is more expensive to unwind than running one unit at a time.

## Dispatching a unit

**Gate before edit:** the dispatching shell / subagent must be operating inside `WORKTREE_ROOT` on `WORK_BRANCH`. If not, refuse the unit — do not silently write into the main checkout.

Each unit — parallel or sequential — is a `code-coder` subagent (or equivalent focused implementation call) that:

- Works exclusively inside `WORKTREE_ROOT` (or `{product_root}/.worktrees/{version_san}/` in standalone) — never the main checkout, never `main`/`master`/`SOURCE_BRANCH`.
- Receives: the unit's scope/acceptance criteria, any resolved Q&A relevant to it, the file scope boundary (so it doesn't drift into another unit's files), and applicable harness rules.
- Follows `code-coder`'s own implementation rules (diff-first, read before write, no unrelated refactors).
- Escalates any *new* destructive doubt it hits back up through the doubt protocol instead of guessing — it does not resolve destructive doubts on its own.
- Must not "unblock" a failed worktree by editing files on the product main checkout. Failure to isolate = unit status `blocked`, not a soft continue.

### Subagent prompt template

```
Implement work unit {unit_id} inside {WORKTREE_ROOT} on branch {WORK_BRANCH}.
Preflight: confirm pwd and git branch match WORKTREE_ROOT / WORK_BRANCH before any edit.
If you are on main/master/base branch or outside WORKTREE_ROOT: stop and report blocked — do not implement.
Scope: {unit description / acceptance criteria}
File boundary: {files or directories this unit owns — do not touch files outside this boundary}
Resolved context: {relevant Q&A from the doubt protocol, or "none"}
Harness rules: {paths to applicable rule files}
Report: files changed, summary of the diff, any new destructive doubt (do not guess on it).
```

## Checkpoint commits

- One commit per completed sequential unit, or one per completed parallel batch (all units in that batch finished) — committed inside the worktree as work progresses.
- Commit message: `<type>(unit): <imperative summary>` — these are internal checkpoints, not the final delivery commit. The caller (`execute-gitlab-issue`) squashes to one Conventional Commit at delivery; the standalone pipeline may keep them or squash per its own closure preference.
- Never skip a checkpoint to "batch" multiple units into one commit — checkpoints are what make a paused/resumed run (doubt escalation) safe to pick back up.

## Fix-loop re-dispatch

When re-invoked with reviewer findings (`Rejected` verdict), treat the findings as one new unit (or split into several if they span unrelated areas) and run this same dispatch logic for only those units — do not re-dispatch units that already passed review.
