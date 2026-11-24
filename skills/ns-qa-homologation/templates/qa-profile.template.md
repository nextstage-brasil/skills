# QA profile

Project QA profile for `ns-qa-homologation`. Install at `docs/context/qa-profile.md`.

- This file is the **only** place for project-specific QA values. The skill reads keys; it never hardcodes values.
- Replace every `<placeholder>`. A profile that still contains a placeholder fails `qa_gate.py --check-profile` (exit 3).
- Keep exactly **one** fenced `yaml` block. It must stay inside the supported YAML subset (see `references/profile-schema.md` → YAML subset).
- Field reference: `references/profile-schema.md` and `references/profile-schema-policy.md`.
- Fields written by discovery carry a trailing `# inferred` comment. While any remains, autonomy is capped at L1. Remove the marker after you confirm the value.
- `autonomy_level` starts at `L1` (execute + local report). Raising it to `L2` / `L3` is an explicit human edit.
- Status **label names** live only in `tracker.status_source` (the GitLab sync config). This profile stores the config **keys**.

```yaml
qa_profile_version: 1
language: en                      # report + tracker comment language (BCP 47)
autonomy_level: L1                # L0 | L1 | L2 | L3

tracker:
  kind: gitlab-mcp
  mcp_server: <mcp-server-name>
  product_project: <group/product-project or numeric id>
  qa_issues:
    mode: separate_project        # separate_project | same_project | none
    project: <group/qa-project or numeric id>   # only when separate_project
    signal:
      title_prefix: ["<QA issue title prefix>"]
      labels: ["<QA issue label>"]
    link_relation: "Related to"
  ignore_authors: ["<bot-username>"]
  status_source: docs/context/gitlab-sync-config.md
  status_sync:                    # gitlab-sync-config KEYS, never label names
    dev_from: status_ready_for_homologation
    dev_running: status_in_homologation
    qa_from: status_backlog
    qa_running: status_in_progress
  status_result:
    homologated: status_homologated
    homologation_rejected: status_homologation_rejected
  mr_edit: none                   # glab | none
  attachments: { max_per_comment: 10 }

environment:
  provider: script                # script | url | none
  script: scripts/qa-env.sh       # qa-env contract: up | health | seed | reset | down | info
  isolation: slot
  health_checks:
    - { kind: http, url: "{api}/health", expect: 200 }
    - { kind: login }

auth:
  strategy: ui-form               # ui-form | api-token | storage-state
  credentials_env: [QA_LOGIN_USER, QA_LOGIN_PASSWORD]   # env var NAMES only, never values
  credentials_file: <gitignored-credentials-file>
  session_check: { kind: local_storage, keys: ["<access-token-key>"] }
  profile_under_test: <role>

execution:
  runner: <cypress | playwright | none>
  e2e_root: <in-repo e2e dir or external e2e repo path>
  e2e_authoring: auto             # auto | repo-local | ns-e2e-tests
  e2e_git:                        # required at L3
    base_branch: <e2e-base-branch>
    branch_pattern: "qa/{iid}-{slug}"
    commit_prefix: "test(e2e):"
    commit_language: en
  browser_tool_preference: [<browser-tool>, <browser-tool>]
  stability_runs: 2
  runner_retries_during_verification: 0
  budget:
    max_scenarios: unlimited
    checkpoint_min: 60
    on_checkpoint: ask
    on_stall: ask

data:
  location: disposable_env
  run_prefix: "<run data prefix>"
  seed: { kind: script, ref: <seed-script-or-endpoint> }   # api | script | none
  mock:
    allowed: true
    order: [product_api, db_fixture, response_intercept]
  teardown: discard_env           # discard_env (provider script) | none (provider url)

evidence:
  dir: docs/qa/{run_id}          # run_id = <dev iid>-<UTC timestamp>
  capture: [screenshot, console, network, runner_video]
  pii_masking: dom
  pii_fields: ["<css-selector>"]
  keep_on_upload_failure: true

cleanup:
  on_full_success: [containers, volumes, images, worktrees, evidence]
  keep_local_report_at_L1: true
  scope: run_owned_only
  on_failure: keep
  log: docs/qa/cleanup.log

verdict:
  criticality_weights: { critical: 4, high: 3, medium: 2, low: 1 }
  blocked_scenario_ratio: 0.2
  flaky_on_critical_cap: with_reservations
  derived_critical_cap: with_reservations

judge:
  weights: { coverage: 3, depth: 2, impact: 1.5, evidence: 1.5, data_realism: 1, stability: 1 }
  min_score: 8.5
  on_below_min: complete

policy:
  verdict_publish: final
  publish_comment: on_approval
  set_status_labels: auto
  open_e2e_mr: auto
  e2e_reviewer: ns-reviewer
  runner_none_critical_cap: with_reservations
  close_issues: never
  log_spent_time: never
```
