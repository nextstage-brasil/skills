---
name: ns-qa-homologation
description: "(NS) Acceptance homologation (QA) of a delivered GitLab issue: QA profile, intake, AC-n, MR impact, risk-ordered test plan, execution + evidence, local report. Explicit only: \"homologate <URL>\", \"homologar\", \"acceptance QA\", /ns-qa-homologation. Do NOT: implement or bare ISSUE_URL (ns-execution-gitlab-issue), delivery proof (ns-judge), write E2E specs (ns-e2e-tests), code review (ns-reviewer)."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "0.3.0"
depends:
  - ns-harness
  - ns-e2e-tests
  - ns-judge
  - ns-reviewer
---

# QA Homologation

Acceptance homologation of a **delivered** issue against the running system. Phases Q0–Q10, state on disk, project values only in QA profile. Evaluates product, not code: `ns-judge` proves diff vs ACs; this skill homologates behavior. Verdict scale (4 levels + confidence) belongs here only — `ns-judge` "no second rubric" rule stays inside `ns-judge`. Ledger consistency stays binary (`qa_gate.py` exit 0 or reject).

## Implementation status (v0.3.0)

| Delivered | Phases | Level |
| --------- | ------ | ----- |
| **Yes** (Phase 1) | Q0 boot, Q1 intake, Q2 criteria, Q3 impact, Q4 plan, Q7 report (local) | L0 |
| **Yes** (Phases 2–3) | Q1 status sync, Q5 environment + data, Q6 execution + evidence (lanes, triage, ledger), Q7 report without verdict | L1 |
| Specified, not run | Q10 cleanup (planner needs Q7 verdict gate → L1 keeps everything) | Phase 4 |
| No — Phase 4 | Q7 verdict, Q7b homologation score, Q9 approval + publication | L2 |
| No — Phase 5 | Q8 automation | L3 |
| No — Phase 6 | Routing row, `qa-agent` bridge, dev → QA handoff | — |

**Until phases land:** L2/L3 run as **L1**; `environment.provider: none` runs as **L0**. `qa_gate.py --check-profile` returns `autonomy_effective` + `autonomy_caps`; report §1 states declared vs effective + reasons. Never run a phase marked No.

## Routing

Explicit invocation only — no automatic URL routing. Reliable entry until Phase 6: **`/ns-qa-homologation <ISSUE_URL or IID>`** (generated `AGENTS.md` hard stop still sends GitLab URLs to `ns-execution-gitlab-issue`). Homologation keyword + URL ≠ bare `ISSUE_URL` — keyword wins. Bare `ISSUE_URL` → `ns-execution-gitlab-issue`. Triggers: `references/entry-triggers.md`.

| Need | Target |
| ---- | ------ |
| Implement / fix issue | `ns-execution-gitlab-issue` / `ns-coder` |
| Diff vs ACs after `Code Review: Approved` | `ns-judge` |
| Write / refactor E2E specs (Q6 runner lane, Q8) | E2E repo own skills; none → `ns-e2e-tests` (`references/execution-lanes.md`) |
| Review generated E2E specs (Q8) | profile `policy.e2e_reviewer` (default `ns-reviewer`) |
| GitLab tool contracts | `mcp-gitlab-usage` (MCP-provisioned; read before first MCP call) |

## Session boot

`../../ns-harness/references/session-boot.md` — cold start only. Never tool-Read `AGENTS.md`. Docker/E2E/tracker authorization scope: `../../ns-harness/references/acceptance-tier.md` (human invocation = "asked in this run"; scope = profile + effective level).

## Autonomy levels

| Level | Execute | Publish comment | Status | E2E commit/MR |
| ----- | ------- | --------------- | ------ | ------------- |
| L0 plan | no | no | no | no |
| L1 execute | yes | no (local report) | Q1 sync only | no |
| L2 publish | yes | yes, after human approval | yes | no |
| L3 autonomous | yes | yes, after human approval | yes | own branch, never merge |

Effective level = min(profile `autonomy_level`, L1 if any `# inferred` field, L0 if `environment.provider: none`, highest implemented level). New profile starts L1; raising = human edit.

## Invariants (every level)

Never: close issue · log time · merge · push protected branch · change product code · print credentials · remove a resource not registered in this run's `run.json` · publish comment or final status without human approval of the preview · weaken/skip an assertion or use `force` to go green.

## Run directory

`evidence.dir` from profile (default `docs/qa/{run_id}`, gitignored, never versioned). `run_id` = `<dev iid>-<UTC YYYYMMDDTHHMMZ>`.

