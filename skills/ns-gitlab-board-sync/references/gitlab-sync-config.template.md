# gitlab-sync-config.md template

Save at `{product_root}/docs/context/gitlab-sync-config.md`

```yaml
# GitLab board sync configuration
gitlab_mcp_server: ""  # required when multiple MCP servers exist
project_id: 0          # numeric — confirm trio with human

assignee_default: "dev_bot"
milestone_id: 0        # global milestone id

status_backlog: "Status: Backlog"
status_in_progress: "Status: In progress"
status_done: "Status: Done"
status_blocked: "Status: Blocked"

rf_label_format: "RF: {NNN}"  # 3-digit zero-padded

exclude_issues: []  # issue IIDs to skip

base_branch: "develop"
work_branch: "release/1.0.0"
protected_branches:
  - main
mr_target_branch: "develop"
```

Validate label strings against `list_project_labels` before first sync.
