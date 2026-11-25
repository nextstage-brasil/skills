# Q5 Environment + data

Env dedicated to run, healthy, at MR commit, seeded. Output `<run_dir>/env.json`. Runs at effective level ≥ L1 only (L0: skip; report §2 "not provisioned at this level"). Script contract: `qa-env-contract.md`.

## Provider

| `environment.provider` | Env source | Run-owned | `up` / `down` | Seed | Commit from |
| ---------------------- | ---------- | --------- | ------------- | ---- | ----------- |
| `script` | `qa-env` creates it | yes (registered resources) | yes | `qa-env seed` or product API | `qa-env info` |
| `url` | Provisioned outside agent, dedicated to this run | **never** — Q10 never touches it | no | product API only | `environment.version_url` |
| `none` | — | — | — | — | — (no execution; L0 behavior) |

Isolation `slot` only: env dedicated to this run. Shared env → MUST NOT seed or execute; stop.

## Steps (`provider: script`)

1. `up --run <run_id> --ref <MR head commit>`. `mr: none` → ref = dev issue source branch when known, else skip `up`; verdict Blocked later.
2. Validate output (`--check-env`); register `created_resources` in `run.json` **before** next call; `--check-run`.
3. `health` → script checks.
4. Profile `health_checks`, in order: `http` → resolve `{name}` from qa-env `urls`, GET, status = `expect`; `login` → one authentication via `auth.strategy` (credentials from `auth.credentials_env` / `credentials_file`, never printed); reuse session per `auth.session_check`. Unknown `{name}` → stall.
5. `info` → `commit`. Compare with MR head commit (prefix match either way).
6. Seed (`data.seed.kind`): `script` → `seed --prefix <data.run_prefix>`; `api` → agent calls product API `ref` with run-prefixed data; `none` → skip.
7. Write `env.json`; `run.json.phase = Q5`.

`provider: url`: skip 1–2 + `qa-env` calls; health = steps 3–4 against `environment.url`; commit = GET `version_url` (bare SHA or JSON `commit`); seed `api` only.

## Gate

| Condition | Result |
| --------- | ------ |
| Script + profile checks all pass | healthy |
| Env commit = MR commit | verified |
| Commit mismatch / unreadable / `mr: none` | Gate fails, no retry (redeploy is not the agent's call). Stop execution; `env.json` + ledger `environment` record observed commit → `--check-ledger` `blocked_reasons` → verdict Blocked; Q10 outcome `blocked` |
| Health still failing after ENV retries | Whole run Blocked (see **Failures**) |

## `env.json`

| Key | Content |
| --- | ------- |
| `provider` | `script` \| `url` |
| `urls[]` | `{name, url}` from `up`/`info` (url: `[{name: app, url}]`) |
| `commit`, `mr_commit`, `commit_verified` | Observed, expected, bool |
| `health` | `ok` \| `failed` + `checks[]` (script + profile) |
| `data[]` | `{entity, ref, data_source}` seeded |
| `attempts` | `{env_reset, reseed}` counters |

Feeds ledger `environment {commit, url, health}`.

## Data cycle: prepare → test → discard

- **Prepare** in dedicated env only. Data id = `data.run_prefix` + `run_id`. Never reuse another run's data.
- **Ladder** (`data.mock.order`, most real first). Use next rung only when previous cannot create the precondition; `mock.allowed: false` → first rung only.

| Rung | How | Ledger `data_source` |
| ---- | --- | -------------------- |
| `product_api` | Product API / product command (`qa-env seed` reports `real`) | `real` |
| `db_fixture` | Direct write to **run-owned** DB (`provider: script` only) | `db_fixture` |
| `response_intercept` | Runner/browser stubs response at Q6; last resort | `response_intercept` |

- Every scenario declares `data_source` in ledger. Non-`real` counted normally; report lists them apart.
- **Test** (Q6, Phase 3) uses only prepared data.
- **Discard**: `provider: script` → Q10 removes env (`data.teardown: discard_env`). `provider: url` → `teardown: none`: nothing deleted.

## `residual_state`

Ledger key always present (`[]` = nothing left). One `{entity, ref, reason}` per entity left outside run-owned resources: every seeded/created entity under `provider: url`; any write outside the run env (forbidden — also stall). Data inside a kept run-owned env → not residual (removed with env).

## Failures

| Class | Signal | Action | Cap | Exhausted |
| ----- | ------ | ------ | --- | --------- |
| ENV | `up`/`reset` exit 1, `health` not ok, profile health check fail, timeout, systemic 5xx | `reset` (or re-run `up` when env never came up) → steps 3–5 | 2 per run | Stop run; verdict **Blocked**; keep all (Q10 outcome `blocked`) |
| DATA | Precondition missing, prefix conflict, `seed` exit 1 | Reseed (`seed` / API) → re-run scenario | 2 per scenario | Scenario `blocked`; others continue |
| Contract break | `--check-env` exit 2/3, exit/`ok` mismatch, exit 2 refusal, non-run-owned id, unexpected answer | **Stall** (SKILL.md): stop + ask — phase, what was tried, what is needed | — | — |

Before triaging any failure as PRODUCT: health (steps 3–4) passes again. Counters in `env.json.attempts`; caps independent of checkpoint.
