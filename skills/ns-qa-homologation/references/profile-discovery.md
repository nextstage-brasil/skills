# Profile discovery

Infer `docs/context/qa-profile.md` from repo evidence. Runs at Q0 when profile absent, or on explicit request ("discover QA profile"). Presets have no hooks + `init` runs no LLM → no install-time discovery. No `ns-harness` prepare hook (not implemented).

## Mandate

1. Copy `../templates/qa-profile.template.md` → `docs/context/qa-profile.md`.
2. Fill each field from **Sources** below. Value not certain → write it + trailing `# inferred` (optional source after it: `# inferred from <file>`; any case). No evidence → keep `<placeholder>`.
3. `autonomy_level: L1` always (new project default). Discovery never writes L2/L3.
4. Run `python3 scripts/qa_gate.py --check-profile docs/context/qa-profile.md --repo .`.
5. Exit 3 from placeholders → list missing fields to human in one message; stop (stall rule). Other exit 3 → fix own output, re-run.
6. Exit 0 → continue run. `inferred` non-empty → effective level ≤ L1 until human deletes markers.

## Sources (read-only)

| Evidence | Fields | Notes |
| -------- | ------ | ----- |
| `cypress.config.*` | `execution.runner: cypress`, `e2e_root` (config dir), `baseUrl` → `{api}` hint, `env` key **names** | Never read `cypress.env.json` values |
| `playwright.config.*` | `runner: playwright`, `testDir` → `e2e_root`, `use.baseURL` | |
| Separate E2E repo (sibling / submodule with own `AGENTS.md` + runner config) | `e2e_root` = its path; `e2e_authoring: auto` | Its own skills win at Q8 |
| No runner config | `runner: none` `# inferred` | Critical AC verdict cap applies |
| `docker-compose*.yml`, `compose*.y*ml`, stack scripts | `environment.provider: script` candidate, health URL from `healthcheck` | Never run compose. `scripts/qa-env.sh` absent → keep `script` placeholder; human scaffolds it from `../templates/qa-env.template.sh` (`qa-env-contract.md`) |
| Deployed preview/review URL documented in repo | `provider: url`, `url`, `data.teardown: none` | |
| `.env*.example` / `.env.*.example` | `auth.credentials_env` = variable **names** matching user/password/token | **FORBIDDEN:** read `.env`, real secrets, any value |
| `.nextstage-harness/rules/project-rules.md` | `tracker.mcp_server` (GitLab MCP server row) | |
| `docs/context/gitlab-sync-config.md` | `tracker.product_project`, QA project, `status_*` keys present | Keys only — never label names into profile |
| `git remote get-url origin` | `product_project` path fallback | |
| Login screen / auth middleware in code | `auth.strategy`, `session_check.keys` | `# inferred` unless explicit |

## Fixed values (not inferred)

`qa_profile_version: 1`; `isolation: slot`; `runner_retries_during_verification: 0`; `data.location: disposable_env`; `evidence.dir: docs/qa/{run_id}`; `pii_masking: dom`; `cleanup.scope: run_owned_only`; `cleanup.on_failure: keep`; `policy.close_issues: never`; `policy.log_spent_time: never`. Rest: template defaults.

## Rules

- Evidence path per inferred field in chat summary (`field ← file:line`).
- `# inferred` caps autonomy at L1. Human confirms value → deletes marker → one review per project.
- Never invent tracker ids, status keys, or credentials. Unknown → placeholder.
- Profile = versioned file. Discovery writes it once; later runs read it, never overwrite. Profile exists + invalid → stop at Q0, report errors; no rediscovery.
