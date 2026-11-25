# QA profile schema — data, evidence, cleanup, verdict, judge, policy, autonomy

Continuation of `profile-schema.md` (legend, YAML subset, gate extras there). `R` = required. Default `—` = none; profile must set it.

### `data`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `location` | R | `disposable_env` | — | Env dedicated to this run (`provider: script` slot or `provider: url`). Never seed shared env |
| `run_prefix` | R | string | — | Run data id = prefix + `run_id` |
| `seed.kind` / `seed.ref` | R | `api`\|`script`\|`none` / string | — | Preconditions before tests. `script` → `qa-env seed` (provider `script` only). `api` → agent calls product API `ref`. Cycle: `environment.md` |
| `mock.allowed` | — | bool | `true` | Hard-to-create data only |
| `mock.order` | — | list | `[product_api, db_fixture, response_intercept]` | Most real → most artificial; scenario records `data_source` |
| `teardown` | R | `discard_env`\|`none` | — | `provider: script` (run-owned slot) → `discard_env` required; Q10 discard removes data. `provider: url` → `none`: nothing discarded; leftovers → ledger `residual_state` |

### `evidence`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `dir` | R | path template, MUST contain `{run_id}` | `docs/qa/{run_id}` | Gitignored; never versioned. `run_id` starts with dev iid. Run dir = `run.json` `evidence_dir` |
| `capture` | — | subset of `screenshot`, `console`, `network`, `runner_video` | all | Kinds `qa_evidence.py add` accepts |
| `pii_masking` | R | `dom` | `dom` | Hide fields in DOM before capture; no OCR. Mask fail → image not published |
| `pii_fields` | — | CSS selector[] | `[]` | Each masked before screenshot (`--pii-masked`); any unmasked → `pii_scrubbed: false` |
| `keep_on_upload_failure` | — | bool | `true` | Unuploaded captures kept for human |

### `cleanup` (Q10)

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `on_full_success` | — | subset of `containers`, `volumes`, `images`, `worktrees`, `evidence` | all | Only after every phase gate passed (any verdict). Matrix: `cleanup.md` |
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

Docker/E2E/GitLab authorization: `../../ns-harness/references/acceptance-tier.md`.
