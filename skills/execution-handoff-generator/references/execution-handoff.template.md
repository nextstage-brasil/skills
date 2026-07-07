# Execution Handoff — {product_name} {version_san}

**Generated:** {generated_at}
**Product root:** `{product_root}/`
**Version:** `{version_san}`
**Version status:** `not_started`
**Base branch:** `{base_branch}` *(GitLab only)*
**Work branch:** `{work_branch}` *(GitLab only)*

> Generated at planning closure. The implementer must read this file before coding
> and **update task status** as work advances.

---

## Prompt for implementer

Implement **{product_name} {version_san}** strictly following the tasks below.
Planning is complete — **execute, do not replan**.

### Required paths

| Artifact | Path |
|----------|------|
| Requirements | `{product_root}/docs/versions/{version_san}/requirements.md` |
| Tasks | `{product_root}/docs/versions/{version_san}/tasks/task-NNN-*.md` |
| Design | `{product_root}/docs/context/design-brief.md` |
| Stack | `{product_root}/docs/context/stack-confirmed.md` |
| Consistency | `{product_root}/docs/versions/{version_san}/consistency-report.md` |
| GitLab feature map *(if present)* | `{product_root}/docs/versions/{version_san}/gitlab-issue-feature-map.md` |
| GitLab sync config *(if present)* | `{product_root}/docs/context/gitlab-sync-config.md` |
| Code review report | `{product_root}/docs/versions/{version_san}/code-review-report.md` |
| Harness rules | `{harness}/rules/` |

### Execution rules

1. Start with the **first `pending` task** in the table below (numeric order).
2. Read the full `task-NNN-*.md` before coding.
3. Implement **only** under `{product_root}/` (code) and harness rules (read-only).
4. Validate all **validation criteria** before marking `completed`.
5. **Update this file** when starting (`in_progress`), completing (`completed`), or blocking (`blocked`) each task.
6. Update **Version status** and **Progress** after each task.
7. When **all** tasks are `completed` or `waived`: run post-implementation review (`code-reviewer`) before declaring the version ready.
8. **GitLab:** implement only on the registered `work_branch`; MR target per config.
9. **GitLab status:** per task, sync `backlog` → `in_progress` → `done` — never skip `in_progress` (`gitlab-board-sync`).
10. Do not stop to replan unless a real blocker is documented in **Notes**.

**`waived` tasks:** only with explicit human waiver in row **Notes**.

### Product-specific rules

{execution_rules_block}

### Scope

Use only artifacts and patterns under `{product_root}` and the harness — do not
inspect other products in a monorepo unless scope rules allow.

---

## Time tracking (seconds)

| Metric | Value |
|--------|-------|
| Planning — start | {planning_started_at} |
| Planning — end | {planning_finished_at} |
| Planning — total (s) | {planning_total_seconds} |
| Implementation — start | — |
| Implementation — end | — |
| Implementation — total (s) | 0 |
| Total task time (s) | 0 |
| Post-implementation review — end | — |
| Living specs — end | — |
| Final delivery — end | — |
| **Total process time (s)** | {planning_total_seconds} |
| Last recalculated | {generated_at} |

> Canonical formula: `total_process_seconds = planning_total_seconds + implementation_total_seconds + (final_delivery_end − implementation_end, in seconds)`.

---

## Progress

| Metric | Value |
|--------|-------|
| Total tasks | {total_tasks} |
| Completed | 0 |
| In progress | 0 |
| Blocked | 0 |
| Pending | {total_tasks} |
| **Last completed task** | — |
| **Next task** | `{next_task_id}` |

---

## Task status

Allowed values: `pending` | `in_progress` | `completed` | `blocked` | `waived`

| ID | File | Feature | Layer | Model tier | Status | Started at | Finished at | Time (s) | Updated at | Notes |
|----|------|---------|-------|------------|--------|------------|-------------|----------|------------|-------|
{task_rows}

---

## Session history

| Date | Agent / session | Tasks completed | Notes |
|------|-----------------|-----------------|-------|
| {generated_at} | Planning | 0 | Handoff generated |

---

## How to update this file

1. **Task start:** `Status` → `in_progress`; fill `Started at` (ISO local); update `Updated at`; increment **In progress**; optionally append session history.
2. **Task complete:** `Status` → `completed`; fill `Finished at`; `Time (s)` = `Finished at − Started at`; update **Progress** and **Next task**; sum **Total task time (s)**.
3. **Recalculate aggregates (required):** `Implementation — total (s)`; **Total process time (s)** per formula; `Last recalculated`.
4. **Blocked:** `Status` → `blocked`; reason in **Notes**; set version `blocked` if blocking.
5. **Resume:** `blocked` → `in_progress` when resolved.
6. **Version closure:** fill review / living specs / final delivery timestamps; recalculate **Total process time (s)**.

**Version status values:** `not_started` | `in_progress` | `blocked` | `implementation_complete` | `blocked_delivery` | `completed_with_caveats` | `completed`
