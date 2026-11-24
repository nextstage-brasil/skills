---
name: ns-gitlab-board-sync
description: "(NS) Sync existing GitLab issues with local planning/execution — milestone, RF labels, status, assignee, estimates, spent time. Use during implementation when tasks link to GitLab issues or after plan-version-from-gitlab sync — not for creating new issues (use mcp-gitlab-usage). Status via set_issue_status; other labels via one atomic set_issue_labels; three-step status cycle."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.3"
---

# GitLab Board Sync

Mirror local SDD planning/execution state onto **existing** GitLab issues. Does **not** create issues.

## Prerequisites

1. GitLab MCP available — follow `mcp-gitlab-usage` for all tool calls
2. If multiple GitLab MCP servers: ask human which to use
3. `docs/context/gitlab-sync-config.md` validated
4. For post-planning batch: `gitlab-issue-feature-map.md` exists

## Configuration

Read `references/gitlab-sync-config.template.md` for expected fields:

- `project_id`, `milestone_id`, `assignee_default`
- `status_backlog`, `status_in_progress`, `status_done`, `status_blocked`
- Optional homologation keys (`status_ready_for_homologation`, `status_in_homologation`, `status_homologated`, `status_homologation_rejected`) — QA homologation flow only; this skill never applies them
- `rf_label_format`, `base_branch`, `work_branch`, `mr_target_branch`

Config = **single source** of status label names. Label name missing/unconfirmed → ask human once, record in config. Never guess. No label-listing MCP tool.

## Label tools

| Label kind | Tool |
| ---------- | ---- |
| `Status: *` | `set_issue_status` — replaces every `Status: *` label with one. **FORBIDDEN:** `set_issue_labels` for `Status: *` |
| Others (RF, team, unit) | **One** `set_issue_labels` per transition — `remove_labels` + `add_labels` atomically |

## Status guard

`set_issue_status` replaces every `Status: *` label → read current status (`read_issue`) first. Never overwrite in-progress/done/blocked on re-sync.

| Transition | Current status | Action |
| ---------- | -------------- | ------ |
| Flow A | none, or `status_backlog` | Set `status_backlog` (no-op when already set) |
| Start (task / unit) | none, or `status_backlog` | Set `status_in_progress` |
| Start (task / unit) | `status_in_progress` | Skip |
| Complete (task / unit) | `status_in_progress` | Set `status_done` |
| Any | other | Change nothing; report issue + current status |

## Flow C — Pre-implementation read

When task lists GitLab issue IIDs:

1. `read_issue` for description + recent comments
2. Non-blocking if inaccessible — log warning, continue
3. **Do not mutate** issue in this flow

## Flow A — Post-planning batch

Per issue in map (excluding `exclude_issues`):

1. Validate milestone (project + group)
2. `update_issue` with `milestone_id`
3. `set_issue_status: status_backlog` per **Status guard**; **one** `set_issue_labels` for non-status labels (RF, team)
4. `assign_issue`
5. `set_issue_estimate` from linked task header (seconds) **only if** `time_stats.time_estimate` is empty — never overwrite; skip values < 60

## Flow B — Per-task execution sync (legacy 1:1)

**Mutual exclusion:** any `issue_iid` in `delivery-units.md` → **do not** run Flow B. Owner = `../ns-spec-driven/references/delivery-units.md` **GitLab status/spent (SSoT)**.

When task row maps 1:1 to its own GitLab issue (no delivery units file, or unpublished units + legacy `gitlab-issue-feature-map.md`):

### Task start (before coding)

```
set_issue_status: status_in_progress   # Status guard
```

Record `START_TIME` / `START_EPOCH` when coding starts (for wall-clock `add_issue_spent_time` — see `../ns-execution-gitlab-issue/references/time-tracking.md`).

### Task complete (after validation)

Only if already `status_in_progress` (Status guard):

```
set_issue_status: status_done
set_issue_labels add: RF: NNN
add_issue_spent_time
add_issue_comment (internal=true)
```

**Never** backlog → done in one step.

## Flow D — Per delivery unit

Run **only** when SSoT row is Flow D (published `issue_iid` + local execute, no G). When G owns lifecycle → **skip entire Flow D**.

### Unit start (before coding unit tasks)

```
set_issue_status: status_in_progress   # Status guard
```

Record `START_TIME` / `START_EPOCH` when coding starts for unit (wall-clock for unit-level spent).

### Unit complete (after unit validation + review approved)

Only if already `status_in_progress` (Status guard):

```
set_issue_status: status_done
add_issue_comment (internal=true)
```

**Local-only** (SSoT Flow D row): include `add_issue_spent_time` once per unit (wall-clock, not `estimate_sum`); set `spent_posted` = `yes`.

**Never** backlog → done in one step. **Never** `add_issue_spent_time` per task inside unit. **Never** Flow D when G owns the same issue.

## Anti-patterns

| Wrong                               | Right                            |
| ----------------------------------- | -------------------------------- |
| `assignee` on `update_issue`        | `assign_issue`                   |
| `Status: *` via `set_issue_labels`  | `set_issue_status`               |
| Two label calls for one non-status transition | Single atomic `set_issue_labels` |
| Guessed label names                 | Config keys; ask human once      |
| Manual `Milestone:` label           | `milestone_id` on `update_issue` |
| `set_issue_estimate` for time spent | `add_issue_spent_time` with wall-clock duration |
| `set_issue_estimate` when estimate already set | Skip — preserve existing |
| Plan/`estimate_seconds` as spent `duration` | Epoch delta only (`time-tracking.md`) |
| Public comment for internal notes   | `internal: true`                 |

## References

| File                                        | When                   |
| ------------------------------------------- | ---------------------- |
| `references/gitlab-sync-config.template.md` | Bootstrap config       |
| `mcp-gitlab-usage`                          | Tool schemas and gates |
| `../ns-spec-driven/references/delivery-units.md` | GitLab status/spent (SSoT) |
