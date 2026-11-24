# gitlab-sync-config.md template

Save at `docs/context/gitlab-sync-config.md`

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

# Homologation statuses (optional). Applied only by the QA homologation flow;
# the development flow stops at status_done. Absent key -> that QA status step
# is skipped and logged, never guessed. Uncomment once the labels exist.
# status_ready_for_homologation: "Status: Ready for homologation"
# status_in_homologation: "Status: In homologation"
# status_homologated: "Status: Homologated"
# status_homologation_rejected: "Status: Homologation rejected"

rf_label_format: "RF: {NNN}"  # 3-digit zero-padded

exclude_issues: []  # issue IIDs to skip

base_branch: "develop"
work_branch: "release/1.0.0"
protected_branches:
  - main
mr_target_branch: "develop"

# SDD delivery units (Gate 4 publish)
mr_per_unit: true              # one draft MR per delivery unit
max_parallel_units: 1            # 1 = sequential default; raise only when Gate 4 parallel + A∥B
unit_label_format: "Unit: {unit}"  # e.g. Unit: unit-001
```

This file is the **single source** of status label names. Other configs (e.g. the QA profile) reference these keys only — never the label strings.

Status labels are applied with `set_issue_status` (replaces every `Status: *` label with one). Never apply them with `set_issue_labels`.

Before the first sync, ask the human once to confirm each label string exists in the project or group exactly as written; record the confirmed names here. Never guess a label name.
