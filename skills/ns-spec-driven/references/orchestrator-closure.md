# Execution Orchestrator — Closure

Load at end of version, stop conditions, or forbidden checks.

## End of version (all units/slices done)

Every unit in `delivery-units.md` (if present) and every slice in `version-roadmap.md` is `completed` (or waived):

1. Present any navigation / semantic grouping menu and **wait for human approval** before applying.
2. Post-implementation review: **MUST** dispatch **`reviewer-agent`** when available (else `ns-reviewer`, read-only) over version diff. Do **not** expect `code-review-report.md` — verdict line and minimal fix map on Rejected. See `../../../ns-harness/references/subagent-dispatch.md`.
3. Consolidate living specs on `Approved` — `ns-living-spec` (`../../ns-reviewer/references/review-gate-workflow.md`). Score **9** = `Rejected`, not close.
4. Move version to `_done/` **only** after human confirms or documented waiver exists.
5. If version `execution-handoff.md` exists, close final delivery block and recompute total process seconds per `execution-handoff.md`.

## Stop conditions (only reasons to pause)

| Condition | Action |
| --------- | ------ |
| Subagent reports task `blocked` with no workaround | Stop; document in slice handoff + roadmap |
| Protected git branch / missing work branch | Stop until valid work branch exists |
| Real environment blocker (Docker/tests impossible) | Stop; note in handoff |
| Inter-slice dependency not satisfied | Stop; fix roadmap or prior slice |
| Missing `{version_san}` / roadmap | Ask **once**, then proceed |
| `Code Review: Rejected`/`Blocked` (score **9** included) without waiver | Stop before `_done/` move; Lift/fix map then re-review until `Approved` |
| Human waiver needed (menu apply, `_done/` move) | Stop for that item only |

## Forbidden

- Do not implement application code in parent session — delegate to unit or slice worker.
- Do not skip parent commit after successful **local** unit (no G) or classic **slice**. When G SDD unit mode ran, **do not** parent-commit — G Phase 3 already delivered.
- Do not dispatch a whole slice as one worker when `delivery-units.md` exists — **by unit** only.
- Do not generate new task files (planning closed by the time you run).
- Do not access paths outside repo.
- Do not apply navigation semantic grouping without human approval.
- Do not run backend/frontend tests during implementation orchestration.

## Invocation examples

```
Version: 3.8.0-feat-payable-payment-workflow
Resume partitioned implementation — `delivery-units.md` present: sync worker per unit, parent commit only if local (G owns commit/MR when published). Else: sync subagent per slice, commit per slice.
```

```
Continue orchestrating the partitioned implementation of apps/my-product 3.8.0.
```

## Integration

| Stage | Reference |
| ----- | --------- |
| Partition version → roadmap + subversions | `version-partitioner.md` |
| Handoff generation and updates | `execution-handoff.md` |
| Slice worker (no units file) | `coder-agent` → `ns-coder` |
| Unit worker (`delivery-units.md`) | G SDD unit mode when `issue_iid`; else `coder-agent` → `ns-coder` |
| GitLab status/spent | `delivery-units.md` **GitLab status/spent (SSoT)** |
| End-of-version review gate | `reviewer-agent` → `ns-reviewer` — `Approved` = **10** (`../../ns-reviewer/references/review-gate-workflow.md`) |
| Living specs consolidation | `ns-living-spec` after `Approved` |
| Delivery units + waves | `delivery-units.md` |
| Work branch / GitLab sync | `mcp-gitlab-usage` |

Slice dispatch + partition loop: `references/orchestrator.md` References.
