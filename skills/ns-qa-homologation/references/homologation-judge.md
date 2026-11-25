# Q7b Homologation judge

Score 0–10 of the **homologation itself** (ADR-25, D44–D47): can the verdict be trusted? Verdict judges product (Q7); this judges test work. Script dominates; only LLM part = scenario ↔ AC adherence, recorded in ledger before the script runs (D47, same session). Engine: `scripts/qa_judge_rules.py`; CLI `scripts/qa_judge.py`.

## 1. Adherence (agent)

Per executed scenario (`pass`/`fail`/`flaky`) × each AC in `covers`: do steps + evidence really show that AC's behavior? Append to ledger `adherence[]` `{scenario, ac, adherent, reason}` — reason always. Non-adherent = scenario leaves that AC (coverage, depth, impact) + appears in `missing_for_10`. `--check-ledger` rejects: duplicate pair, unknown scenario, AC not in `covers`, decision on non-executed scenario.

## 2. Score

`python3 scripts/qa_judge.py --run-dir <run_dir> --profile docs/context/qa-profile.md [--repo .]` → `<run_dir>/qa-judgment.json` (`../templates/qa-judgment.schema.json`). Needs `run.json` valid with `profile_sha256` = current profile (mid-run policy edit → exit 2), ledger passing `--check-ledger`, `plan.yml`, every adherence pair (missing → exit 2 per pair).

Score = Σ weight × ratio, rounded half up to 2 decimals. Weights `judge.weights` (default coverage 3 · depth 2 · impact 1.5 · evidence 1.5 · data_realism 1 · stability 1; sum 10). "Adherent" = executed + adherence true.

| Dimension | Ratio |
| --------- | ----- |
| `coverage` | Σ AC weight × (≥1 adherent scenario) / Σ AC weight (`verdict.criticality_weights`) |
| `depth` | Σ AC weight × (required types with an adherent scenario / required) / Σ weight. Required = `test-design.md` minimum (critical/high: positive + negative + business_rule; medium/low: positive). Waived type = missing |
| `impact` | `plan.yml` areas with ≥1 scenario adherent to one of its ACs / areas. No area (no diff) = 1 |
| `evidence` | Executed scenarios with every screenshot `pii_scrubbed` and (browser lane) tool lacking none of `console`/`network` that `evidence.capture` asks / executed |
| `data_realism` | Mean over executed: `real` 1 · `db_fixture` 0.5 · `response_intercept` 0 (D25: never caps verdict, costs here) |
| `stability` | Mean over executed: `flaky` 0 · passed after ≥1 `spec_fix` run 0.5 · else 1 |

No executed scenario → evidence / data_realism / stability = 0. Machine evidence + hashes already enforced by the ledger gate. Upload status is outside the judge: Q7b precedes Q9; a failed upload shows as Q9 reservation + `evidence_upload: partial`.

## 3. Missing for 10

`missing_for_10[]` `{dimension, ref, reason, actionable}` — every point lost.

| Actionable (a round can close it) | Not actionable |
| --------------------------------- | -------------- |
| AC / type / area with a `not_run` or non-adherent scenario, or no scenario of that type | Covering scenario(s) `blocked` (cap exhausted, no browser tool, interrupted) |
| Screenshot not PII-masked (re-capture) | Type waived in `plan.yml` |
| Mocked data without `mock_reason` | Mocked data with ledger scenario `mock_reason` (real data impossible) |
| | Flaky; spec fixes used; browser tool lacks a capture capability |
| | Any gap while ledger `blocked_reasons` non-empty (verdict Blocked) |

## 4. Completion loop (D45, D50)

`loop.state`, first match:

| State | When | Do |
| ----- | ---- | -- |
| `passed` | score ≥ `judge.min_score` (default 8.5) | Q7b `passed` |
| `ended_below_min` | no actionable gap, **or** last round raised no score | D50 pause (below), every level |
| `complement` | else | Round: Q4 plan **only** actionable gaps → Q5 (seed if needed) → Q6 → Q7 `--verdict` → adherence for new scenarios → `qa_judge.py --record-round [--added <gap item>]...` |

Rounds follow checkpoint + stall rules (`failure-triage.md`). `--record-round` appends ledger `judge_rounds` `{round, score_before, score_after, added[, resume]}` (`added` default = scenario ids new since last judgment). `qa-judgment.json` stores sha256 of `judge_rounds` + `adherence` + ledger fingerprint. Script refuses: `judge_rounds` differing from the previous judgment's (hand edit) or present without a previous judgment; with `--record-round`: no previous judgment, previous `passed`, nothing changed, nothing added, previous `ended_below_min` without human `continue` (then `resume: true`); without it: ledger or adherence changed since last judgment. Ledger gate: round numbers 1..n, `score_before` = previous `score_after`, round without gain is last unless next has `resume: true`.

**D50 pause (every level, `ended_below_min`):** publish nothing (no comment, no status). `run.json` pause `{reason: below_min_score, phase: Q7b}`; show score, rounds, remaining gaps; wait indefinitely; delete nothing (Q10 `paused`). Q7b passes only after an answer allowing it:

| Answer | Effect |
| ------ | ------ |
| `publish_anyway` | L2+ only (`--check-run` rejects at L1): Q7b `passed` (note); Q9 may build preview |
| `continue` | Human names fix → round with `resume: true` |
| `stop` | End without publishing; run incomplete (Q10 `incomplete`, keep all) |

L1 below min: `continue` or `stop` only → never full success; Q10 keeps all. Cleanup planner proves Q7b from `qa-judgment.json` beside `run.json` (same `run_id`, equal to recomputation with the pinned profile): `passed`, or `ended_below_min` + latest answer `publish_anyway`.

`qa_publish_plan.py` refuses any preview below `min_score` without latest `below_min_score` answer `publish_anyway`, and while `loop.state` = `complement`.

## 5. Report

Score, per-dimension points, rounds (before → after, added), `missing_for_10` split actionable / not, mocked scenarios → report §8 (+ published comment at L2+).
