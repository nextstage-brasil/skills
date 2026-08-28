# Run implementation (classic mode)

Guide the implementer through a **planned version** using `execution-handoff.md`
as entry point and progress tracker.

No `delivery-units.md` = **classic default** (batched same-layer dispatch) — normal local path, not legacy-only.

**Unit-scoped run** (stay in this file, step 0b): caller is G SDD unit mode **or** current `unit` is set **or** (`delivery-units.md` exists and this is **not** a top-level partitioned parent with pending slices). Top-level parent + `version-roadmap.md` pending slices + **no** `unit` → `../../ns-spec-driven/references/orchestrator.md`. Do not bounce a unit-scoped run back to orchestrator.

**Batching:** this file only. Classic batch = same-layer consecutive `pending`, prefer **4–7**, hard **max 7**, fewer OK (size 1 = single-task). Slice **target 4–7** = `version-partitioner.md` only. **Unit-scoped:** batch = all tasks in current `unit` only.

**GitLab:** `../../ns-spec-driven/references/delivery-units.md` **GitLab status/spent (SSoT)** — no fourth branch.

## Prerequisites

- `{version_san}` defined
- `docs/versions/{version_san}/execution-handoff.md` exists
- `docs/versions/{version_san}/tasks/task-*.md` exist

If tasks exist but handoff does not: invoke **`execution-handoff.md`** phase (via `ns-spec-driven`)
before coding.

## Routing (step 0)

1. Read `docs/versions/{version_san}/version-roadmap.md` when present
2. Read `docs/versions/{version_san}/delivery-units.md` when present
3. If **unit-scoped run** (definition above) → **step 0b**
4. Else if roadmap has pending slices → stop; use `../../ns-spec-driven/references/orchestrator.md`
5. Else → classic mode (this workflow)

### Step 0b — Unit mode

1. Read `delivery-units.md` — waves, deps, `issue_iid`, `gate4_mode`
2. **Current unit:** if caller set `unit` → use it. Else (local loop only) → lowest wave with `pending`/`in_progress` whose deps are `completed`
3. **Batch** = all tasks listed in that unit only — never mix units in one dispatch
4. Worktree per unit: `.worktrees/{unit}`; work branch `work/{unit}-{slug}`
5. Parallel: only when `gate4_mode` = parallel **and** same-wave units satisfy `A ∥ B`; respect `max_parallel_units`. Caller-set `unit` never stolen by a different wave pick.
6. **GitLab:** if caller is G → no board writes in this file. Else apply SSoT at **unit** start/end only.

## Bootstrap (step 1)

1. Read `execution-handoff.md` **in full**
2. Session boot once at implementer start per `session-boot.md` (obey `AGENTS.md` in context; no tool-Read); obey any mandatory product skills named there
3. Validate **Time tracking (seconds)** section exists; add from template if missing
4. Read `requirements.md` (overview — do not replan); confirm Consistency status is `Approved` when present
5. Load product context: follow **Implementation boot rule** in `../../../ns-harness/references/artifact-layout.md`
6. **Next batch:**
   - **Unit mode:** all `pending`/`in_progress` tasks in current unit (step 0b) — ignore layer 4–7 classic cap
   - **Classic:** consecutive `pending` same layer (max 7); Progress **Next task** = first short id of that batch (or resume `in_progress`)
7. Load harness rules for the batch layer(s)
8. If `Implementation — start` is empty, fill with current ISO local timestamp

### Work branch (step 1.5 — GitLab)

**Unit mode:** skip version-level `work_branch`. Use per-unit `.worktrees/{unit}` + `work/{unit}-{slug}` from `delivery-units.md` / caller (`ns-execution-gitlab-issue`).

**Classic only** — when `docs/context/gitlab-sync-config.md` exists and no unit mode:

1. Read `base_branch`, `work_branch`, `protected_branches`
2. Stop if branches are missing or current branch is protected
3. Create or checkout `work_branch` once per version before first code task
4. Record branches in the task **Execution notes** when applicable

## Per-batch loop (step 2)

Until scope done or all tasks complete:

### Select batch

- **Unit mode:** batch = all tasks in current unit row — never tasks from another unit
- **Classic:** consecutive `pending` tasks, **same layer**, prefer **4–7**, hard **max 7**, fewer OK when fewer remain. Stop before dependency on unfinished task. Size 1 → single-task dispatch.

### Dispatch

1. **Update handoff — batch start:** each selected row `Status` → `in_progress`; `Started at` → now; `Updated at` → now
   - **GitLab batch start:** if caller is `ns-execution-gitlab-issue` → **zero** board writes here. Else apply SSoT at **unit** start only (Flow B per task only when SSoT Flow B row).
2. **Read** each `tasks/task-NNN-*.md` **card** (header through Validation criteria). Open `Detailed description` on demand — ambiguity or `blocked`. See `../../ns-spec-driven/references/task-schema.md`.
3. **Before coding:** Session boot already done in Bootstrap — re-read rules **only** if `agents.local.md` or harness rules changed (no per-batch re-read; never tool-Read `AGENTS.md`)
4. **Implement** — **one** `coder-agent` dispatch per batch (**MUST** when available; loads `ns-coder`); else `ns-coder` direct. See `../../../ns-harness/references/subagent-dispatch.md`.
   - **Dispatch must state SDD handoff mode:** this batch only; unit/integration OK; **do not** invoke `reviewer-agent` / `ns-reviewer`; **do not** run living specs; review = **Step 5** only.
   - Worker reports per-task outcomes (files, tests, blockers, tokens). Parent owns `execution-handoff.md`.
