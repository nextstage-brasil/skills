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
| **≥2** | Follow `ns-coder` in A session per unit, sequential in DAG order. `coder-agent` / parallel only on explicit user request (disjoint + no DAG edge). |

See `../../../ns-harness/references/subagent-dispatch.md` spawn gate.

## Executing a unit (≥2)

**Gate before edit:** shell/subagent inside `WORKTREE_ROOT` on `WORK_BRANCH`. Else refuse unit — no silent main-checkout writes.

Each unit:

- Work only inside `WORKTREE_ROOT` (or `.worktrees/{version_san}/` standalone) — never main checkout, never `main`/`master`/`SOURCE_BRANCH`.
- Receives: scope/AC, resolved Q&A, file boundary, harness rules.
- Follows `ns-coder` rules (diff-first, read before write, no unrelated refactors).
- **Implement only** — **FORBIDDEN** per-unit `reviewer-agent` / `ns-reviewer` / `ns-judge`. Parent owns review once at closure.
- Escalates new destructive doubt via doubt protocol — does not resolve alone.
- Failed worktree isolation → unit `blocked`, not soft continue on main checkout.
- **Engine mode** (`ns-execution-gitlab-issue`): no route to `ns-execution-gitlab-issue` on `ISSUE_URL` in scope — doubt protocol to caller.

### Parallel workers (explicit user request only)

Default is in-session. If the user asked for parallel workers, each gets: `{unit_id}`, `WORKTREE_ROOT` + `WORK_BRANCH` (preflight: `pwd` and branch match before any edit; else report blocked), scope/AC, file boundary (no edits outside it), resolved doubt Q&A, harness rule paths. Implement only — no review. Report: files changed, diff summary, blockers, tokens, new destructive doubts (never guess).

## Checkpoint commits

- One commit per completed sequential unit, or one per completed parallel batch (all units in that batch finished) — committed inside the worktree as work progresses.
- Commit message: `<type>(unit): <imperative summary>` — internal checkpoints, not final delivery. Caller (`ns-execution-gitlab-issue`) squashes to one Conventional Commit at delivery; standalone may keep or squash per closure preference.
- Never skip checkpoint to "batch" multiple units into one commit — checkpoints make paused/resumed runs (doubt escalation) safe.

## Fix-loop re-dispatch

When re-invoked with reviewer findings (`Rejected`): **one** coder call on the whole map **verbatim**. Do **not** split map rows into units. Do **not** run the unit-count gate on map rows. Skip implementation units already done.
