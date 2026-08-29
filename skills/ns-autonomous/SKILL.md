---
name: ns-autonomous
description: (NS) Autonomous execution engine — plans depth, resolves doubts from docs/specs, multi-agent work in an isolated worktree. Use for a local/pasted plan or "run this autonomously" without GitLab. Also Phase 2 under ns-execution-gitlab-issue (do not run standalone then). Not for single-step edits (ns-coder) or GitLab issues directly (ns-execution-gitlab-issue).
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.4"
depends:
  - ns-harness
  - ns-reviewer
---

# Code Autonomous

Harness-aware execution engine: planning depth, doubt resolution, multi-agent dispatch, review gate — standalone pipeline or caller's Phase 2 engine.

## Workflow mode (mandatory)

Fixed workflow — named skill handoffs or harness bridges (`../../ns-harness/references/subagent-dispatch.md`). Review gate: `../ns-reviewer/references/review-gate-workflow.md`. **MUST** `reviewer-agent` when available (else `ns-reviewer`); no Task persona substitutes. `C2` (**MUST** `coder-agent` when available → `ns-coder`) completes full per-task cycle + same review gate before unit done.

## Isolation invariant (non-negotiable)

Skill **never** writes application code on main product checkout; **never** commits `main`/`master`/base/`SOURCE_BRANCH` unless human explicitly said work in place this run.

- Standalone + Engine: isolated `WORK_BRANCH` + `WORKTREE_ROOT` before any implementation edit.
- Worktree creation fails, or CWD/branch still main checkout / base → **stop**. No "continue on main to unlock plan".
- Sandbox restrictions (`Operation not permitted`, `.cursor/` paths) **not** permission to violate invariant.

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** there before any other step in this skill.

### After session boot — Engine and Standalone

**Engine mode:** caller may have already completed Session boot in Phase 0 — re-read `session-boot.md` only if context is missing.
**Standalone:** you own Session boot before step 1 of the standalone pipeline.

## Routing (read first)

Entry priority table: `../../ns-harness/references/code-skill-routing.md`. Standalone triggers: `references/entry-triggers.md`.

1. **Origin is a GitLab issue** (`ISSUE_URL` or issue reference) → entry priority **1** — follow `ns-execution-gitlab-issue` end to end; this skill only runs as its Phase 2 engine (**Engine mode** below). Do not run the standalone pipeline, do not touch GitLab state, do not create a worktree.
2. **Standalone autonomous** (local plan file, pasted text/plan, ad-hoc "implement this autonomously" without an issue) → entry priority **3** — run the **standalone pipeline**: own worktree, own state, own review loop.

See `references/routing.md` for Engine-mode I/O and anti-cycle rules with `ns-execution-gitlab-issue`.

## Engine mode (invoked by `ns-execution-gitlab-issue`)

Inputs (already resolved by the caller — this skill never creates them): issue payload, `WORKTREE_ROOT`, `WORK_BRANCH`, `SOURCE_BRANCH`.

1. **Planning-depth self-decision** — evaluate the issue payload and decide single work unit vs. light `requirements.md` + `tasks/task-NNN-*.md` + `execution-plan.md` under `docs/versions/{version_san}/`. See `references/planning-decision.md`.
2. **Doubt protocol** — self-ask, docs-first lookup, self-answer non-destructive doubts, escalate destructive ones as a structured event to the caller instead of mutating GitLab state; pause dependent units until resumed. See `references/doubt-resolution.md`.
3. **Multi-agent dispatch** — parse work units (or the single unit) and **MUST** dispatch `coder-agent` when available (else `ns-coder`) workers, parallel only across units with no DAG edge and disjoint file scopes, sequential otherwise. Every subagent works inside `WORKTREE_ROOT`, never the main checkout. See `references/multi-agent-dispatch.md` and `../../ns-harness/references/subagent-dispatch.md`.
4. **Checkpoint commits** — one commit per completed sequential unit or per completed parallel batch, inside the worktree; the caller squashes at delivery.
5. **Fix-loop entry point** — when re-invoked after a `Rejected` verdict, treat the reviewer findings as a new work unit (or units) and repeat step 3 for those only.
6. **Return to caller**: unit statuses, files changed, any open destructive doubt, and (first invocation only) a plan-based `estimate_seconds` hint — the caller applies `set_issue_estimate` only when the issue estimate is empty and the value is ≥ 60 (see `../ns-execution-gitlab-issue/references/time-tracking.md`).