| File | Phase | Content |
| ---- | ----- | ------- |
| `run.json` | Q0 | Manifest `templates/qa-run.schema.json`: `run_id`, issues, level (declared/effective/caps), `profile_sha256`, provider, `phase` (last gate passed), `phases[]`, `created_resources[]` (registered at creation), `checkpoints[]`, `pauses[]` |
| `intake.md` | Q1 | `references/intake.md` |
| `acceptance.yml` | Q2 | `references/acceptance-criteria.md` |
| `impact.md` | Q3 | `references/impact-mapping.md` |
| `plan.yml` | Q4 | `references/test-design.md` |
| `env.json`, `env/<command>-<n>.json` | Q5 | `references/environment.md`, `references/qa-env-contract.md` |
| `qa-ledger.json`, `results/*.xml`, `evidence/` (+ `index.md`), `raw/` | Q6 | `references/execution-lanes.md`, `references/failure-triage.md` |
| `report.md` | Q7 | `references/report.template.md` |
| `verdict.json`, `qa-judgment.json`, `preview.md`, `publish.json` | Q7–Q9 | Planned (Phase 4) |
| Profile `cleanup.log` (shared, append-only) | Q10 | One line per run: `references/cleanup.md` |

**Resume:** same dev issue + `run.json` with `phase` before done → continue at next phase; never redo a passed gate. L1 run done = Q7 entry `skipped` (verdict pending). Inside Q6: `references/execution-lanes.md` → Resume. Context compaction → re-read `run.json` first.

## Phases

| Phase | Output | Exit gate | Status |
| ----- | ------ | --------- | ------ |
| Q0 Boot | `run.json` | python3 present; profile valid (`--check-profile` exit 0); GitLab MCP reachable | Ready |
| Q1 Intake | `intake.md` | dev issue resolved; MR found or absence declared; status guard (≥L1: applied, every side `*_running`; L0: recorded) | Ready |
| Q2 Criteria | `acceptance.yml` | every AC `source: issue\|derived`; derived/ambiguous carry `assumption` | Ready |
| Q3 Impact | `impact.md` | every area linked to ≥1 scenario (checked at Q4) | Ready |
| Q4 Plan | `plan.yml` | `--check-plan` exit 0 (coverage, minimum types, risk order) | Ready |
| Q5 Environment | `env.json` | `qa-env health` + profile `health_checks` ok; deployed commit = MR commit | Ready (≥L1) |
| Q6 Execution | ledger + evidence | every scenario terminal; `qa_evidence.py index` + `--check-ledger` exit 0 | Ready (≥L1) |
| Q7 Verdict + report | `verdict.json`, `report.md` | L0/L1: report only, Q7 `skipped`; verdict gate Phase 4 | Report ready; verdict Phase 4 |
| Q7b Score | `qa-judgment.json` | score ≥ `judge.min_score`; else complement cycle | Phase 4 |
| Q8 Automation | E2E MR | ≥`stability_runs` green, review approved | Phase 5 |
| Q9 Approval + publish | `preview.md`, `publish.json` | human approved preview; idempotent publish | Phase 4 |
| Q10 Cleanup | `cleanup.log` line | plan from `qa_cleanup_plan.py`; registered resources only; stop on first failure | Specified; not run (Phase 4) |

### Q0 Boot

1. `command -v python3` and version ≥ 3.9. Missing/older → **stop** with reason. Deliberate divergence from `ns-judge` (which skips scripts when Python is absent): homologation output must rest on the deterministic gate, never on narrative.
2. Profile `docs/context/qa-profile.md` absent → `references/profile-discovery.md`, then continue.
3. `python3 scripts/qa_gate.py --check-profile docs/context/qa-profile.md --repo .` — exit 3 → stop, list `errors`; never rediscover an existing profile. Keep `warnings` for report.
4. Read `tracker.status_source` (single source of status names). GitLab MCP unavailable → stop (stall rule).
5. Create run dir + `run.json` (level from step 3); register run dir as `evidence_dir` (`via: agent`); `--check-run` exit 0.

### Q1–Q4

Follow each reference in order. One artifact per phase; update `run.json.phase` after each gate. L0: MCP **read** tools only. ≥L1: Q1 status sync via `set_issue_status` (`references/intake.md`); only tracker write before Phase 4.

### Q5 + Q6 (effective ≥ L1)

Q5: `references/environment.md` + `references/qa-env-contract.md`. Q6: `references/execution-lanes.md` (runner lane first, browser lane complement, ledger, evidence), `references/browser-tools.md`, `references/failure-triage.md` (classes, caps, checkpoint, stall). Every created resource → `run.json` at creation, then `--check-run`. ENV exhausted / commit mismatch → stop executing; ledger records it (Blocked).

### Q7 report (L0 / L1)

Fill `references/report.template.md` in profile `language`. §1 verdict = not computed (L1: pending Q7 verdict, Phase 4); §1 lists level downgrade + every cap reason. L0: §6/§8 not executed/scored. L1: §6 from ledger; §8 lists kept resources. `run.json`: Q7 `skipped` (note: verdict pending), `phase` stays Q6. Report local; no comment; no status change beyond Q1.

### Q10 (not run in v0.3.0)

