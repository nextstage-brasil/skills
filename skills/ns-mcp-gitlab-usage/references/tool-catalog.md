# GitLab MCP tool catalog

Read the MCP tool descriptor before calling. Examples use placeholders — use the human's actual milestone names and paths.

## start_execution_planning

**Required:** `description`, `milestone_name`, `requirements_document_exists`, `requirements_confirmed`, `projects_confirmed`, `issues_creation_confirmed`

**Optional:** `requirements_source_path`, `status`, `origem`, `due_date_days`

- `requirements_document_exists`: check `{product_root}/docs/versions/{milestone_san}/requirements.md`
- Milestone must exist in project **or** group (`list_milestones` + `list_group_milestones`)
- Backend/frontend execution tasks go to their respective projects — confirm with human

## generate_requirements / generate_issue_payload

- Call `generate_requirements` when `requirements.md` is missing — do not hand-craft.
- Call `generate_issue_payload` before `create_issue` for execution tasks — use JSON output exactly.
- RF tasks from requirements may use document structure directly (no payload generator).

## create_issue

**Required:** `project_id`, `title`

**Optional:** `description`, `labels`, `due_date`, `milestone_id`, `related_issue_url`, `link_type`

- `milestone_id` = global id from list tools, not IID
- Never pass reserved label `Remove_Issue` in create/update/add

## set_issue_estimate

**Required:** `project_id`, `issue_iid`, `estimate` (seconds)

Call **after** `create_issue` — GitLab does not accept estimate at creation.

## set_issue_labels

**Required:** `project_id`, `issue_iid`, plus `add_labels`/`remove_labels` **or** `action` + `labels`

- Label changes: one atomic call with both `remove_labels` and `add_labels`
- Do not mix `action`+`labels` with add/remove form

## read_merge_request / list_merge_requests / list_issue_merge_requests

Read-only. Use `read_merge_request` with `mr_iid` for diffs. Filter by `source_branch` / `target_branch` when needed.

## add_issue_comment

Use `internal: true` for delivery reports and implementation summaries.

## add_issue_spent_time

`duration` in integer seconds — use at task completion, not `set_issue_estimate`.

## delete_issue

**Irreversible.** Requires label `Remove_Issue` applied in GitLab UI only, plus `human_confirmed: true` and `confirmation_token: DELETE_ISSUE_CONFIRMED_BY_HUMAN`.

## Milestone tools

- `list_milestones` — project level
- `list_group_milestones` — group level (extract group from `group/project`)

Valid if found in either location.
