# QA profile schema (Phase 0 contract)

Consumer file: `docs/context/qa-profile.md` — Markdown + one fenced `yaml` block. Profile = **only** place for project-specific QA values; skill reads keys, never hardcodes values. Validated at boot (Q0); invalid/missing required key → stop at Q0 with reason.

## Example (placeholders)

```yaml
qa_profile_version: 1
language: en                      # report + comment language
autonomy_level: L1                # L0 | L1 | L2 | L3 — new project starts L1

tracker:
  kind: gitlab-mcp                # only value
  mcp_server: <mcp-server-name>
  product_project: <group/product-project or id>
  qa_issues:
    mode: separate_project        # separate_project | same_project | none
    project: <group/qa-project or id>   # required when separate_project
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
  status_result:                  # applied to QA issue at Q9
    homologated: status_homologated
    homologation_rejected: status_homologation_rejected
  mr_edit: none                   # glab | none
  attachments: { max_per_comment: 10 }

environment:
  provider: script                # script | url | none
  script: scripts/qa-env.sh       # qa-env contract
  isolation: slot                 # only value: env dedicated to this run
  health_checks:
    - { kind: http, url: "{api}/health", expect: 200 }
    - { kind: login }

auth:
  strategy: ui-form               # ui-form | api-token | storage-state
  credentials_env: [QA_LOGIN_USER, QA_LOGIN_PASSWORD]   # env var NAMES only
  credentials_file: <gitignored-file>
  session_check: { kind: local_storage, keys: ["<access-token-key>"] }
  profile_under_test: <role>

execution:
  runner: playwright              # cypress | playwright | none — REQUIRED, no default
  e2e_root: tests-e2e             # in-repo dir or external E2E repo path
  e2e_authoring: auto             # auto | repo-local | ns-e2e-tests
  e2e_git:
    base_branch: <branch>
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
  teardown: discard_env           # discard_env (provider: script) | none (provider: url)

evidence:
  dir: docs/qa/{issue}-{run_id}
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

## Fields

`R` = required. Default `—` = none; profile must set it.

### Root

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `qa_profile_version` | R | int | — | `1` |
| `language` | R | BCP 47 tag | — | Report + tracker comments. Skill prose stays English |
| `autonomy_level` | R | `L0`\|`L1`\|`L2`\|`L3` | — | New project: `L1`. See **Autonomy** |

### `tracker` (GitLab only)

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `kind` | R | `gitlab-mcp` | — | No other tracker |
| `mcp_server` | R | string | — | GitLab MCP server name |
| `product_project` | R | path \| id | — | Dev issues project |
| `qa_issues.mode` | R | `separate_project`\|`same_project`\|`none` | — | Where homologation issues live |
| `qa_issues.project` | when `separate_project` | path \| id | — | QA issues project |
| `qa_issues.signal.title_prefix` | — | string[] | `[]` | Recognize QA issue by title |
| `qa_issues.signal.labels` | — | string[] | `[]` | Recognize QA issue by label |
| `qa_issues.link_relation` | — | string | `Related to` | Dev ↔ QA issue link |
| `ignore_authors` | — | string[] | `[]` | Comments skipped at intake |
| `status_source` | R | path | `docs/context/gitlab-sync-config.md` | **Single source** of status label names |
| `status_sync.dev_from` / `dev_running` | R* | config key | — | Dev issue: `dev_from` → `dev_running` at Q1 |
| `status_sync.qa_from` / `qa_running` | R* | config key | — | QA issue: `qa_from` → `qa_running` at Q1 |
| `status_result.homologated` / `homologation_rejected` | R* | config key | — | QA issue status at Q9. With reservations / Blocked → no change (stays `qa_running`) |
| `mr_edit` | — | `glab`\|`none` | `none` | Optional MR edit via `glab`; no new MCP tool |
| `attachments.max_per_comment` | — | int ≥1 | `10` | `upload_url` used exactly as MCP returns |

`R*` = value MUST be a key in `status_source`. Status applied via `set_issue_status` only.

**Q1 status guard** (`status_sync`):

| Issue | Current status | Action |
| ----- | -------------- | ------ |
| Dev | `dev_from` | Set `dev_running` |
| Dev | `dev_running` | No-op |
| QA | `qa_from` | Set `qa_running` |
| QA | `qa_running` | No-op |
| Any applicable side | any other | Change nothing on either issue; log reason; stop at Q1 |

Run proceeds past Q1 only when every **applicable** side is in its `*_running` status. Check all applicable sides before writing any.

| Case | Applicable sides |
| ---- | ---------------- |
| Default | Dev + QA |
| `tracker.qa_issues.mode: none` | Dev only — QA rows do not apply |
| Side's `*_from` or `*_running` key absent from `status_source` | That side's precondition skipped + logged (not a stop); other side still applies |

**Absent key** (any `R*`): key missing from `status_source` → that status step skipped + logged; never guessed; never a label string in profile.

### `environment`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `provider` | R | `script`\|`url`\|`none` | — | `script` = run-owned env via qa-env. `url` = env provisioned outside agent, dedicated to this run (e.g. preview/review env); seeding allowed; **not** run-owned → Q10 never touches it; leftover data → ledger `residual_state`. `none` → no execution (L0 behavior) |
| `script` | when `script` | path | — | **qa-env contract** below |
| `url` | when `url` | URL | — | Dedicated run env (see `provider`) |
| `isolation` | R | `slot` | — | Only value: env dedicated to this run (`provider: script` run-owned, or `provider: url` external). Shared env forbidden — test data only in dedicated env (`data.location`) |
| `health_checks[]` | R | `{kind: http, url, expect}` \| `{kind: login}` | — | All pass → env healthy |

**qa-env contract** — consumer script, subcommands:

| Subcommand | Effect |
| ---------- | ------ |
| `up` | Create run env; print created resources for `run.json` |
| `health` | Exit 0 only when healthy |
| `seed` | Create run data (`data.seed`) |
| `reset` | Restore env to post-seed state |
| `down --run <run_id>` | Remove exactly resources in that run's `run.json` |
| `info` | Print URLs + deployed commit (JSON) |

### `auth`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `strategy` | R | `ui-form`\|`api-token`\|`storage-state` | — | |
| `credentials_env` | R | string[] | — | Env var **names** only. **FORBIDDEN:** values in profile |
| `credentials_file` | — | path | — | Gitignored single source; never printed |
| `session_check` | — | `{kind, keys[]}` | — | Reuse session when keys present |
| `profile_under_test` | — | string | — | Role/profile used in tests |

### `execution`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `runner` | R | `cypress`\|`playwright`\|`none` | — | No harness default. `none` → critical AC max verdict = `policy.runner_none_critical_cap` |
| `e2e_root` | when runner ≠ `none` | path | — | In-repo dir or external E2E repo (own `AGENTS.md`) |
| `e2e_authoring` | — | `auto`\|`repo-local`\|`ns-e2e-tests` | `auto` | `auto`: E2E repo's own skills when present, else `ns-e2e-tests` |
| `e2e_git.base_branch` / `branch_pattern` / `commit_prefix` | when L3 | string | — | Target E2E repo convention |
| `e2e_git.commit_language` | when L3 | BCP 47 tag | — | Target E2E repo convention |
| `browser_tool_preference` | — | string[] | `[]` | Capability order for exploratory lane |
| `stability_runs` | — | int ≥1 | `2` | Green runs required before automation MR |
| `runner_retries_during_verification` | R | `0` | `0` | Runner retries off; stability via explicit runs |
| `budget.max_scenarios` | — | `unlimited` \| int | `unlimited` | Full plan by risk order |
| `budget.checkpoint_min` | — | int | `60` | Recurring check-in, not work limit |
| `budget.on_checkpoint` | — | `ask` | `ask` | Finish in-flight cycle → pause → ask; wait indefinitely |
| `budget.on_stall` | — | `ask` | `ask` | Unforeseen no-progress → stop + ask, any time |

### `data`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `location` | R | `disposable_env` | — | Env dedicated to this run (`provider: script` slot or `provider: url`). Never seed shared env |
| `run_prefix` | R | string | — | Run data id = prefix + `run_id` |
| `seed.kind` / `seed.ref` | R | `api`\|`script`\|`none` / string | — | Create preconditions before tests |
| `mock.allowed` | — | bool | `true` | Hard-to-create data only |
| `mock.order` | — | list | `[product_api, db_fixture, response_intercept]` | Most real → most artificial; scenario records `data_source` |
| `teardown` | R | `discard_env`\|`none` | — | `provider: script` (run-owned slot) → `discard_env` required; Q10 discard removes data. `provider: url` → `none`: nothing discarded; leftovers → ledger `residual_state` |

### `evidence`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `dir` | R | path template (`{issue}`, `{run_id}`) | `docs/qa/{issue}-{run_id}` | Gitignored; never versioned |
| `capture` | — | subset of `screenshot`, `console`, `network`, `runner_video` | all | |
| `pii_masking` | R | `dom` | `dom` | Hide fields in DOM before capture; no OCR. Mask fail → image not published |
| `pii_fields` | — | CSS selector[] | `[]` | |
| `keep_on_upload_failure` | — | bool | `true` | Unuploaded captures kept for human |

### `cleanup` (Q10)

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `on_full_success` | — | subset of `containers`, `volumes`, `images`, `worktrees`, `evidence` | all | Only after every phase gate passed (any verdict) |
| `keep_local_report_at_L1` | — | bool | `true` | L1 keeps `report.md` + `qa-ledger.json` |
| `scope` | R | `run_owned_only` | — | Only resources in `run.json` |
| `on_failure` | R | `keep` | — | Incomplete run keeps everything |
| `log` | R | path | `docs/qa/cleanup.log` | One line per run; never deleted |

### `verdict` (Q7 — deterministic rubric)

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `criticality_weights` | — | `{critical, high, medium, low}` | `4, 3, 2, 1` | Confidence = Σ(weight × covered with evidence) / Σ(weight) |
| `blocked_scenario_ratio` | — | number 0–1 | `0.2` | Verdict Blocked when any critical AC `blocked` **or** blocked scenarios > ratio |
| `flaky_on_critical_cap` | — | `with_reservations` | `with_reservations` | Flaky scenario on critical AC → max With reservations |
| `derived_critical_cap` | — | `with_reservations` | `with_reservations` | Critical AC with `source: derived` → max With reservations |

Verdicts: Homologated \| With reservations \| Not homologated \| Blocked. Ledger `mr: null` or env commit not verifiable against `mr.commit` → Blocked.

### `judge` (Q7b — quality of homologation itself)

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `weights` | — | `{coverage, depth, impact, evidence, data_realism, stability}` | `3, 2, 1.5, 1.5, 1, 1` | Sum 10 |
| `min_score` | — | number 0–10 | `8.5` | Below → complement cycle |
| `on_below_min` | — | `complete` | `complete` | Plan/run only missing items; still below at cycle end → no publish, ask human |

Distinct gate from `ns-judge` (acceptance, not delivery proof).

### `policy`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `verdict_publish` | — | `final` | `final` | No provisional verdict |
| `publish_comment` | — | `on_approval` | `on_approval` | Full preview to human; publish only on explicit approval |
| `set_status_labels` | — | `auto` | `auto` | Q9 result status (L2+) |
| `open_e2e_mr` | — | `auto` | `auto` | L3 only; own branch, never merge |
| `e2e_reviewer` | — | skill or project agent | `ns-reviewer` | Reviews generated E2E specs |
| `runner_none_critical_cap` | — | `with_reservations` | `with_reservations` | Verdict cap without runner |
| `close_issues` | R | `never` | `never` | Fixed |
| `log_spent_time` | R | `never` | `never` | Fixed |

## Autonomy

| Level | Execute | Publish comment | Status labels | E2E commit/MR |
| ----- | ------- | --------------- | ------------- | ------------- |
| `L0` plan | no | no | no | no |
| `L1` execute | yes | no (local report) | Q1 sync only | no |
| `L2` publish | yes | yes, on approval | yes | no |
| `L3` autonomous | yes | yes, on approval | yes | yes (own branch, never merge) |

Invariants, every level: never close issue; never log time; never merge; never push protected branch; never change product code; never print credentials; never remove resource not in this run's `run.json`.

Docker/E2E/GitLab authorization: `skills/ns-harness/references/acceptance-tier.md`.