`references/cleanup.md`. Planner requires Q7 `passed` for `success`; L1 run ends with Q7 `skipped` → `success` unprovable → Q10 not executed, **every** resource kept (fail-safe), no `cleanup.log` line. Report §8 names kept resources + leftover command (`cleanup.md` → Leftovers); removal only on human request.

## Gate script

`scripts/qa_gate.py` (stdlib; shared parser `qa_yaml_lite.py`, schemas in `templates/`). Prints JSON on stdout.

| Mode | Command | Exit |
| ---- | ------- | ---- |
| Profile | `--check-profile <profile.md> [--repo .]` | 0 valid; 3 invalid |
| Plan (L0) | `--check-plan <run_dir>` | 0 consistent; 2 rejected; 3 missing/unparseable |
| Ledger | `--check-ledger <qa-ledger.json> [--evidence-dir <dir>]` | 0 consistent (may report `blocked: true`); 2 rejected; 3 unreadable |
| Run manifest | `--check-run <run.json>` | 0 consistent (may report `paused: true`); 2 rejected; 3 unreadable |
| qa-env output | `--check-env <output.json> [--run-id <id>]` | 0 contract kept; 2/3 → stall |
| Cleanup plan | `scripts/qa_cleanup_plan.py --run <run.json> --outcome <o> [--profile <md>]` | 0 plan printed (`argv` per step; executes nothing); 2 run rejected / outcome unproven; 3 unreadable / invalid profile |
| JUnit merge | `scripts/junit_to_ledger.py --ledger <ledger> --junit results/<f>.xml [--change S-n=<c>]... [--dry-run]` | 0 merged; 2 refused (unsafe path/XML, nothing mapped, re-merge, triage break); 3 unreadable |
| Triage | `scripts/qa_triage.py --ledger <ledger> --scenario S-<n>` | 0 decision (writes nothing); 2 history breaks protocol; 3 bad input |
| Evidence | `scripts/qa_evidence.py add\|verify\|index ...` | 0 done; 2 refused (name, symlink, content, PII/capture rule, unreferenced, hash); 3 unreadable |

Exit **1 never used** (unlike `ns-judge`, where 1 = skip). Exit 2 → fix artifact per `errors`, re-run (`--check-env`: stall instead). `--verdict` + `qa_judge.py` = Phase 4 (not present). Ledger contract: `templates/qa-ledger.schema.json`; `mr: null`, commit mismatch, unhealthy env, ENV exhausted → `blocked_reasons`, not schema failure. `--check-ledger` also replays each scenario `history` (status/triage must match), re-reads each runner run's own JUnit `source` (same outcome; one run per file), matches `plan.yml` (ids, lane, type, covers; required after Q4 passed), lane evidence, evidence layout.

## Checkpoint + stall

Detail + `run.json` records: `references/failure-triage.md`.

- **Checkpoint** every `execution.budget.checkpoint_min`: near it start no long step; at it finish in-flight cycle, pause + ask; wait indefinitely, delete nothing. "continue" → next window; "stop" → unrun = `not_run`, never `pass`; run incomplete.
- **Stall** (any time): failure outside triage classes, repeat without change, unexpected tool/MCP/env answer, unresolvable ambiguity, step outside profile/invariants → stop + ask: phase, what was tried, what is needed. Foreseen failures follow caps without asking.

## Approval before publish (Q9, Phase 4)

L2/L3 only. After all phases (incl. Q8 at L3): send human the exact comment, attachment list (file → AC), target status, target issue. Approve → publish exactly the preview (same source file). Adjust → new preview. Do not publish → end incomplete, keep everything. Waiting = indefinite; nothing published, changed, or deleted meanwhile. Q1 status sync + Q8 MR stay automatic.

## References

| File | When |
| ---- | ---- |
| `references/profile-schema.md`, `references/profile-schema-policy.md` | Profile keys, YAML subset, gate extras, autonomy |
| `references/profile-discovery.md` | Q0, profile absent |
| `references/intake.md` | Q1 |
| `references/acceptance-criteria.md` | Q2 |
| `references/impact-mapping.md` | Q3 |
| `references/test-design.md` | Q4 |
| `references/environment.md`, `references/qa-env-contract.md` | Q5; writing a project `qa-env` script |
| `references/execution-lanes.md` | Q6 lanes, ledger skeleton, spec source, evidence |
| `references/browser-tools.md` | Q6 browser lane tool + capability probe |
| `references/failure-triage.md` | Any failed run; checkpoint; stall |
| `references/cleanup.md` | Q10; leftover removal |
| `references/report.template.md` | Q7 report |
| `references/entry-triggers.md` | Trigger phrases |
| `templates/qa-profile.template.md`, `templates/qa-env.template.sh` | Profile / `qa-env` scaffolds |
| `templates/*.schema.json` | Profile / acceptance / plan / ledger / run / qa-env output contracts |
