# Execution Handoff Generator

Bridge planning to implementation. Maintain `docs/versions/{version_san}/execution-handoff.md` — SSoT for **task order**, **progress**, **tokens**, **elapsed time**.

> `requirements.md` = **what**; `tasks/task-NNN-*.md` = **how**; `execution-handoff.md` = **order** + **where execution stopped**.

## Session boot

`../../../ns-harness/references/session-boot.md` + `../../../ns-harness/references/artifact-layout.md`.

## When to use

| Trigger | Action |
| ------- | ------ |
| End of planning (all `task-NNN-*.md` written) | Units needed (Gate 4 publish or parallel, or file exists): Gate 4 then `delivery-units.md` when required; else **generate handoff directly** |
| Gate 4 complete (when run) | **Generate** initial handoff |
| Tasks exist, handoff missing | **Generate** before implementation |
| Task starts, completes, blocks, or waived | **Update** status + recalculate times/tokens |
| All tasks done — review / living specs / closure | **Update** version status + final timestamps |

Implementer loop: `../../ns-coder/references/run-implementation.md`.

Classic: batch consecutive same-layer `pending` (prefer **4–7**, hard **max 7**, fewer OK) into one `coder-agent` dispatch. **Handoff rows stay per task.** Progress **Next task** = first short id of next batch. Partitioned: batching per slice via `orchestrator.md` — not this generator. Slice size **target 4–7** = `version-partitioner.md` only.

## Prerequisites (generation)

- `{version_san}` defined
- `docs/versions/{version_san}/requirements.md` exists
- ≥1 `docs/versions/{version_san}/tasks/task-*.md`
- **New planning closure:** Gate 4 when GitLab possible; `delivery-units.md` only when publish or parallel or resume file exists. Handoff always after tasks (and Gate 4 when run).
- **Default local (no units file):** classic handoff — `Unit` column `—`; no Gate 4 when GitLab not possible.
- Template: `../templates/execution-handoff.template.md`
- Planning timestamps:
  - `planning_started_at` (ISO local `YYYY-MM-DDTHH:MM:SS`)
  - `planning_finished_at` (ISO local `YYYY-MM-DDTHH:MM:SS`)
  - `planning_total_seconds` (integer ≥ 0)

Subversions: `subversions/{subversion_san}/execution-handoff.md` (slice scope only).

## Initial generation

### 1. Collect task metadata

Each `task-NNN-*.md` numeric order:

| Field | Source |
| ----- | ------ |
| Task | Short id only: `task-NNN` (from `task-NNN-*.md` — drop slug) |
| Unit | `delivery-units.md` tasks column — `unit-NNN` or `—` when no delivery units file |
| Layer | filename or task body (`backend`, `frontend`, `infra`, `unit-tests`, `e2e`) |

Do **not** put Feature, model tier, or free-form Notes in handoff table — those belong in task file.

### 2. Build execution rules block

Read `requirements.md` and `docs/context/stack-confirmed.md` when present. ≤10 critical bullets into `{execution_rules_block}` — legacy DB constraints, multitenancy, test environment rules. Do not duplicate full requirements.

### 3. Write file

Save `docs/versions/{version_san}/execution-handoff.md` via `../templates/execution-handoff.template.md`:

- All tasks `Status: pending`, timestamps `—`, `Time (s): 0`, `Tokens: 0`
- Header **Tokens (total):** `0`
- `{next_task_id}` = first short id (e.g. `task-001`)
- `{base_branch}` / `{work_branch}` from `gitlab-sync-config.md` when present; else `—`

### 4. Report to face

Handoff path, total tasks indexed, first task ID, start via `../../ns-coder/references/run-implementation.md`.

## Status updates (during implementation)

Task starts, completes, blocks, or waived — **per task row** even when classic mode dispatches multi-task batch:

1. Locate row in **Task status**
2. Update `Status`, `Started at` (on `in_progress` — all batch members at batch start), `Finished at` (on `completed` — per task from worker report), `Time (s)` (`Finished at − Started at`), `Tokens`, `Updated at`
3. **`Tokens` required before `completed`.** Sources (priority):
   1. Usage/tokens from Task result / UI of `coder-agent` + other subagents — **split per task** from worker report, or `~N` estimate per task
   2. Parent tokens for that task if platform surfaces them
   3. Nothing exposed: ask human once; if declined, `~N` estimate + task `## Execution notes` line `tokens: ~N (estimated)`
   **Forbidden:** `0` on `completed` task that did LLM work
4. Recalculate **Tokens (total)** = sum of `Tokens` column (integers; `~N` counts as `N`)
5. Recalculate **Progress** (`Next task` = first short id of next batch — first `pending`/`in_progress` in numeric order = batch head)
6. Recalculate **Time tracking (seconds)**:
   - `Implementation — start` = earliest filled `Started at`
   - `Implementation — end` = latest filled `Finished at` when present
   - `Implementation — total (s)` = end − start
   - `Total task time (s)` = sum of `Time (s)` column
   - `Total process time (s)` = `Planning — total (s)` + `Implementation — total (s)` + (`Final delivery — end` − `Implementation — end` when present)
   - `Last recalculated` = current timestamp
7. Update **Version status** (see template)
8. Optionally append **Session history** (Date + ultra-short Notes only)
9. Blockers, waivers: append task file `## Execution notes` — relevant only; never Notes column in handoff

**GitLab sync:** `delivery-units.md` **GitLab status/spent (SSoT)** — no fourth branch.

Version closure (review, living specs, `_done/` move): fill `Post-implementation review — end`, `Review — tokens` (or Session history note — **not** last task `Tokens` column), `Living specs — end` (when applicable), `Final delivery — end`; recalculate `Total process time (s)`.

### Allowed task statuses

`pending` | `in_progress` | `completed` | `blocked` | `waived`

- **`waived`:** human waiver in task **Execution notes**. Do not waive P0 test tasks (tenant isolation, URL RBAC, auth rate limits) without documented risk acceptance.
- **Forbidden:** mark version `completed` without `Code Review: Approved`
- **Forbidden:** reorder tasks or rewrite base prompt without human approval
- **Forbidden:** delete session history — append only

Tasks added or removed after generation: **regenerate** preserving statuses by task short id.

## Integration

| Stage | Skill / reference |
| ----- | ----------------- |
| After task generation | This phase (generate handoff) |
| Classic implementation | `../../ns-coder/references/run-implementation.md` + `coder-agent` (**MUST** when available) / `ns-coder` |
| Partitioned implementation | `orchestrator.md` (slice handoffs + master closure) |
| End-of-version review | `reviewer-agent` (**MUST** when available) / `ns-reviewer` — `Approved` = **10** (`../../ns-reviewer/references/review-gate-workflow.md`) |
| Living specs | `ns-living-spec` after `Approved` |
| GitLab board sync | `ns-gitlab-board-sync` (when config exists) |

## References

| File | When |
| ---- | ---- |
| `../templates/execution-handoff.template.md` | Handoff structure |
| `../../ns-coder/references/run-implementation.md` | Classic version execution loop |
