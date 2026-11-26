# QA profile schema

Consumer file: `docs/context/qa-profile.md` — Markdown + one fenced `yaml` block. Profile = **only** place for project QA values; skill reads keys, never hardcodes values. Q0 validates via `scripts/qa_gate.py --check-profile` (machine form: `templates/qa-profile.schema.json`). Invalid value / missing required key / unknown key (typo guard) / unfilled `<placeholder>` → exit 3, stop at Q0 with reason.

Full example: `templates/qa-profile.template.md`. Section `execution`: `profile-schema-execution.md`. Sections `data`, `evidence`, `cleanup`, `verdict`, `judge`, `policy` + **Autonomy** table: `profile-schema-policy.md`.

## YAML subset

Stdlib parser (`scripts/qa_yaml_lite.py`); no PyYAML — same result on every host.

| Supported | Rejected (exit 3) |
| --------- | ----------------- |
| Block mappings/sequences, space indent | Tabs, `---` / `...` |
| Sequence items: scalar, one-line flow, block mapping | Block scalars `\|` `>`, anchors `&`, aliases `*`, tags `!` |
| One-line flow `[a, b]`, `{k: v}` (nestable) | Multi-line flow; plain value containing `: ` (quote it) |
| Quoted + plain scalars (null, bool, int, float, str) | Duplicate keys; more than one `yaml` fence |
| `#` comments; trailing comment starting with word `inferred` (any case) marks that key | |

## Gate extras (beyond schema)

| Rule | Result |
| ---- | ------ |
| Scalar `<...>` left in profile | error |
| `judge.weights` sum ≠ 10 | error |
| Status key absent from `status_source` (or file missing) | warning; step skipped at run time |
| `evidence.dir` outside `docs/qa/` | warning (may get versioned) |
| Any `# inferred` field | `autonomy_effective` ≤ L1 |
| `inferred` in comment, not first word | inferred (fail closed) + warning |
| Phase cap (`IMPLEMENTED_MAX_LEVEL` in `qa_profile_rules.py`) | `autonomy_effective` ≤ highest implemented level |
| `environment.provider: none` | `autonomy_effective` = L0 |
| `execution.e2e_git` names invalid (`profile-schema-execution.md`); L3 `e2e_root` not project-relative | error |
| Unknown `browser_tool_preference` id | warning; skipped |

Output JSON: `autonomy_declared`, `autonomy_effective`, `autonomy_caps` (reasons), `inferred`, `warnings`, `profile_sha256`.

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
| `status_sync.qa_from` / `qa_running` | R* (mode ≠ `none`) | config key | — | QA issue: `qa_from` → `qa_running` at Q1 |
| `status_result.homologated` / `homologation_rejected` | R* (mode ≠ `none`) | config key | — | QA issue status at Q9. With reservations / Blocked → no change (stays `qa_running`) |
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
| `provider` | R | `script`\|`url`\|`none` | — | `script` = run-owned env via qa-env. `url` = env provisioned outside agent, dedicated to run (preview/review env); seeding allowed; **not** run-owned → Q10 never touches it; leftovers → ledger `residual_state`. `none` → no execution (effective L0) |
| `script` | when `script` | path | — | qa-env script: `qa-env-contract.md`; scaffold `../templates/qa-env.template.sh` |
| `url` | when `url` | URL | — | Dedicated run env (see `provider`) |
| `version_url` | when `url` | URL | — | Returns deployed commit (bare SHA or JSON `commit`); compared with MR commit at Q5 |
| `isolation` | R | `slot` | — | Env dedicated to run (`script` run-owned, `url` external). Shared env forbidden; test data only there (`data.location`) |
| `health_checks[]` | when `script`/`url` | `{kind: http, url, expect}` \| `{kind: login}` | — | All pass → env healthy. `{name}` in `url` = qa-env `urls` entry |
| `timeouts.up` / `seed` / `reset` / `default` | — | int seconds ≥1 | `1800`, `600`, `600`, `120` | Per qa-env call; exceeded → ENV failure |

### `auth`

| Key | R | Type / values | Default | Rule |
| --- | - | ------------- | ------- | ---- |
| `strategy` | R | `ui-form`\|`api-token`\|`storage-state` | — | |
| `credentials_env` | R | string[] | — | Env var **names** only. **FORBIDDEN:** values in profile |
| `credentials_file` | — | path | — | Gitignored single source; never printed |
| `session_check` | — | `{kind, keys[]}` | — | Reuse session when keys present |
| `profile_under_test` | — | string | — | Role/profile used in tests |
