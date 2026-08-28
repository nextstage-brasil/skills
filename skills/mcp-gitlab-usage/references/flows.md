# GitLab MCP flows

## Planning flow

1. `start_execution_planning` with gates false
2. If no requirements: `generate_requirements` → save to `{product_root}/docs/versions/{milestone_san}/requirements.md`
3. Human validates → `requirements_confirmed: true`
4. Confirm all projects → `projects_confirmed: true`
5. Validate milestone exists (project + group)
6. Human confirms issue creation → `issues_creation_confirmed: true`
7. Create issues per plan (RF from requirements; execution via `generate_issue_payload`)

## Issue creation flow (execution task)

1. `generate_issue_payload`(description)
2. `create_issue` with labels from JSON + fixed labels (Equipe, Group, Milestone, Origem, RF, Status, Priority, etc.)
3. `set_issue_estimate` with seconds from payload (new issue — estimate is empty)

## Execution sync (per task)

**Gate:** run this section **only** when `../../ns-spec-driven/references/delivery-units.md` **GitLab status/spent (SSoT)** is the Flow B row (legacy 1:1, no published unit `issue_iid`). Published units: **do not** use this section — G Phase 3 or Flow D per SSoT.

### At task start (before coding)

```
set_issue_labels:
  remove_labels: "<status_backlog>"
  add_labels: "<status_in_progress>"
```

Record `START_TIME` / `START_EPOCH` for `add_issue_spent_time` **when coding actually starts** (not during prep gates). See `../../ns-execution-gitlab-issue/references/time-tracking.md`.

**Base branch:** when starting implementation via `ns-execution-gitlab-issue`, resolve `SOURCE_BRANCH` per `../../ns-execution-gitlab-issue/references/source-branch-resolution.md` (milestone/version → `develop_*` / `develop-*` on remote, else mandatory `develop` only — never another base without human confirmation).

### At task completion (after validation)

Only if issue already has `status_in_progress`:

```
set_issue_labels:
  remove_labels: "<status_in_progress>"
  add_labels: "<status_done>,RF: NNN"

add_issue_spent_time: duration = wall-clock ELAPSED_SECONDS (never estimate)
add_issue_comment: internal summary
```

**Anti-pattern:** jumping from backlog directly to done.

**Estimate on existing issues:** `set_issue_estimate` only when `time_stats.time_estimate` is empty; never overwrite; never < 60s.

## Delivery report flow

1. Get issue URL or `project_id` + `issue_iid`
2. Diff working tree vs base branch
3. `add_issue_comment` internal=true with concise summary

## SDD delivery-unit publish

When `delivery-units.md` exists and human confirmed Gate 4 publish (`gates.md`):

**Per unit row** (wave order; parallel only when Gate 4 = parallel and `A ∥ B`):

1. Build issue body from `../../ns-spec-driven/templates/gitlab-unit-issue.template.md` (title = unit `title` column).
2. `generate_issue_payload`(description) — execution task, not RF-from-requirements alone.
3. `create_issue` — `status_backlog`, milestone from version, labels per project (include `unit_label_format` from `gitlab-sync-config.md` when set).
4. `set_issue_estimate` — **sum** of task estimates in unit (`estimate_sum` column). Only when new issue estimate empty; never overwrite; never < 60s.
5. Write `issue_iid` back to `delivery-units.md` row.
6. Repeat for all units before `execution-handoff.md`.

**At unit completion:** `../../ns-spec-driven/references/delivery-units.md` **GitLab status/spent (SSoT)** — G Phase 3 or Flow D local-only; never both.

**Resume:** reuse existing `issue_iid` — never re-create on session continue.

## Pre-call checklist

- [ ] Schema read for unfamiliar tools
- [ ] `project_id` confirmed with human (full trio)
- [ ] Confirmation gates respected
- [ ] Milestone validated (project + group)
- [ ] `generate_issue_payload` called for non-RF execution tasks
- [ ] Status transitions use three-step cycle
