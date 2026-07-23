# Run implementation (classic mode)

Guide the implementer through a **planned version** using `execution-handoff.md`
as entry point and progress tracker.

For partitioned versions (`version-roadmap.md` present), use
`execution-orchestrator` instead — do not follow this workflow in the parent
session.

## Prerequisites

- `{product_root}` and `{version_san}` defined
- `{product_root}/docs/versions/{version_san}/execution-handoff.md` exists
- `{product_root}/docs/versions/{version_san}/tasks/task-*.md` exist

If tasks exist but handoff does not: invoke **`execution-handoff-generator`**
before coding.

## Routing (step 0)

1. Read `{product_root}/docs/versions/{version_san}/version-roadmap.md` when present
2. If roadmap has pending slices → stop; use `execution-orchestrator`
3. Otherwise → classic mode (this workflow)

## Bootstrap (step 1)

1. Read `execution-handoff.md` **in full**
2. Validate **Time tracking (seconds)** section exists; add from template if missing
3. Read `requirements.md` (overview — do not replan)
4. Load product context: follow **Implementation boot rule** in `../../nextstage-harness/references/artifact-layout.md`
5. Identify **Next task** (first `pending`, or resume `in_progress`)
6. Load harness rules for the task layer
7. If `Implementation — start` is empty, fill with current ISO local timestamp

### Work branch (step 1.5 — GitLab)

When `{product_root}/docs/context/gitlab-sync-config.md` exists:

1. Read `base_branch`, `work_branch`, `protected_branches`
2. Stop if branches are missing or current branch is protected
3. Create or checkout `work_branch` once per version before first code task
4. Record branches in handoff **Notes** when applicable

## Per-task loop (step 2)

For each task until scope is done or all tasks complete:

1. **Update handoff — start:** `Status` → `in_progress`; `Started at` → now; `Updated at` → now
   - **GitLab:** if sync config exists, run `gitlab-board-sync` (task start: backlog → in_progress) **before** coding
2. **Read** `tasks/task-NNN-*.md` in full
3. **Implement** per validation criteria (minimal diff, task scope only)
4. **Validate** per project rules (Docker tests, i18n, multitenancy, etc.)
5. **Update handoff — complete:** `Status` → `completed` (or `blocked` + Notes)
   - **GitLab:** sync in_progress → done + spent time after validation
6. **Recalculate (required):**
   - Row `Time (s)` = `Finished at − Started at`
   - `Total task time (s)` = sum of column
   - `Implementation — total (s)` = `Implementation — end − Implementation — start`
   - `Total process time (s)` per handoff formula
   - `Last recalculated` = now
   - **Progress** and **Next task**
7. Advance to next `pending` task

See `../execution-handoff-generator/SKILL.md` for status-update rules and version
status transitions.

## Session end (step 3)

When pausing mid-version:

1. Ensure handoff reflects current progress and session history
2. If implementation finished this session, fill `Implementation — end` and recalculate totals
3. Report: tasks done this session, next task, blockers, accumulated seconds

## Closure (steps 4–6)

When all tasks are `completed` or `waived`:

### Step 4 — Optional UI / nav review

When the product has frontend navigation changes, present grouping proposals and
**wait for human approval** before applying.

### Step 5 — Code review (required)

1. Invoke `code-reviewer` at version closure → `code-review-report.md`
2. Update handoff:
   - **Version status:** `completed` | `completed_with_caveats` | `blocked_delivery`
   - `Post-implementation review — end` + recalculate **Total process time (s)**
3. Do not move to `_done/` with unresolved P0 findings without waiver

### Step 5.5 — Living specs

When status is `completed` or `completed_with_caveats`:

1. Invoke `pm-living-spec-consolidator`
2. Note in handoff; fill `Living specs — end`; recalculate totals

### Step 6 — Version archive

After human confirms (or documented waiver):

1. Move `{version_san}/` → `_done/{version_san}/` when project workflow requires it
2. Fill `Final delivery — end`; recalculate **Total process time (s)**

## Critical rules

- **Always** update `execution-handoff.md` when task status changes
- **Numeric task order** unless explicit dependency in the task file says otherwise
- **Minimal diff** — current task scope only
- **No commits** unless human explicitly asks
- On real blocker: `blocked` + Notes, stop

## References

- Handoff generation and updates: `../execution-handoff-generator/SKILL.md`
- Handoff template: `execution-handoff.template.md`
- Orchestrated mode: `../../execution-orchestrator/SKILL.md`
