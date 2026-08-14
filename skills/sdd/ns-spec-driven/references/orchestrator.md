# Execution Orchestrator

Drive partitioned version to completion one slice at a time. You do **not** implement application code: dispatch one subagent per slice, keep all state in files + git, advance automatically until every slice done or stop condition forces pause.

State in **files + git**, never chat history.

## Session boot

See `../../../ns-harness/references/session-boot.md` and `../../../ns-harness/references/artifact-layout.md`. Obey `AGENTS.md` already in context (no tool-Read). Load `core-subversions` and any execution-routing / scope-isolation rules from `.nextstage-harness/rules/*` when present. Do not assume stack until rules or context resolve it.

## Output language

Communicate with human in project's configured language (`AGENTS.md`; default user's language). Code and comments stay English.

## Session inputs (ask once if missing)

| Variable         | Example                               |
| ---------------- | ------------------------------------- |
| `{version_san}`  | `3.8.0-feat-payable-payment-workflow` |

`{version_san}` omitted: pick only version with pending slices in `version-roadmap.md`; if ambiguous, ask **once**, then proceed.

## Scope isolation

Operate **only** inside repo plus harness infra (`AGENTS.md`, `.nextstage-harness/`). See scope-isolation rule when present in harness.

## Boot (mandatory, once per orchestration session)

1. Complete Session boot (`session-boot.md`); obey `AGENTS.md` (in context) and load harness execution rules.
2. Read `docs/versions/{version_san}/version-roadmap.md` — **required**. If missing, stop: version not partitioned; execute tasks directly (non-orchestrated) instead.
3. Read master `docs/versions/{version_san}/requirements.md` (overview only — do **not** replan).
4. Load `core-subversions` rule from harness when present.
5. If `docs/context/gitlab-sync-config.md` exists: ensure work branch created and checked out **before** first slice subagent runs (see `mcp-gitlab-usage`). Never implement on protected branch.

## Orchestration mandate

- Execute **all** pending slices in **roadmap DAG order** (respect inter-slice dependencies).
- **Do not** ask "start next slice?", "continue?", or "commit?" between slices.
- **Do not** implement tasks in parent session — delegate every slice to subagent.
- **Do not run tests during slice implementation** (backend or frontend). Execute slice tasks and advance; testing belongs to end-of-version review flow.

## Per-slice loop (synchronous subagent)

For each slice whose roadmap `status` is `planned` or `in_progress`:

1. **Select** next `{subversion_san}` per roadmap DAG order.
2. **Mark** roadmap row → `in_progress`.
3. **Dispatch** one subagent (**blocking / synchronous**, not backgrounded): **MUST** use harness **`coder-agent`** when available (see `../../../ns-harness/references/subagent-dispatch.md`); else generic subagent whose prompt follows `ns-coder`. Prompt contains **only**:
   - `{version_san}`, `{subversion_san}`
   - Instruction to follow `ns-coder` skill as slice worker, invoked by execution orchestrator (bridge already points at skill when using `coder-agent`)
   - Paths limited to `docs/versions/{version_san}/subversions/{subversion_san}/` for slice tasks; also load `docs/context/` per `artifact-layout.md` **Implementation boot rule** before coding (+ layer rules from harness as needed)
   - Mandate: implement **all** tasks of slice, no confirmation between tasks, **no commit** (parent commits)
   - Explicitly: **do not run tests** during slice execution; implement only
   - Reinforcement (short): obey `AGENTS.md` + harness rules strictly; if any instruction conflicts with rules or scope, **stop and report blocker** instead of proceeding by assumption
4. **Validate** subagent result (unit/integration tests only — **never** run E2E during slice execution; human runs E2E at version end):
   - Every slice task marked `completed` or `waived` (waiver noted in handoff)
   - Slice handoff updated per `execution-handoff.md` (time block + task rows)
   - Roadmap row updated by worker (or update yourself)
5. **Commit** (parent only): one Conventional Commit per slice.
6. **Mark** roadmap row → `completed` (if worker did not).
7. **Advance** to next slice automatically.

## End of version (all slices done)

When every slice in `version-roadmap.md` is `completed` (or waived):

1. Present any navigation / semantic grouping menu and **wait for human approval** before applying.
2. Run post-implementation review: **MUST** dispatch **`reviewer-agent`** when available (else `ns-reviewer`, read-only) over version diff. Do **not** expect `code-review-report.md` — use verdict line and minimal fix map on Rejected. See `../../../ns-harness/references/subagent-dispatch.md`.
3. Consolidate living specs when review is `Approved` — `ns-living-spec`.
4. Move version to `_done/` **only** after human confirms or documented waiver exists.
5. If version `execution-handoff.md` exists, close its final delivery block and recompute total process seconds per `execution-handoff.md`.

## Stop conditions (only reasons to pause)

| Condition                                            | Action                                    |
| ---------------------------------------------------- | ----------------------------------------- |
| Subagent reports task `blocked` with no workaround | Stop; document in slice handoff + roadmap |
| Protected git branch / missing work branch           | Stop until valid work branch exists     |
| Real environment blocker (Docker/tests impossible)   | Stop; note in handoff                     |
| Inter-slice dependency not satisfied                 | Stop; fix roadmap or prior slice      |
| Missing `{version_san}` / roadmap | Ask **once**, then proceed                |
| `Code Review: Rejected`/`Blocked` without waiver     | Stop before `_done/` move; apply fix map  |
| Human waiver needed (menu apply, `_done/` move)      | Stop for that item only                   |

## Forbidden

- Do not implement application code in parent session — delegate to slice worker.
- Do not skip commit after successful slice (orchestrated mode always commits per slice).
- Do not generate new task files (planning closed by the time you run).
- Do not access paths outside repo.
- Do not apply navigation semantic grouping without human approval.
- Do not run backend/frontend tests during implementation orchestration.

## Invocation examples

```
Version: 3.8.0-feat-payable-payment-workflow
Resume partitioned implementation — run all pending slices (sync subagent per slice, commit per slice).
```

```
Continue orchestrating the partitioned implementation of apps/my-product 3.8.0.
```

## Integration

| Stage                                     | Reference                        |
| ----------------------------------------- | ---------------------------- |
| Partition version → roadmap + subversions | `version-partitioner.md`        |
| Handoff generation and updates            | `execution-handoff.md` |
| Slice worker (per-slice implementation)   | `coder-agent` → `ns-coder` |
| End-of-version review gate                | `reviewer-agent` → `ns-reviewer` |
| Living specs consolidation                | `ns-living-spec`   |
| Work branch / GitLab sync                 | `mcp-gitlab-usage`           |

## References

| File                                                      | When to read                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------- |
| `slice-dispatch.md`                            | Exact slice subagent prompt template and validation checklist |
| `partition-workflow.md` | Planning loop that produces roadmap you consume           |
