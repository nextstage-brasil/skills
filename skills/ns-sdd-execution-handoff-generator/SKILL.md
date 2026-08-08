---
name: ns-sdd-execution-handoff-generator
description: (NS) Generate and update execution-handoff.md for planned SDD versions — operational prompt, per-task status table, token totals, and time tracking in seconds. Use at the end of planning after all task-NNN-*.md files exist, when tasks exist but handoff is missing, or when updating task status during version implementation. Do NOT use for ad-hoc coding without a version lifecycle, version partitioning (ns-sdd-version-partitioner), or GitLab-only issue execution (ns-execution-gitlab-issue).
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.2"
depends:
  - ns-harness
---

# Execution Handoff Generator

Bridge **planning → implementation**. Produces and maintains
`{product_root}/docs/versions/{version_san}/execution-handoff.md` — the single
source of truth for **task order**, **progress**, **tokens**, and **elapsed time**.

> `requirements.md` says **what**; `tasks/task-NNN-*.md` says **how**;
> `execution-handoff.md` says **in what order** and **where execution stopped**.

## Harness discovery

See `../ns-harness/references/harness-discovery.md` and
`../ns-harness/references/artifact-layout.md`.

## When to use

| Trigger                                          | Action                                       |
| ------------------------------------------------ | -------------------------------------------- |
| End of planning (all `task-NNN-*.md` written)    | **Generate** initial handoff                 |
| Tasks exist but handoff is missing               | **Generate** before implementation           |
| Task starts, completes, blocks, or is waived     | **Update** status + recalculate times/tokens |
| All tasks done — review / living specs / closure | **Update** version status + final timestamps |

For the full implementer loop (read handoff → task cycle → closure), see
`references/run-implementation.md`.

## Prerequisites (generation)

- `{product_root}` and `{version_san}` defined
- `{product_root}/docs/versions/{version_san}/requirements.md` exists
- At least one `{product_root}/docs/versions/{version_san}/tasks/task-*.md`
- Template: `references/execution-handoff.template.md`
- Planning timestamps from the planning session:
  - `planning_started_at` (ISO local `YYYY-MM-DDTHH:MM:SS`)
  - `planning_finished_at` (ISO local `YYYY-MM-DDTHH:MM:SS`)
  - `planning_total_seconds` (integer ≥ 0)

For subversions: write handoff under
`subversions/{subversion_san}/execution-handoff.md` (slice scope only).

## Initial generation

### 1. Collect task metadata

For each `task-NNN-*.md` in numeric order:

| Field  | Source                                                                                 |
| ------ | -------------------------------------------------------------------------------------- |
| Task   | Short id only: `task-NNN` (from `task-NNN-*.md` — drop the slug)                       |
| Layer  | infer from filename or task body (`backend`, `frontend`, `infra`, `unit-tests`, `e2e`) |

Do **not** put Feature, model tier, or free-form Notes in the handoff table —
those belong in the task file.

### 2. Build execution rules block

Read `requirements.md` and `{product_root}/docs/context/stack-confirmed.md` when
present. Add up to 10 critical bullets to `{execution_rules_block}` — legacy DB
constraints, multitenancy, test environment rules, etc. Do not duplicate the full
requirements file.

### 3. Write the file

Save to `{product_root}/docs/versions/{version_san}/execution-handoff.md` using
`references/execution-handoff.template.md`:

- All tasks start `Status: pending`, timestamps `—`, `Time (s): 0`, `Tokens: 0`
- Header **Tokens (total):** `0`
- `{next_task_id}` = first short id (e.g. `task-001`)
- `{base_branch}` / `{work_branch}` from `gitlab-sync-config.md` when present; else `—`

### 4. Report to orchestrator

Return: handoff path, total tasks indexed, first task ID, and instruction to
start implementation via `references/run-implementation.md`.

## Status updates (during implementation)

Task starts, completes, blocks, or waived:

1. Locate task row in **Task status**
2. Update `Status`, `Started at` (on `in_progress`), `Finished at` (on
   `completed`), `Time (s)` (`Finished at − Started at`), `Tokens`,
   `Updated at`
3. **`Tokens` required before `completed`.** Sources (priority):
   1. Usage/tokens from Task result / UI of `coder-agent` + other subagents
      for that task
   2. Parent tokens for that task loop if platform surfaces them
   3. Nothing exposed: ask human once; if declined, `~N` estimate + task
      `## Execution notes` line `tokens: ~N (estimated)`
   **Forbidden:** `0` on `completed` task that did LLM work
4. Recalculate **Tokens (total)** = sum of `Tokens` column (integers; `~N`
   counts as `N`)
5. Recalculate **Progress** (`Next task` = first `pending` or `in_progress`)
6. Recalculate **Time tracking (seconds)**:
   - `Implementation — start` = earliest filled `Started at`
   - `Implementation — end` = latest filled `Finished at` when present
   - `Implementation — total (s)` = end − start
   - `Total task time (s)` = sum of `Time (s)` column
   - `Total process time (s)` = `Planning — total (s)` + `Implementation — total (s)` + (`Final delivery — end` − `Implementation — end` when present)
   - `Last recalculated` = current timestamp
7. Update **Version status** (see template)
8. Optionally append **Session history** (Date + ultra-short Notes only)
9. Important notes (blockers, waivers): append to task file
   `## Execution notes` — relevant only; never Notes column in handoff

Version closure (review, living specs, `_done/` move): fill
`Post-implementation review — end`, `Review — tokens` (or Session history
note — **not** last task `Tokens` column), `Living specs — end` (when
applicable), `Final delivery — end`; recalculate `Total process time (s)`.

### Allowed task statuses

`pending` | `in_progress` | `completed` | `blocked` | `waived`

- **`waived`:** requires human waiver in the task's **Execution notes**. Do not
  waive P0 test tasks (tenant isolation, URL RBAC, auth rate limits) without
  documented risk acceptance.
- **Forbidden:** mark version `completed` without `Code Review: Approved`
- **Forbidden:** reorder tasks or rewrite the base prompt without human approval
- **Forbidden:** delete session history — append only

If tasks are added or removed after generation, **regenerate** preserving
existing statuses by task short id.

## Integration

| Stage                      | Skill / reference                                           |
| -------------------------- | ----------------------------------------------------------- |
| After task generation      | This skill (generate handoff)                               |
| Classic implementation     | `references/run-implementation.md` + `coder-agent` (**MUST** when available) / `ns-code-coder` |
| Partitioned implementation | `ns-execution-orchestrator` (slice handoffs + master closure)  |
| End-of-version review      | `reviewer-agent` (**MUST** when available) / `ns-code-reviewer`                          |
| Living specs               | `ns-sdd-living-spec-consolidator`                                  |
| GitLab board sync          | `ns-gitlab-board-sync` (when config exists)                    |

## References

| File                                       | When                           |
| ------------------------------------------ | ------------------------------ |
| `references/execution-handoff.template.md` | Handoff structure              |
| `references/run-implementation.md`         | Classic version execution loop |
