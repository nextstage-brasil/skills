# qa-env contract

Consumer script at profile `environment.script` (`provider: script`). Skill knows no Docker, slot, DB — only this contract. Scaffold: `../templates/qa-env.template.sh` (providers `fixed_url`, `compose`, `slot`; keep one). Q5 procedure: `environment.md`. Q10: `cleanup.md`.

## CLI

```
qa-env.sh up     --run <run_id> --ref <branch|commit>
qa-env.sh health --run <run_id>
qa-env.sh seed   --run <run_id> --prefix <data.run_prefix>
qa-env.sh reset  --run <run_id> --prefix <data.run_prefix>
qa-env.sh info   --run <run_id>
qa-env.sh down   --run <run_id> --manifest <run.json> [--resource <kind>:<id>]...
```

Stdout = exactly one JSON object. Diagnostics → stderr. Credentials never printed.

| Exit | Meaning | `ok` |
| ---- | ------- | ---- |
| 0 | Done | `true` |
| 1 | Operation failed (partial state reported) | `false` |
| 2 | Usage error (incl. valued flag without value) / refused; nothing changed | `false` (JSON optional) |

Exit/`ok` mismatch, exit 2, non-JSON stdout → contract break (see **Validation**).

## Output

Envelope (every command): `contract_version: 1`, `command`, `run_id`, `ok`, `error` (one line when `ok: false`, else `null`). Machine form: `../templates/qa-env-output.schema.json`.

| Command | Payload | Rule |
| ------- | ------- | ---- |
| `up` | `urls[] {name, url}`, `commit` (sha or `null`), `created_resources[] {kind, id}` | Builds/starts env at `--ref`. Resources listed also on failure |
| `health` | `checks[] {name, ok, detail}` | `ok` = ≥1 check and all `ok`. Infra readiness only; profile `health_checks` run after |
| `seed` | `data[] {entity, ref, data_source}` | Creates run data. `ref` embeds `--prefix` + `run_id`. `data_source`: `real` (product API/command) \| `db_fixture` (direct write to run DB) |
| `reset` | `data[]`, `created_resources[]` | Restore post-seed state (reseeds). New resources listed |
| `info` | `urls[]`, `commit` | `commit` required when `ok` |
| `down` | `removed[]`, `failed {kind, id, reason}` \| `null`, `skipped[]` | See **down** |

`kind` (qa-env): `container` \| `volume` \| `database` \| `image` \| `worktree`. `evidence_dir` = agent only. `urls[].name` = `[a-z][a-z0-9_]*`; health check `{name}` resolves against it.

## Run ownership

- Id charset `^[A-Za-z0-9.][A-Za-z0-9._/:@+-]*$`, no `..` — ids reach command arguments (`cleanup.md` → Registration).
- Every created id MUST embed `run_id`, boundary-aware (`cleanup.md` → Registration): namespace `qa-<run_id>` (compose project, slot name, image tag, `.worktrees/qa-<run_id>`, DB `qa_<run_id>`). Pool slots/shared stacks reused across runs = not run-owned: never listed, never removed; data left there → ledger `residual_state`.
- `created_resources` = every run-owned resource existing after the call (idempotent union). Agent appends only `kind:id` pairs not yet in `run.json`.
- Script MUST NOT touch anything it did not create for this run: base images, daily/shared stack, other runs.

## Idempotency

| Command | Re-run |
| ------- | ------ |
| `up` | Reuses existing run env; same resource list |
| `health`, `info` | Read-only |
| `seed` | Same refs; creates only missing entities |
| `reset` | Always returns to post-seed state |
| `down` | Already-removed resource → counted `removed` |

## down

1. Reads `--manifest`; manifest `run_id` ≠ `--run` or any unsafe/non-run-owned `qa-env` id → refuse before any removal (exit 2). Acts only on `via: qa-env` entries. `--resource` outside that set → refuse. No `--resource` → all `qa-env` entries (leftover mode).
2. Order: `container` → `volume`/`database` → `image` → `worktree`.
3. First failure → stop; `failed` = that resource; rest → `skipped`; exit 1.
4. Never `--force` a worktree removal; pending changes = failure.

## Timeouts

Agent enforces profile `environment.timeouts` per call (`up`, `seed`, `reset`; others `default`). Exceeded → kill, ENV failure (`environment.md`).

## Validation

Save stdout to `<run_dir>/env/<command>-<n>.json`, then:

`python3 scripts/qa_gate.py --check-env <file> --run-id <run_id>`

| Result | Action |
| ------ | ------ |
| exit 0 | Register `created_resources` in `run.json` (`via: qa-env`, `created_at`, `created_by_phase`) → `--check-run` |
| exit 2 / 3 | Contract break → **stall** (stop + ask). Never retry, never ENV class |

Checks: schema (id charset), keys allowed per command, `ok`/`error` pairing, health `ok` vs checks, `down` not `ok` with `failed`, unique resources, run-owned ids (`created_resources`, `removed`, `skipped`) + data refs.