5. **Validate** per project rules (Docker **unit/integration** tests, i18n, multitenancy, etc.)
   - **Allowed:** unit/integration only (e.g. PHPUnit in test container)
   - **Forbidden:** run E2E (Cypress or equivalent) during any task — including `e2e`-layer tasks. Writing E2E specs OK; **running** them not. Human runs E2E after all tasks complete.
   - **Forbidden:** per-task / mid-version / mid-batch code review — wait for Step 5
6. **Collect Tokens** (required before each `completed`). Sources (priority):
   1. Usage/tokens from Task result / UI of `coder-agent` + other subagents — **split per task** from worker report, or `~N` estimate per task
   2. Parent tokens attributable to that task if platform surfaces them
   3. Nothing exposed: ask human once; if declined, `~N` estimate + task `## Execution notes` line `tokens: ~N (estimated)`
   **Forbidden:** `0` on `completed` task that did LLM work
7. **Update handoff — per task from worker report:** each task `Status` → `completed` (or `blocked`); write `Tokens` (step 6)
   - On `blocked` / waiver / important events: append to task file `## Execution notes` (relevant only)
   - **GitLab complete:** if caller is G → **zero** board writes here. Else SSoT at **unit** end only (never per-task spent when units published).
8. **Recalculate (required)** after batch (or after each task if reporting incremental):
   - Row `Time (s)` = `Finished at − Started at`
   - **Tokens (total)** = sum of `Tokens` (integers; `~N` counts as `N`)
   - `Total task time (s)` = sum of column
   - `Implementation — total (s)` = `Implementation — end − Implementation — start`
   - `Total process time (s)` per handoff formula
   - `Last recalculated` = now
   - **Progress** and **Next task**
9. Advance to next batch

See `../../ns-spec-driven/references/execution-handoff.md` for status-update rules and version
status transitions.

## Session end (step 3)

When pausing mid-version:

1. Ensure handoff reflects current progress and session history (ultra-short Notes)
2. If implementation finished this session, fill `Implementation — end` and recalculate totals
3. Report: tasks done this session, next batch/task, blockers, accumulated seconds and tokens

## Closure (steps 4–6)

When all tasks are `completed` or `waived`:

### Step 4 — Optional UI / nav review

When the product has frontend navigation changes, present grouping proposals and
**wait for human approval** before applying.

### Step 4.5 — E2E (human only)

Do **not** run E2E as the agent. Tell the human that E2E is their gate at version
end (after tasks complete; before or alongside review as they prefer). Agents may
have written E2E specs earlier — execution of those suites is human-owned.

### Step 5 — Code review (required)

1. **MUST** invoke `reviewer-agent` when available (else `ns-reviewer`) at version closure. See `../../../ns-harness/references/subagent-dispatch.md`.
2. Do **not** require `code-review-report.md`. On `Rejected`/`Blocked`, use reviewer's minimal fix map (agent-oriented) to correct and re-review.
3. Update handoff:
   - **Version status:** `completed` | `completed_with_caveats` | `blocked_delivery`
   - `Post-implementation review — end` + recalculate **Total process time (s)**
   - Register **review tokens** in **Time tracking** (`Review — tokens`) or **Session history** (version-level) — **not** last task `Tokens` column
4. Do not move to `_done/` with unresolved Critical findings without waiver

### Step 5.5 — Living specs

When status is `completed` or `completed_with_caveats` and review is `Approved`:

1. Invoke `ns-living-spec`
2. Note in handoff; fill `Living specs — end`; recalculate totals

### Step 6 — Version archive

After human confirms (or documented waiver):

1. Move `{version_san}/` → `_done/{version_san}/` when project workflow requires it
2. Fill `Final delivery — end`; recalculate **Total process time (s)**

## Critical rules

- **Always** update `execution-handoff.md` when task status changes — rows stay **per task**; parent owns file
- **Batching:** **unit mode** on **unit-scoped run** (step 0 definition — all tasks in that `unit`). **Classic** only when not unit-scoped — same-layer consecutive `pending`, prefer 4–7, hard max 7.
- **AGENTS first** — Session boot once in Bootstrap (step 1); no rule re-read per batch unless `agents.local.md` or harness rules changed; never tool-Read `AGENTS.md`
- **Numeric task order** unless explicit dependency in the task file says otherwise
- **Minimal diff** — current batch scope only
- **No commits** unless human explicitly asks
- On real blocker: `blocked` + task **Execution notes**, stop
- **No E2E runs** during tasks — unit/integration only; human runs E2E at end
- **No per-task / mid-batch review** — `coder-agent` / `ns-coder` must not call review gate; **only** Step 5 invokes `reviewer-agent` / `ns-reviewer`

## References

- Handoff generation and updates: `../../ns-spec-driven/references/execution-handoff.md`
- Handoff template: `../../ns-spec-driven/templates/execution-handoff.template.md`
- Orchestrated mode: `../../ns-spec-driven/references/orchestrator.md`
