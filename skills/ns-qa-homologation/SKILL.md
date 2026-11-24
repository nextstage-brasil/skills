---
name: ns-qa-homologation
description: "(NS) Acceptance homologation (QA) of a delivered GitLab issue: QA profile, intake, AC-n, MR impact, risk-ordered test plan, deterministic gate, local report. Explicit only: \"homologate <URL>\", \"homologar\", \"acceptance QA\", /ns-qa-homologation. Do NOT: implement or bare ISSUE_URL (ns-execution-gitlab-issue), delivery proof (ns-judge), write E2E specs (ns-e2e-tests), code review (ns-reviewer)."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "0.1.0"
depends:
  - ns-harness
  - ns-e2e-tests
  - ns-judge
  - ns-reviewer
---

# QA Homologation

Acceptance homologation of a **delivered** issue against the running system. Phases Q0–Q10, state on disk, project values only in QA profile. Evaluates product, not code: `ns-judge` proves diff vs ACs; this skill homologates behavior. Verdict scale (4 levels + confidence) belongs here only — `ns-judge` "no second rubric" rule stays inside `ns-judge`. Ledger consistency stays binary (`qa_gate.py` exit 0 or reject).

## Implementation status (v0.1.0)

| Delivered | Phases | Level |
| --------- | ------ | ----- |
| **Yes** (Phase 1) | Q0 boot, Q1 intake, Q2 criteria, Q3 impact, Q4 plan, Q7 report (local, no verdict) | L0 |
| No — Phase 2 | Q5 environment + data | — |
| No — Phase 3 | Q6 execution + evidence, Q1 status writes | L1 |
| No — Phase 4 | Q7 verdict, Q7b homologation score, Q9 approval + publication | L2 |
| No — Phase 5 | Q8 automation | L3 |
| No — Phase 6 | Routing row, `qa-agent` bridge, dev → QA handoff | — |

**Until phases land:** any profile level ≥ L1 runs as **L0** (plan + local report, zero tracker writes). `qa_gate.py --check-profile` returns `autonomy_effective`; report §1 states declared vs effective + reasons. Never run a phase marked No.

## Routing

Explicit invocation only — no automatic URL routing. Reliable entry until Phase 6: **`/ns-qa-homologation <ISSUE_URL or IID>`** (generated `AGENTS.md` hard stop still sends GitLab URLs to `ns-execution-gitlab-issue`). Homologation keyword + URL ≠ bare `ISSUE_URL` — keyword wins. Bare `ISSUE_URL` → `ns-execution-gitlab-issue`. Triggers: `references/entry-triggers.md`.

| Need | Target |
| ---- | ------ |
| Implement / fix issue | `ns-execution-gitlab-issue` / `ns-coder` |
| Diff vs ACs after `Code Review: Approved` | `ns-judge` |
| Write / refactor E2E specs (Q8, Phase 5) | E2E repo own skills; none → `ns-e2e-tests` |
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

Effective level = min(profile `autonomy_level`, L1 if any `# inferred` field, highest implemented level). New profile starts L1; raising = human edit.

## Invariants (every level)

Never: close issue · log time · merge · push protected branch · change product code · print credentials · remove a resource not registered in this run's `run.json` · publish comment or final status without human approval of the preview · weaken/skip an assertion or use `force` to go green.

## Run directory

`evidence.dir` from profile (default `docs/qa/{run_id}`, gitignored, never versioned). `run_id` = `<dev iid>-<UTC YYYYMMDDTHHMMZ>`.

| File | Phase | Content |
| ---- | ----- | ------- |
| `run.json` | Q0 | `run_id`, issues, declared/effective level + caps, `profile_sha256`, `phase` (last gate passed), `resources: []` (each created resource, registered at creation) |
| `intake.md` | Q1 | `references/intake.md` |
| `acceptance.yml` | Q2 | `references/acceptance-criteria.md` |
| `impact.md` | Q3 | `references/impact-mapping.md` |
| `plan.yml` | Q4 | `references/test-design.md` |
| `report.md` | Q7 | `references/report.template.md` |
| `env.json`, `evidence/`, `results/`, `qa-ledger.json`, `verdict.json`, `qa-judgment.json`, `preview.md`, `publish.json` | Q5–Q9 | Planned |

**Resume:** same dev issue + `run.json` with `phase` before done → continue at next phase; never redo a passed gate. Context compaction → re-read `run.json` first.

## Phases

