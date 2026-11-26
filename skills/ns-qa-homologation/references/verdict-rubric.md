# Q7 Verdict rubric

Deterministic verdict of **product** behavior from ledger evidence (ADR-09). Own 4-level scale + confidence (D42): acceptance gate, distinct from `ns-judge` delivery proof; `ns-judge` "no second rubric" stays inside `ns-judge`. Verdict final (D1): no provisional state; human may revert on issue. L1 = informative (local report). Engine: `scripts/qa_verdict_rules.py`.

## Command

`python3 scripts/qa_gate.py --verdict <run_dir>/qa-ledger.json --profile docs/context/qa-profile.md [--repo .]`

Ledger first passes `--check-ledger` rules (incl. `plan.yml`); any error → exit 2 (`ledger rejected: …`), no file. `run.json` beside ledger → must be valid and pin the profile (`profile_sha256`), else exit 2. Exit 0 → `<run_dir>/verdict.json` (`../templates/qa-verdict.schema.json`) + same JSON on stdout. `--profile` missing → exit 3. Then `run.json`: Q7 `passed`.

## Criterion status

Worst status among covering scenarios: `fail` > `blocked` > `not_run` > `flaky` > `pass`. `pass` already carries machine evidence (ledger gate).

## Verdict — first matching row wins

| # | Verdict | Condition |
| - | ------- | --------- |
| 1 | `blocked` | Ledger `blocked_reasons`: `mr: null`, env commit ≠ `mr.commit` (unless `commit-ancestry.json` proves `mr.commit` is an ancestor of the env commit), env health not ok, ENV retries exhausted |
| 2 | `not_homologated` | Any critical AC `fail` **or** finding `blocker`/`high` with class `delivery_defect` |
| 3 | `blocked` | Any critical AC `blocked`/`not_run` **or** blocked scenarios / all scenarios > `verdict.blocked_scenario_ratio` |
| 4 | `with_reservations` | Any reservation or cap (below) |
| 5 | `homologated` | None of the above |

**Reservations:** non-critical AC not `pass` (incl. `flaky`); any finding not in row 2. **Caps** (max With reservations): critical AC `flaky` (`verdict.flaky_on_critical_cap`); critical AC `source: derived` (`verdict.derived_critical_cap`); `execution.runner: none` with any critical AC (`policy.runner_none_critical_cap`).

Mocked data (`data_source` ≠ `real`) never caps (D25): listed in `mocked` (+ `mock_reason`); report + comment show it apart.

## Confidence

`confidence` (%) = Σ(weight × credit) / Σ(weight) over every AC, rounded half up. Weight = `verdict.criticality_weights` (default critical 4 · high 3 · medium 2 · low 1). Credit:

| AC status | Credit |
| --------- | ------ |
| `pass` | 1 |
| `flaky` | 0.5 |
| other | 0 |

`source: derived` × 0.5. Example: 2 critical pass + 1 high pass + 1 medium not run → (4+4+3)/13 = 85%.

## `verdict.json`

| Key | Content |
| --- | ------- |
| `verdict`, `label_key` | Verdict + report i18n key (`verdict_<verdict>`) |
| `confidence` | Integer % |
| `reasons` | Rows that decided (or "no cap" for Homologated) |
| `caps` | Caps present (listed even when a stronger row decided) |
| `criteria[]` | `{id, criticality, source, status, credit, scenarios}` |
| `missing_for_100[]` | Everything below 100%, from ledger: `{ac, scenario, reason}` — `blocked_reasons`, derived AC with credit, each non-`pass` covering scenario (status, triage, reason), each finding |
| `mocked[]` | `{scenario, covers, data_source[, mock_reason]}` |
| `ledger_fingerprint` | sha256 of ledger minus Q7b records (`adherence`, `judge_rounds`) |

Re-run after any ledger change (complement round). Q9 recomputes and refuses a stale/edited `verdict.json`.
