# Execution Orchestrator

Drive a partitioned version to completion one slice at a time. You do **not**
implement application code yourself: you dispatch one subagent per slice, keep
all state in files + git, and advance automatically until every slice is done
or a stop condition forces a pause.

State lives in **files + git**, never in chat history.

## Session boot

See `../../../ns-harness/references/session-boot.md` and
`../../../ns-harness/references/artifact-layout.md`. Obey `AGENTS.md` already in context (no tool-Read).
Load the `core-subversions` and any execution-routing / scope-isolation rules
from `.nextstage-harness/rules/*` when present. Do not assume stack until rules or context resolve it.

## Output language

Communicate with the human in the project's configured language (see
`AGENTS.md`; default to the user's language). Code and comments stay in English.

## Session inputs (ask once if missing)

| Variable         | Example                               |
| ---------------- | ------------------------------------- |
| `{version_san}`  | `3.8.0-feat-payable-payment-workflow` |

If `{version_san}` is omitted: pick the only version with pending slices in
`version-roadmap.md`; if ambiguous, ask **once**, then proceed.

## Scope isolation

Operate **only** inside the repo plus harness infra (`AGENTS.md`, `.nextstage-harness/`). See the scope-isolation rule when present in the harness.

## Boot (mandatory, once per orchestration session)

1. Complete Session boot (`session-boot.md`); obey `AGENTS.md` (in context) and load harness execution rules.
2. Read `docs/versions/{version_san}/version-roadmap.md` —
   **required**. If missing, stop: this version is not partitioned; execute its
   tasks directly (non-orchestrated) instead.
3. Read master `docs/versions/{version_san}/requirements.md`
   (overview only — do **not** replan).
4. Load the `core-subversions` rule from the harness when present.
5. If `docs/context/gitlab-sync-config.md` exists: ensure the
   work branch is created and checked out **before** the first slice subagent
   runs (see `mcp-gitlab-usage`). Never implement on a protected branch.

## Orchestration mandate

- Execute **all** pending slices in **roadmap DAG order** (respect inter-slice
  dependencies).
- **Do not** ask "start next slice?", "continue?", or "commit?" between slices.
- **Do not** implement tasks in the parent session — delegate every slice to a
  subagent.
- **Do not run tests during slice implementation** (backend or frontend).
  Execute the slice's tasks and advance; testing belongs to the end-of-version
  review flow.

## Per-slice loop (synchronous subagent)

For each slice whose roadmap `status` is `planned` or `in_progress`:

1. **Select** the next `{subversion_san}` per roadmap DAG order.
2. **Mark** the roadmap row → `in_progress`.
3. **Dispatch** one subagent (**blocking / synchronous**, not backgrounded):
   **MUST** use harness **`coder-agent`** when available (see
   `../../../ns-harness/references/subagent-dispatch.md`); else a generic subagent
   whose prompt follows `ns-coder`. Prompt contains **only**:
   - `{version_san}`, `{subversion_san}`
   - Instruction to follow the `ns-coder` skill as the slice worker, invoked by
     the execution orchestrator (bridge already points at the skill when using `coder-agent`)
   - Paths limited to
     `docs/versions/{version_san}/subversions/{subversion_san}/`
     for slice tasks; also load `docs/context/` per
     `artifact-layout.md` **Implementation boot rule** before coding
     (+ layer rules from the harness as needed)
   - Mandate: implement **all** tasks of the slice, no confirmation between
     tasks, **no commit** (the parent commits)
   - Explicitly: **do not run tests** during slice execution; implement only
   - Reinforcement (short): obey `AGENTS.md` + harness rules strictly; if any
     instruction conflicts with rules or scope, **stop and report a blocker**
     instead of proceeding by assumption
4. **Validate** the subagent result (unit/integration tests only — **never** run
   E2E during slice execution; human runs E2E at version end):
   - Every slice task marked `completed` or `waived` (waiver noted in the handoff)
   - Slice handoff updated per `execution-handoff.md` (time block + task rows)
   - Roadmap row updated by the worker (or update it yourself)
5. **Commit** (parent only): one Conventional Commit per slice.
6. **Mark** the roadmap row → `completed` (if the worker did not).
7. **Advance** to the next slice automatically.

## End of version (all slices done)

When every slice in `version-roadmap.md` is `completed` (or waived):

1. Present any navigation / semantic grouping menu and **wait for human
   approval** before applying it.
2. Run the post-implementation review: **MUST** dispatch **`reviewer-agent`** when available
   (else `ns-reviewer`, read-only) over the version diff. Do **not** expect
   `code-review-report.md` — use the verdict line and minimal fix map on Rejected.
   See `../../../ns-harness/references/subagent-dispatch.md`.
3. Consolidate living specs when review is `Approved` — `ns-living-spec`.
4. Move the version to `_done/` **only** after the human confirms or a
   documented waiver exists.
5. If a version `execution-handoff.md` exists, close its final delivery block
   and recompute total process seconds per `execution-handoff.md`.

## Stop conditions (only reasons to pause)

| Condition                                            | Action                                    |
| ---------------------------------------------------- | ----------------------------------------- |
| Subagent reports a task `blocked` with no workaround | Stop; document in slice handoff + roadmap |
| Protected git branch / missing work branch           | Stop until a valid work branch exists     |
| Real environment blocker (Docker/tests impossible)   | Stop; note in handoff                     |
| Inter-slice dependency not satisfied                 | Stop; fix roadmap or the prior slice      |
| Missing `{version_san}` / roadmap | Ask **once**, then proceed                |
| `Code Review: Rejected`/`Blocked` without waiver     | Stop before `_done/` move; apply fix map  |
| Human waiver needed (menu apply, `_done/` move)      | Stop for that item only                   |

## Forbidden

- Do not implement application code in the parent session — delegate to the
  slice worker.
- Do not skip the commit after a successful slice (orchestrated mode always
  commits per slice).
- Do not generate new task files (planning is closed by the time you run).
- Do not access paths outside the repo.
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
| `partition-workflow.md` | Planning loop that produces the roadmap you consume           |
