# Q6 Execution lanes

Run `plan.yml` scenarios against Q5 env, in plan order (risk order). Output `<run_dir>/qa-ledger.json` (`../templates/qa-ledger.schema.json`), `results/` (JUnit), `evidence/` (captures). Runs at effective ≥ L1 only. Failures: `failure-triage.md`. Browser tools: `browser-tools.md`.

## Lanes (ADR-06)

| Lane | Scenarios (Q4 assigns) | Evidence | Pass needs |
| ---- | ---------------------- | -------- | ---------- |
| `runner` | positive, negative, business_rule, regression with deterministic assertion | JUnit (`results/`), screenshot, `runner_video` | ≥1 `junit` |
| `browser` | usability, visual, responsive, exploratory; all when `runner: none` | screenshot, console, network | ≥1 screenshot; tool with `navigate` + `screenshot` |

Runner first: anything assertable becomes executable spec. Browser lane = complement, never substitute for a runner scenario.

## Ledger skeleton (Q6 start)

Write before first run:

| Key | From |
| --- | ---- |
| `run_id`, `issue`, `mr` | `run.json`, `intake.md` (`mr: null` when none) |
| `environment {commit, url, health, resets}` | `env.json` (`resets` = ENV resets so far, run-wide) |
| `criteria[]` | `acceptance.yml` (`id`, `text`, `source`, `criticality`) |
| `scenarios[]` | `plan.yml`, same order: `status: not_run`, `not_run_reason: "pending execution"`, `attempts: 0`, `triage: null`, `data_source` (Q5), `evidence: []`, `history: []`; browser lane + `tool` (`browser-tools.md`) |
| `findings`, `judge_rounds` | `[]` (`adherence` added at Q7b) |
| `residual_state` | `environment.md` → `residual_state` |

Every planned scenario stays in ledger. Never delete one to go green.

## Runner lane

1. **Spec source** (D34), profile `execution.e2e_authoring`:

| Value | Author with |
| ----- | ----------- |
| `auto` | E2E repo own skills (routed by its `AGENTS.md`) when present; else `ns-e2e-tests` |
| `repo-local` | E2E repo own skills; none found → stall |
| `ns-e2e-tests` | `ns-e2e-tests` (Cypress only). `runner: playwright` + no repo-local skills → stall |

2. **Reuse first:** plan `existing` hit → run that spec. New/adjusted spec only when no hit covers scenario.
3. **Where:** run-owned worktree of E2E repo: `git -C <e2e_root> worktree add .worktrees/qa-<run_id>-e2e` (register `kind: worktree`, `via: agent`, `repo_root: <e2e_root>`, `id` relative to it, in `run.json` before writing; `--check-run`). Never write specs in human checkout. No commit/push below L3 (Q8). Removed by Q10 only on full success (`cleanup.md`).
4. **Tags** in `it`/`test` title: `@S-n` + one `@AC-n` per covered AC; coexist with `@smoke` / `@regression`. Exact tokens; mapping rules: `junit_to_ledger.py` docstring.
5. **Run** one explicit run per invocation, runner retries forced 0 on CLI (profile `runner_retries_during_verification: 0`): Cypress `--config retries=0`, Playwright `--retries=0`. JUnit → `<run_dir>/results/run-<n>.xml` (one file per spec when reporter splits); raw screenshots/videos → `<run_dir>/raw/`.
6. **Merge** each JUnit file once: `python3 scripts/junit_to_ledger.py --ledger <run_dir>/qa-ledger.json --junit results/run-<n>.xml [--change S-<n>=<env_reset|reseed|spec_fix>]...`. Appends one history run per mapped scenario (`health: unknown`, `source`), junit evidence + sha256, applies terminal triage (non-terminal → `not_run` "triage in progress"). Scenario already closed `fail`/`flaky`/`blocked` (shared spec re-run) → no run, listed `ignored_terminal` with `outcome`. Closed scenario now passing → `contradicts: true`, report `stall: true` → **stall** (D49, `failure-triage.md`): human decides; never ignored. One JUnit file = one run per scenario. Suite nesting > 256 `<testsuite>` levels refused. `unmapped` / `skipped` → fix tags or spec, re-run (new file).
7. **Captures:** `qa_evidence.py add` per scenario (see **Evidence**).
8. Failed run → `failure-triage.md` (record `health`, `signals`, `suggested_class` on that run, then `qa_triage.py`).

## Browser lane

1. Tool + capability probe: `browser-tools.md`. No tool → scenario `blocked`, `tool: {name: none, missing: [...]}`, `triage: ENV`, `blocked_reason`; runner lane continues.
2. Per run: navigate → act → assert on a11y snapshot → mask PII → screenshot → console + network (when capable).
3. Append history run by hand: `{outcome, change, health, signals, suggested_class}` (no `source`), `attempts` = history length. Then triage.
4. Console JS errors / unexpected 4xx-5xx (P7) → candidate finding (`class` per project, `reproduced` ≥1); never silently ignored.

## Evidence (ADR-19)

| Step | Command |
| ---- | ------- |
| Capture | Tool writes raw file under `<run_dir>/raw/` (never directly into `evidence/`) |
| Normalize + hash + ledger | `python3 scripts/qa_evidence.py add --run-dir <run_dir> --profile docs/context/qa-profile.md --scenario S-<n> --kind <screenshot\|console\|network\|runner_video> --file <raw> --label "<what it shows>" [--pii-masked <selector>]... --ledger <run_dir>/qa-ledger.json` |
| Verify + index | `python3 scripts/qa_evidence.py index --run-dir <run_dir> --ledger <run_dir>/qa-ledger.json` → `evidence/index.md` |

- Name `evidence/S-<n>-<seq>-<slug>.<ext>`; JUnit `results/<name>.xml`. Gate rejects other layouts.
- **PII (D4):** before each screenshot hide every profile `evidence.pii_fields` selector in DOM (script channel of tool); pass each masked (or absent) selector as `--pii-masked`. No OCR. Selector not masked → `pii_scrubbed: false` → never published (`publication.md`); kept locally for human.
- Kind outside `evidence.capture` → refused. Symlinks, unsafe labels, content not matching extension → refused (exit 2).

## Data

Only Q5-prepared run data (`environment.md` → data cycle). `data_source` per scenario: `real` | `db_fixture` | `response_intercept` (runner stub, last rung). Reseed = DATA retry (`failure-triage.md`).

## Gate

| Check | Pass |
| ----- | ---- |
| Every scenario terminal | `pass` / `fail` / `flaky` / `blocked` (+`blocked_reason`) / `not_run` (+`not_run_reason`); replay of `history` matches (`qa_triage.py`) |
| Evidence | `qa_evidence.py index` exit 0 |
| Ledger | `python3 scripts/qa_gate.py --check-ledger <run_dir>/qa-ledger.json` exit 0 (`blocked: true` allowed → Blocked reasons). Also: each runner run re-read from its own `source` JUnit (same outcome; a file backs one run); `<run_dir>/plan.yml` ids, lane, type, covers = ledger — plan required once `run.json` shows Q4 passed (`plan_checked`) |

Then `run.json`: Q6 `passed`, `phase: Q6`. Exit 2 → fix ledger per `errors` (never edit results to fit); same error twice unchanged → stall.

## Resume

Re-read `run.json`, then ledger. Next scenario = first `not_run` "pending execution", or first whose `qa_triage.py` action is non-terminal. Never re-merge a JUnit file (refused).
