# Run implementation (classic mode)

Planned version via `execution-handoff.md` as entry + progress tracker.

No `delivery-units.md` = **classic default** (batched same-layer dispatch) — not legacy-only.

**Unit-scoped run** (stay in this file, step 0b): caller is G SDD unit mode **or** current `unit` is set **or** (`delivery-units.md` exists and this is **not** a top-level partitioned parent with pending slices). Top-level parent + `version-roadmap.md` pending slices + **no** `unit` → `../../ns-spec-driven/references/orchestrator.md`. Do not bounce a unit-scoped run back to orchestrator.

**Batching:** this file only. Classic batch = same-layer consecutive `pending`, prefer **4–7**, hard **max 7**, fewer OK (size 1 = single-task). Slice **target 4–7** = `version-partitioner.md` only. **Unit-scoped:** batch = all tasks in current `unit` only.

**GitLab:** `../../ns-spec-driven/references/delivery-units.md` **status/spent (SSoT)** — no fourth branch.

## Prerequisites

- `{version_san}` defined
- Resolved `execution-handoff.md` exists — `docs/versions/{version_san}/sdd/execution-handoff.md` first; legacy `docs/versions/{version_san}/execution-handoff.md` if unmigrated (`artifact-layout.md` **Legacy path resolution**)
- Resolved `tasks/task-*.md` exist — `sdd/tasks/` first; legacy `tasks/` if unmigrated

If classic artifacts only at version root → nest migration STOP (`session-continuity.md`); no dual-write. If tasks exist but handoff does not: invoke **`execution-handoff.md`** phase (via `ns-spec-driven`) before coding.

## Routing (step 0)

1. Read resolved `version-roadmap.md` — `sdd/` first, else legacy version root (`artifact-layout.md` **Legacy path resolution**) when present
2. Read resolved `delivery-units.md` — `sdd/` first, else legacy version root when present
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
4. Read resolved `requirements.md` — `sdd/` first, else legacy version root (overview — do not replan); confirm Consistency status is `Approved` when present
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
- **Classic:** consecutive `pending`, **same layer**, prefer **4–7**, hard **max 7**. Stop before unfinished dependency. Size 1 → single-task. Numeric order unless the task file names a dependency.

### Dispatch

1. **Update handoff — batch start:** each selected row `Status` → `in_progress`; `Started at` → now; `Updated at` → now
   - **GitLab batch start:** if caller is `ns-execution-gitlab-issue` → **zero** board writes here. Else apply SSoT at **unit** start only (Flow B per task only when SSoT Flow B row).
2. **Read** each `tasks/task-NNN-*.md` **card** (header through Validation criteria). If `### Contract` present (API/schema/screen), always read it. Open cited `source/` section anchors for the batch. Open `Detailed description` on demand — ambiguity or `blocked`. See `../../ns-spec-driven/references/task-schema.md`.
3. **Before coding:** Session boot already done in Bootstrap — re-read rules **only** if `agents.local.md` or harness rules changed (no per-batch re-read; never tool-Read `AGENTS.md`)
4. **Implement** — **one** `coder-agent` dispatch per batch (**MUST** when available; loads `ns-coder`); else `ns-coder` direct. See `../../../ns-harness/references/subagent-dispatch.md`.
   - **Dispatch must state SDD handoff mode:** this batch only; unit/integration OK; **do not** invoke `reviewer-agent` / `ns-reviewer`; **do not** run living specs; review = **Step 5** only. Workers grep new/changed public exports before marking complete (keep unused names unexported).
   - Worker reports per-task outcomes (files, tests, blockers, tokens). Parent owns `execution-handoff.md`.
5. **Validate** per project rules (Docker **unit/integration** tests, i18n, multitenancy, etc.)
   - **Allowed:** unit/integration only (e.g. PHPUnit in test container)
   - **Forbidden:** run E2E (Cypress or equivalent) during any task — including `e2e`-layer tasks. Writing E2E specs OK; **running** them not. Human runs E2E after all tasks complete.
   - **Forbidden:** per-task / mid-version / mid-batch code review — wait for Step 5
6. **Collect Tokens** before each `completed`. Prefer worker/UI usage split per task; else parent tokens; else ask once then `~N` + `tokens: ~N (estimated)` in task Execution notes. **Forbidden:** `0` on `completed` LLM work.
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
9. Advance to next batch. Status rules: `../../ns-spec-driven/references/execution-handoff.md`.

## Session end (step 3)

Pause: handoff matches progress; ultra-short Notes. Impl finished this session: fill `Implementation — end`, totals. Report: tasks done, next batch, blockers, seconds, tokens.

## Closure (steps 4–6)

When all tasks are `completed` or `waived`: read `references/run-implementation-closure.md` (steps 4–6 + critical rules). Do not load that file during the per-batch loop.

Partitioned parent: `../../ns-spec-driven/references/orchestrator.md`.
