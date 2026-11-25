# Failure triage, checkpoint, stall

Every failed run classified **before** any retry (ADR-11). Objective signals first; agent judgment only for residue, recorded on the run. Engine: `scripts/qa_triage_rules.py`; decision: `python3 scripts/qa_triage.py --ledger <run_dir>/qa-ledger.json --scenario S-<n>` (writes nothing; exit 0 decision, 2 history breaks protocol → fix history or stall, 3 bad input). `--check-ledger` replays every history: recorded `status`/`triage` must match.

## Run record (ledger `history[]`)

| Field | Values | Who |
| ----- | ------ | --- |
| `outcome` | `pass` \| `fail` | runner (`junit_to_ledger.py`) / agent (browser) |
| `source` | `results/<name>.xml` — **required** on runner lane (gate re-reads it: its outcome for the scenario must equal `outcome`); absent on browser lane | `junit_to_ledger.py` |
| `change` | `none` \| `env_reset` \| `reseed` \| `spec_fix` — what changed before this run | must equal previous action's change |
| `health` | `ok` \| `failed` \| `unknown` — re-check after failed run (`environment.md` steps 3–4) | agent |
| `signals` | `infra_timeout`, `systemic_5xx` (ENV) · `precondition_missing`, `data_conflict`, `seed_failed` (DATA) · `spec_error` (TEST: spec code/syntax/runner config) | agent, from observed facts only |
| `suggested_class` | `TEST` \| `PRODUCT` \| `null` — only when no signal explains failure | agent |

Pass carries no signals, no `suggested_class`.

## Decision order

Rows 1–3, 5–7: failed run. Row 4: any run.

| # | Condition | Class | Action | Cap | Exhausted |
| - | --------- | ----- | ------ | --- | --------- |
| 1 | `health: unknown` | — | `recheck_health` (set `health` on same run; no new run) | — | — |
| 2 | `health: failed` or ENV signal | ENV | `env_reset`: `qa-env reset` (or `up`), health, re-run; `environment.resets` +1 | 2 per **run** (Q5 + Q6) | `stop_run`: run stops, verdict Blocked |
| 3 | DATA signal | DATA | `reseed` (run prefix), re-run | 2 per scenario | scenario `blocked` |
| 4 | Pass + fail since last change | FLAKY | `rerun_stability` unchanged | 3 unchanged runs | scenario `flaky` — never pass |
| 5 | `spec_error` signal, or `suggested_class: TEST` | TEST | `fix_spec` (spec only), re-run | 3 fixes per scenario | scenario `blocked` |
| 6 | `suggested_class: PRODUCT` (health ok) | PRODUCT | `reproduce` unchanged | — | 2 healthy reproductions → `fail` + finding (`reproduced` ≤ replayed count) |
| 7 | none of above | — | `stall` | — | — |

Pass after recovery → `pass`, triage = last failure class. Unchanged re-run after a pass allowed (spec file re-run for another scenario): passes stay `pass`; a fail makes window FLAKY. Change (reset/reseed/fix) starts new window: earlier outcomes no longer count for FLAKY / PRODUCT. Precedence ENV > DATA > FLAKY > TEST/PRODUCT. Caps independent; no global sum; checkpoint does not reset them.

## Rules

- **TEST:** fix spec only. **Never** change product code, weaken/delete an assertion, skip/`.only`, `force`, `cy.wait(<ms>)`, raise timeouts to mask, or ignore `uncaught:exception` to go green.
- **PRODUCT:** health re-run ok on each reproducing run; finding `{severity, class, reproduced}` linked to scenario; no further retry.
- **ENV exhausted:** stop executing; remaining scenarios `blocked` (`triage: ENV`, `blocked_reason`, empty history); ledger `blocked_reasons` names it; keep everything. Env never healthy at Q5 → same: skeleton ledger (`health: failed`), every scenario blocked.
- **Interrupted** (stop at checkpoint/stall mid-retry): scenario `blocked` + `blocked_reason`; triage = replay class. Never `pass`.
- Run-level counters: `environment.resets` (ledger) = `env.json` `attempts.env_reset`.

## Checkpoint (D48)

Window = `execution.budget.checkpoint_min` from Q0 pass, then from each "continue".

| Moment | Do |
| ------ | -- |
| Near limit | Start no long step (new scenario run, spec authoring, reseed cycle) |
| At limit | Finish in-flight cycle (run + merge + triage record); start nothing |
| Pause | `run.json`: `checkpoints[]` `{window, at, decision: pending}` + `pauses[]` `{reason: checkpoint, phase, note: progress summary}`; ask; wait indefinitely; delete nothing |
| "continue" | Pause `answer: continue`, checkpoint `decision: continue`; next window |
| "stop" | `answer: stop`, `decision: stop`; unrun scenarios `not_run` ("stopped at checkpoint"); in-flight → interrupted; current phase `failed` (note); report; Q10 outcome `incomplete` (keep all) |

`--check-run`: k-th checkpoint ↔ k-th checkpoint pause (pending = open; decision = answer); answers per reason: checkpoint/stall/below_min_score `continue|stop`, preview_approval `approve|adjust|do_not_publish`. Cleanup planner rejects `success` after any `stop` / `do_not_publish`.

## Stall (D49) — any time

Stop + ask when:

- Failure fits no class (triage action `stall`).
- Same phase/scenario repeats without change outside caps; same gate error twice unchanged.
- Tool, MCP, `qa-env` or env answers unexpectedly (incoherent, unknown format, contract break).
- Ambiguity issue/MR/profile/specs cannot resolve.
- Next step outside profile permissions or invariants.

Record `pauses[]` `{reason: stall, phase, note: "<phase> · tried: … · need: …"}`. Answer `continue` → apply human guidance (e.g. set `signals`/`suggested_class` on stalled run, then `qa_triage.py`); `stop` → as checkpoint stop. Foreseen failures follow caps without asking.
