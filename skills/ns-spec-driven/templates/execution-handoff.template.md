# Execution Handoff — {product_name} {version_san}

**Generated:** {generated_at}
**Repo:** (this project)
**Version:** `{version_san}`
**Version status:** `not_started`
**Tokens (total):** 0
**Base branch:** `{base_branch}` *(GitLab only)*
**Work branch:** `{work_branch}` *(GitLab only)*

> Generated at planning closure. Implementer must read this file before coding
> and **update task status** as work advances.

---

## Prompt for implementer

Implement **{product_name} {version_san}** strictly following tasks below.
Planning complete — **execute, do not replan**.

### Required paths

| Artifact | Path |
|----------|------|
| AGENTS | `AGENTS.md` |
| Local agent orders *(if present)* | `agents.local.md` |
| Requirements | `docs/versions/{version_san}/requirements.md` |
| Tasks | `docs/versions/{version_san}/tasks/task-NNN-*.md` |
| Design | `docs/context/design-brief.md` |
| Stack | `docs/context/stack-confirmed.md` |
| Delivery units *(if present)* | `docs/versions/{version_san}/delivery-units.md` |
| GitLab feature map *(if present)* | `docs/versions/{version_san}/gitlab-issue-feature-map.md` |
| GitLab sync config *(if present)* | `docs/context/gitlab-sync-config.md` |
| Harness rules | `.nextstage-harness/rules/` |

### Execution rules

1. Start with **next batch**: consecutive `pending` tasks, **same layer**, prefer **4–7**, hard **max 7**, fewer OK when fewer remain; stop at dependency on unfinished task (classic mode — `run-implementation.md`). Size 1 = single-task dispatch. Numeric order unless task `Depends on` says otherwise. Progress **Next task** = first short id of that batch.
2. Session boot once at version start (`session-boot.md`). No per-batch re-read — only if `agents.local.md` or harness rules change. Never tool-Read `AGENTS.md`. Fresh `coder-agent` = own cold-start boot.
3. Read task **card** (header through Validation criteria) before coding; open `Detailed description` on demand (ambiguity or `blocked`).
4. Implement **only** inside repo (code) and harness rules (read-only). **One** `coder-agent` / `ns-coder` dispatch **per batch** in **SDD handoff mode** (implement + unit/integration; **no** per-task / mid-batch review). Parent owns handoff; rows stay **per task**.
5. Validate all **validation criteria** before marking `completed`.
6. **Tests during task execution:** unit/integration only (e.g. PHPUnit). **Forbidden:** run any E2E suite (Cypress/`cypress:run`/`cypress:open`/equivalent). E2E is **human-only at version end** after all tasks complete.
7. **Forbidden during tasks:** `reviewer-agent` / `ns-reviewer` — review **once** after all tasks (rule 10).
8. **Update this file** when starting (`in_progress` on all batch members at batch start), completing (`completed` per task from worker report), or blocking (`blocked`) each task. Tokens: split per task or `~N` estimate.
9. Update **Version status**, **Progress**, and **Tokens (total)** after each task / batch.
10. When **all** tasks are `completed` or `waived`: run post-implementation review (`reviewer-agent` / `ns-reviewer`) before declaring version ready; remind human to run E2E.
11. **GitLab:** implement only on registered `work_branch` or per-unit `work/{unit}-{slug}`; MR target per config / `delivery-units.md` `SOURCE_BRANCH`.
12. **GitLab status/spent:** follow `delivery-units.md` section **GitLab status/spent (SSoT)** — no fourth branch.
13. Do not stop to replan unless real blocker documented in task **Execution notes**.

**`waived` tasks:** only with explicit human waiver recorded in that task **Execution notes**.

### Product-specific rules

{execution_rules_block}

### Scope

Use only artifacts and patterns inside repo and harness — do not
inspect other products in monorepo unless scope rules allow.

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
| Review — tokens | — |
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

| Task | Unit | Layer | Status | Started at | Finished at | Time (s) | Tokens | Updated at |
|------|------|-------|--------|------------|-------------|----------|--------|------------|
{task_rows}

> **Task** = short id only (`task-001`), derived from `task-001-*.md`. Feature and
> model tier live in task file — not here. Important notes go in task
> `## Execution notes` (relevant items only).

---

## Session history

| Date | Notes |
|------|-------|
| {generated_at} | Handoff generated |

> Notes: ultra-short (few words). No agent/session column.

---

## How to update this file

1. **Task start (batch or single):** set each selected row `Status` to `in_progress`; fill `Started at` (ISO local); update `Updated at`; increment **In progress**; optionally append session history. Classic mode: mark all batch members at batch start.
2. **Task complete:** Collect **Tokens** first (required before `completed`). Sources (priority): (1) usage/tokens from Task result / UI of `coder-agent` and any other subagents — **split per task** from worker report, or `~N` estimate per task; (2) parent tokens attributable to that task if platform surfaces them; (3) if nothing exposed — ask human once; if human declines, write best estimate with `~` prefix and one line in task `## Execution notes`: `tokens: ~N (estimated)`. **Forbidden:** leave `0` on `completed` task that did LLM work. Then: `Status` to `completed`; fill `Finished at`; `Time (s)` = `Finished at − Started at`; write `Tokens`; update **Tokens (total)** = sum of `Tokens` column (integers; treat `~N` as `N`); update **Progress** and **Next task**; sum **Total task time (s)**.
3. **Recalculate aggregates (required):** `Implementation — total (s)`; **Total process time (s)** per formula; `Last recalculated`.
4. **Blocked:** `Status` to `blocked`; reason in task file **Execution notes**; set version `blocked` if blocking.
5. **Resume:** `blocked` to `in_progress` when resolved.
6. **Version closure:** fill review / living specs / final delivery timestamps; register **review tokens** in **Time tracking** (`Review — tokens`) or **Session history** (version-level note) — **do not** add them to last task `Tokens` column; recalculate **Total process time (s)**.

**Version status values:** `not_started` | `in_progress` | `blocked` | `implementation_complete` | `blocked_delivery` | `completed_with_caveats` | `completed`
