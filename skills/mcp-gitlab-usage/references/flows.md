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
3. `set_issue_estimate` with seconds from payload

## Execution sync (per task)

### At task start (before coding)

```
set_issue_labels:
  remove_labels: "<status_backlog>"
  add_labels: "<status_in_progress>"
```

Record start timestamp for `add_issue_spent_time`.

**Base branch:** when starting implementation via `execution-gitlab-issue`, resolve `SOURCE_BRANCH` per `../execution-gitlab-issue/references/source-branch-resolution.md` (milestone/version → `develop_*` / `develop-*` on remote, else mandatory `develop` only — never another base without human confirmation).

### At task completion (after validation)

Only if issue already has `status_in_progress`:

```
set_issue_labels:
  remove_labels: "<status_in_progress>"
  add_labels: "<status_done>,RF: NNN"

add_issue_spent_time: duration seconds
add_issue_comment: internal summary
```

**Anti-pattern:** jumping from backlog directly to done.

## Delivery report flow

1. Get issue URL or `project_id` + `issue_iid`
2. Diff working tree vs base branch
3. `add_issue_comment` internal=true with concise summary

## Pre-call checklist

- [ ] Schema read for unfamiliar tools
- [ ] `project_id` confirmed with human (full trio)
- [ ] Confirmation gates respected
- [ ] Milestone validated (project + group)
- [ ] `generate_issue_payload` called for non-RF execution tasks
- [ ] Status transitions use three-step cycle
