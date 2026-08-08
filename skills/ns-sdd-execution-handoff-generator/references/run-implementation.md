# Run implementation (classic mode)

Guide the implementer through a **planned version** using `execution-handoff.md`
as entry point and progress tracker.

For partitioned versions (`version-roadmap.md` present), use
`ns-execution-orchestrator` instead — do not follow this workflow in the parent
session.

## Prerequisites

- `{product_root}` and `{version_san}` defined
- `{product_root}/docs/versions/{version_san}/execution-handoff.md` exists
- `{product_root}/docs/versions/{version_san}/tasks/task-*.md` exist

If tasks exist but handoff does not: invoke **`ns-sdd-execution-handoff-generator`**
before coding.

## Routing (step 0)

1. Read `{product_root}/docs/versions/{version_san}/version-roadmap.md` when present
2. If roadmap has pending slices → stop; use `ns-execution-orchestrator`
3. Otherwise → classic mode (this workflow)

## Bootstrap (step 1)

1. Read `execution-handoff.md` **in full**
2. Re-read `{product_root}/AGENTS.md` (and `agents.local.md` if present); complete Session boot from the harness; obey any mandatory product skills named there
3. Validate **Time tracking (seconds)** section exists; add from template if missing
4. Read `requirements.md` (overview — do not replan); confirm Consistency status is `Approved` when present
5. Load product context: follow **Implementation boot rule** in `../../ns-harness/references/artifact-layout.md`
6. Identify **Next task** (first `pending`, or resume `in_progress`)
7. Load harness rules for the task layer
8. If `Implementation — start` is empty, fill with current ISO local timestamp

### Work branch (step 1.5 — GitLab)

When `{product_root}/docs/context/gitlab-sync-config.md` exists:

1. Read `base_branch`, `work_branch`, `protected_branches`
2. Stop if branches are missing or current branch is protected
3. Create or checkout `work_branch` once per version before first code task
4. Record branches in the task **Execution notes** when applicable

## Per-task loop (step 2)

For each task until scope is done or all tasks complete:

1. **Update handoff — start:** `Status` → `in_progress`; `Started at` → now; `Updated at` → now
   - **GitLab:** if sync config exists, run `ns-gitlab-board-sync` (task start: backlog → in_progress) **before** coding
2. **Read** `tasks/task-NNN-*.md` in full
3. **Before coding:** Session boot from Bootstrap step 1 — re-read `AGENTS.md` / rules **only** if `agents.local.md` or harness rules changed
4. **Implement** per validation criteria (minimal diff, task scope only) — **MUST** dispatch **`coder-agent`** when available (loads `ns-code-coder`); else `ns-code-coder` direct. See `../../ns-harness/references/subagent-dispatch.md`.
   - **Dispatch must state SDD handoff mode:** this task only; unit/integration OK; **do not** invoke `reviewer-agent` / `ns-code-reviewer`; **do not** run living specs; review = **Step 5** only.
5. **Validate** per project rules (Docker **unit/integration** tests, i18n, multitenancy, etc.)
   - **Allowed:** unit/integration only (e.g. PHPUnit in test container)
   - **Forbidden:** run E2E (Cypress or equivalent) during any task — including `e2e`-layer tasks. Writing E2E specs OK; **running** them not. Human runs E2E after all tasks complete.
   - **Forbidden:** per-task / mid-version code review — wait for Step 5
6. **Update handoff — complete:** `Status` → `completed` (or `blocked`); fill `Tokens` when known
   - On `blocked` / waiver / important events: append to the task file `## Execution notes` (relevant only)
   - **GitLab:** sync in_progress → done + spent time after validation
7. **Recalculate (required):**
   - Row `Time (s)` = `Finished at − Started at`
   - **Tokens (total)** = sum of `Tokens`
   - `Total task time (s)` = sum of column
   - `Implementation — total (s)` = `Implementation — end − Implementation — start`
   - `Total process time (s)` per handoff formula
   - `Last recalculated` = now
   - **Progress** and **Next task**
8. Advance to next `pending` task

See `../SKILL.md` for status-update rules and version
status transitions.

## Session end (step 3)

When pausing mid-version:

1. Ensure handoff reflects current progress and session history (ultra-short Notes)
2. If implementation finished this session, fill `Implementation — end` and recalculate totals
3. Report: tasks done this session, next task, blockers, accumulated seconds and tokens

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

1. **MUST** invoke `reviewer-agent` when available (else `ns-code-reviewer`) at version closure. See `../../ns-harness/references/subagent-dispatch.md`.
2. Do **not** require `code-review-report.md`. On `Rejected`/`Blocked`, use the reviewer's minimal fix map (agent-oriented) to correct and re-review.
3. Update handoff:
   - **Version status:** `completed` | `completed_with_caveats` | `blocked_delivery`
   - `Post-implementation review — end` + recalculate **Total process time (s)**
4. Do not move to `_done/` with unresolved Critical findings without waiver

### Step 5.5 — Living specs

When status is `completed` or `completed_with_caveats` and review is `Approved`:

1. Invoke `ns-sdd-living-spec-consolidator`
2. Note in handoff; fill `Living specs — end`; recalculate totals

### Step 6 — Version archive

After human confirms (or documented waiver):

1. Move `{version_san}/` → `_done/{version_san}/` when project workflow requires it
2. Fill `Final delivery — end`; recalculate **Total process time (s)**

## Critical rules

- **Always** update `execution-handoff.md` when task status changes
- **AGENTS first** — Session boot once in Bootstrap (step 1); no full `AGENTS.md` / rule re-read per task unless those files changed
- **Numeric task order** unless explicit dependency in the task file says otherwise
- **Minimal diff** — current task scope only
- **No commits** unless human explicitly asks
- On real blocker: `blocked` + task **Execution notes**, stop
- **No E2E runs** during tasks — unit/integration only; human runs E2E at end
- **No per-task review** — `coder-agent` / `ns-code-coder` must not call review gate; **only** Step 5 invokes `reviewer-agent` / `ns-code-reviewer`

## References

- Handoff generation and updates: `../SKILL.md`
- Handoff template: `execution-handoff.template.md`
- Orchestrated mode: `../../ns-execution-orchestrator/SKILL.md`