## Standalone pipeline (non-GitLab origin)

Same internals as Engine mode, but this skill owns the whole run:

1. Resolve the descriptor — local plan path or pasted text. No MCP calls.
2. Infer `change_kind` (fix/feat), allocate `{version_san}`, create `docs/versions/{version_san}/`.
3. **Create its own worktree**: `.worktrees/{version_san}/` + branch `work/{version_san}` from the resolved base branch, following `../../ns-harness/references/worktree-setup.md`. Path is under the **repo root**, never under `.cursor/`. On failure → abort (do not fall back to the main checkout) — see `references/standalone-pipeline.md`.
4. Planning-depth self-decision, doubt protocol (destructive doubt → chat-only gate, no GitLab actions available), multi-agent dispatch — identical logic to Engine mode.
5. **Internal review loop** — `../ns-reviewer/references/review-gate-workflow.md`: **MUST** `reviewer-agent` when available (else `ns-reviewer`) version-closure mode; max 3 rounds; **`Approved` = 10**. Score **9** = `Rejected` (Lift + re-review). Fail = Criticals or score ≤8. Stop on `Blocked` or rounds exhausted.
6. Report per `review-gate-workflow.md` **Final report** fields plus `{version_san}`, worktree path, commit(s), and follow-ups. No GitLab board, no MR — unless `docs/context/gitlab-sync-config.md` exists and the human explicitly asked for one (out of scope for v1; standalone stays local-only otherwise).

See `references/standalone-pipeline.md` for the full flow.

## Stop and ask the human

| Condition                                                        | Action                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Destructive doubt (Engine mode)                                   | Return escalation event to caller — no chat pause here |
| Destructive doubt (standalone)                                    | Stop in chat, ask, resume with the answer as context |
| Worktree conflict for the same `{run_id}` (standalone)             | Stop unless explicit resume                          |
| `git worktree add` failed (permissions/sandbox/path)               | Abort — report path attempted; never fall back to main checkout or `.cursor/` |
| Still on `main`/`master`/base branch when about to edit code       | Abort — isolation missing; do not implement                                   |
| Human explicitly said "do not create a new branch / work in place" | Only then may edit the current branch; still never invent a `.cursor/` path |
| Base branch for standalone worktree unresolved                    | Stop — ask once                                      |
| Review `Blocked` or 3 rounds exhausted                             | Stop, report as blocked — do not fabricate success   |
| Engine mode invoked with a GitLab origin but no worktree/branch given | Stop — this is a caller contract violation, not a doubt |

## Related skills

| Skill                 | Role                                                       |
| ---------------------- | ------------------------------------------------------------ |
| `ns-execution-gitlab-issue` | GitLab flow owner — calls this skill for Phase 2             |
| `ns-coder`           | Subagent implementation via `coder-agent` (**MUST** when available) |
| `ns-reviewer`        | Review gate via `reviewer-agent` (**MUST** when available) |
| `ns-harness`    | Artifact layout, worktree mechanics, discovery               |

## References

| File                                | When                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| `references/routing.md`              | Issue vs. standalone; Engine-mode I/O and anti-cycle with `ns-execution-gitlab-issue` |
| `references/entry-triggers.md`       | Priority 3 standalone entry phrases |
| `references/planning-decision.md`    | Self-evaluation heuristic: single unit vs. requirements+tasks+plan  |
| `references/doubt-resolution.md`     | Self-ask, docs-first lookup, destructive criteria, escalation shape |
| `references/multi-agent-dispatch.md` | DAG + disjoint-scope parallel rule, subagent prompt, checkpoint commits |
| `references/standalone-pipeline.md`  | Full non-GitLab flow: version alloc, own worktree, review loop      |

## Forbidden

- Review substitutes (`senior-tech-lead-reviewer`, `bugbot`, `security-review`, or any non-`ns-reviewer` gate) — harness `reviewer-agent` is allowed; see `../ns-reviewer/references/review-gate-workflow.md`
- Reporting success without `Approved`, or explicit **blocked** state
- Skipping re-review after a `Rejected` fix before closure