| Phase | Output | Exit gate | Status |
| ----- | ------ | --------- | ------ |
| Q0 Boot | `run.json` | python3 present; profile valid (`--check-profile` exit 0); GitLab MCP reachable | Ready |
| Q1 Intake | `intake.md` | dev issue resolved; MR found or absence declared; status guard (≥L1: both sides `*_running`; L0: recorded) | Ready (read-only) |
| Q2 Criteria | `acceptance.yml` | every AC `source: issue\|derived`; derived/ambiguous carry `assumption` | Ready |
| Q3 Impact | `impact.md` | every area linked to ≥1 scenario (checked at Q4) | Ready |
| Q4 Plan | `plan.yml` | `--check-plan` exit 0 (coverage, minimum types, risk order) | Ready |
| Q5 Environment | `env.json` | `qa-env health` ok; deployed commit = MR commit | Phase 2 |
| Q6 Execution | ledger + evidence | every scenario terminal (pass/fail/blocked/not_run+reason) | Phase 3 |
| Q7 Verdict + report | `verdict.json`, `report.md` | `--check-ledger` exit 0; L0: report only | Report ready; verdict Phase 4 |
| Q7b Score | `qa-judgment.json` | score ≥ `judge.min_score`; else complement cycle | Phase 4 |
| Q8 Automation | E2E MR | ≥`stability_runs` green, review approved | Phase 5 |
| Q9 Approval + publish | `preview.md`, `publish.json` | human approved preview; idempotent publish | Phase 4 |
| Q10 Cleanup | `cleanup.log` line | full success only; registered resources only | Phase 2+ |

### Q0 Boot

1. `command -v python3` and version ≥ 3.9. Missing/older → **stop** with reason. Deliberate divergence from `ns-judge` (which skips scripts when Python is absent): homologation output must rest on the deterministic gate, never on narrative.
2. Profile `docs/context/qa-profile.md` absent → `references/profile-discovery.md`, then continue.
3. `python3 scripts/qa_gate.py --check-profile docs/context/qa-profile.md --repo .` — exit 3 → stop, list `errors`; never rediscover an existing profile. Keep `warnings` for report.
4. Read `tracker.status_source` (single source of status names). GitLab MCP unavailable → stop (stall rule).
5. Create run dir + `run.json` with `autonomy_effective` + `autonomy_caps` from step 3.

### Q1–Q4

Follow each reference in order. One artifact per phase; update `run.json.phase` after each gate. L0: MCP **read** tools only.

### Q7 report (L0)

Fill `references/report.template.md` in profile `language`. §1 verdict = not computed; §6/§8 = not executed/scored; §1 lists level downgrade + every cap reason. Report stays local (`report.md`); no comment, no status change.

## Gate script

`scripts/qa_gate.py` (stdlib; shared parser `qa_yaml_lite.py`, schemas in `templates/`). Prints JSON on stdout.

| Mode | Command | Exit |
| ---- | ------- | ---- |
| Profile | `--check-profile <profile.md> [--repo .]` | 0 valid; 3 invalid |
| Plan (L0) | `--check-plan <run_dir>` | 0 consistent; 2 rejected; 3 missing/unparseable |
| Ledger | `--check-ledger <qa-ledger.json> [--evidence-dir <dir>]` | 0 consistent (may report `blocked: true`); 2 rejected; 3 unreadable |

Exit **1 never used** (unlike `ns-judge`, where 1 = skip). Exit 2 → fix artifact per `errors`, re-run. `--verdict` + `qa_judge.py` = Phase 4 (not present). Ledger contract: `templates/qa-ledger.schema.json`; `mr: null`, commit mismatch, unhealthy env → `blocked_reasons`, not schema failure.

## Checkpoint + stall

- **Checkpoint** every `execution.budget.checkpoint_min`: near it start no long step; at it finish in-flight cycle, start nothing new, pause + ask; wait indefinitely, delete nothing. "continue" → next window; "stop" → close with what exists (unrun = `not_run`, never `pass`; run incomplete).
- **Stall** (any time): unforeseen error outside triage classes, same phase/scenario repeating without change, tool/MCP/env answering unexpectedly, ambiguity docs cannot resolve, step outside profile/invariants → stop + ask: phase, what was tried, what is needed. Foreseen failures follow their own caps without asking.

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
| `references/report.template.md` | Q7 report |
| `references/entry-triggers.md` | Trigger phrases |
| `templates/qa-profile.template.md` | Profile scaffold |
| `templates/*.schema.json` | Profile / acceptance / plan / ledger contracts |
