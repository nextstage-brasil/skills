# Delivery units — {version_san}

**Generated:** {generated_at}
**SOURCE_BRANCH:** `{source_branch}` *(resolved once per version — `ns-execution-gitlab-issue` source-branch-resolution)*
**Gate 4 — GitLab publish:** `{gate4_gitlab}` *(yes | no)*
**Gate 4 — execution mode:** `{gate4_mode}` *(sequential | parallel)*

> Computed after all `task-*.md`, before `execution-handoff.md`. One GitLab issue per row when published.

---

## Unit table

| unit | title | tasks | deps | wave | estimate_sum | issue_iid | mr_url | spent_posted | status |
|------|-------|-------|------|------|--------------|-----------|--------|--------------|--------|
{unit_rows}

**status values:** `pending` | `in_progress` | `completed` | `blocked` | `waived`

**spent_posted:** `yes` after unit-level `add_issue_spent_time` (G Phase 3 or Flow D local-only per SSoT) — never per task inside unit.

**tasks column:** comma-separated short ids (`task-001`, `task-002`) — order = execution order inside unit.

**deps column:** comma-separated unit ids this unit waits on, or `—`.

**estimate_sum:** sum of task `Estimate (seconds)` — used for `set_issue_estimate` at publish.

**issue_iid / mr_url:** filled at Gate 4 publish and during unit execution. Resume must reuse — never re-create.

---

## Wave summary

| Wave | units | parallel OK (A ∥ B) |
|------|-------|---------------------|
{wave_rows}

---

## Notes

{notes_block}
