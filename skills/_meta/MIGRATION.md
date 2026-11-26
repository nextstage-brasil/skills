# NextStage Skills Migration

Migration notes for skills promoted into this repository as the canonical home for agent-agnostic workflows.

## `ns-qa-homologation` 0.5.0 — Phase 5: Q8 automation, L3 (2026-11-25)

`IMPLEMENTED_MAX_LEVEL` = `L3`: L3 runs Q8 (E2E branch + MR, no approval, never merged) before Q9; the Q9 preview carries the MR link or the no-op reason.

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-qa-homologation` | 0.4.0 → 0.5.0 | New `references/automation-handoff.md` + `scripts/qa_automation.py` (`plan` / `specs` / `record-run` / `record-review` / `commit` / `record-commit` / `record-push` / `record-mr` / `status`; rules in `qa_automation_rules.py`): candidates = `automate: true` ∧ runner lane ∧ no existing coverage ∧ ledger `pass`; nothing left → recorded `skip_reason` (Q8 `skipped`, accepted by L3 success); branch from `branch_pattern` (`{iid}` `{run_id}` `{slug}`), strict charset, ≠ base / `protected_branches`; stability = ≥ `stability_runs` green runs on one spec set (sha256-bound; red run blocks until specs change; Q8 runs never merged into ledger); review max 3 rounds, Approved only at 10 with lint clean; git argv only (fetch, switch, add, commit `-- <specs>`, push `refs/heads/<branch>:refs/heads/<branch>`), guard refuses force / delete / no-verify / amend / foreign refspec; commit = `<commit_prefix> <subject>` + `Related to <dev issue>` (subject in `commit_language`, D39); `--author` from `AGENT_GIT_AUTHOR_*`; MR description (`automation/mr.md`: marker `<!-- ns-qa:run=<run_id>;kind=e2e -->`, scenario table, one `Related to`) validated before `create_merge_request`, edited file refused at `record-mr`. New `scripts/lint_e2e_antipatterns.py` (Cypress + Playwright: `raw-selector`, `fixed-wait`, `force-action`, `cypress-env`, `spec-intercept`, `focused-or-skipped`, `uncaught-exception`; E2E repo `.e2e-antipatterns.json` override; exit 0/2/3). `qa_junit_rules.resolve_report` (Q8 reports under `automation/`). Publication: L3 needs Q8 terminal; preview row + summary line `E2E merge request` / `**E2E automation:**`. Cleanup: L3 success = Q8 `passed` or `skipped` whose reason + exclusions equal the plan.yml (pinned by Q7b) + ledger recomputation; same check before the L3 preview. Hardening: `commit` stores `commit_specs_sha256` (`specs` resets subject; `record-commit` verifies); worktree = single `via: agent` resource, linked worktree (`.git` file), absolute `git -C`; lint config from the E2E repo checkout (differing worktree copy refused, `lint_config_sha256` recorded); spec-only lint rules apply to `*.cy.*`/`*.spec.*`/`*.test.*` only; lint false positives/negatives fixed (`map.fit(`, Playwright `>>`, `cy.task` `force`, compound class / descendant / jQuery pseudo selectors); reports deduplicated by content fingerprint (`report_fingerprint`); `@mentions` neutralized in MR text and refused in `commit_prefix`. `references/profile-schema-execution.md` split from `profile-schema.md` (8 KB budget). Report template: `e2e_mr` line omitted (summary block carries it) |
| Run schema | `run_version` 1 | Additive: `automation {scenarios, excluded, skip_reason, branch, specs, runs, reviews, subject, commit_specs_sha256, commit, pushed, mr}`. Gate: automation + Q8 only at effective L3; Q8 `passed` ⇒ MR recorded; `skipped` ⇒ `skip_reason` (no recorded work); commit ⇒ approved review + ≥2 green runs on the committed spec set; pushed ⇒ commit; MR ⇒ pushed + URL ends `/-/merge_requests/<iid>`; ≤3 review rounds; L3 publication ⇒ Q8 terminal |
| QA profile | — | New optional `execution.e2e_git.remote` (default `origin`), `execution.e2e_git.protected_branches` (`[]`), `execution.e2e_lint.forbid_spec_intercepts` (`false`). `execution.stability_runs` minimum 1 → 2. Q0 errors: invalid `e2e_git` names / `branch_pattern` (unknown placeholder, no `{iid}`/`{run_id}`), L3 `e2e_root` not project-relative |
| `ns-reviewer` | 2.4 → 2.5 | New `references/e2e-spec-review.md` + mode `e2e-spec` (Q8 caller; lint findings = Critical; same Score gate). Other modes and triggers unchanged |
| `ns-e2e-tests` | 1.3 → 1.4 | New `references/playwright-architecture.md`; homologation calls with `runner: playwright` follow it. Cypress triggers unchanged |
| CI | — | `validate-skills.yml` runs `test_qa_automation.py`, `test_lint_e2e.py` |

Consumers: L3 profiles now run Q8 (previously capped at L2); `stability_runs: 1` fails `--check-profile`; L3 with `e2e_root` outside the project (`..`) fails `--check-profile`.

## `ns-qa-homologation` 0.4.0 — Phase 4: verdict, homologation judge, approval + publication, L2 (2026-11-25)

`IMPLEMENTED_MAX_LEVEL` = `L2`: L1 runs Q0–Q7b (verdict + score informative, local report) and Q10; L2 adds Q9 (preview approval, MCP publication, result status). L3 profiles run as L2 until Q8 (Phase 5).

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-qa-homologation` | 0.3.0 → 0.4.0 | New `references/verdict-rubric.md` + `qa_gate.py --verdict <ledger> --profile <md>` (`qa_verdict_rules.py`; writes `verdict.json`, `templates/qa-verdict.schema.json`): first-match rubric Blocked (ledger `blocked_reasons`) → Not homologated (critical AC fail, blocker/high `delivery_defect`) → Blocked (critical AC blocked/not_run, blocked ratio > `verdict.blocked_scenario_ratio`) → With reservations (non-critical not pass, other findings, caps flaky/derived critical, runner none) → Homologated; confidence Σ(weight × credit)/Σ weight (flaky 0.5, derived × 0.5); `missing_for_100`, `mocked` (D25: never caps). New `references/homologation-judge.md` + `scripts/qa_judge.py` (`qa_judge_rules.py`, `templates/qa-judgment.schema.json`): six dimensions (D46 weights), adherence decisions from ledger, `missing_for_10` actionable vs not, loop `passed` / `complement` / `ended_below_min`, `--record-round` (ledger `judge_rounds`, `resume` after human `continue`). New `references/publication.md` + `scripts/qa_publish_plan.py` (`preview` / `approval` / `payload [--offline]` / `record`; `qa_publish_rules.py`): one `preview.md`, payload parsed back from it, hash-bound approval, marker `<!-- ns-qa:run=<run_id>;kind=<dev\|qa> -->` (+ `;part=<n>` for extra attachment batches), status D27/D41, below `judge.min_score` only with answer `publish_anyway` (D50). Cleanup planner: L1 success = Q0–Q7b; L2 = + Q9 published with every capture uploaded; agent worktree removal `git -C <repo_root> worktree remove <id>` (no `repo_root` → kept). Shared `qa_artifacts.py`, `qa_policy.py` (profile defaults). Published comment part 1 opens with a script-rendered summary (verdict, confidence, score, loop, rounds) and preview header rows; `report.md` contradicting `verdict.json` / `qa-judgment.json` is refused. Failed upload → post nothing, `preview --not-uploaded` (reservation + local paths), new approval; `record --not-uploaded` must equal the approved preview. Profile pinned: `--verdict` (when `run.json` exists), `qa_judge.py`, `qa_publish_plan.py` refuse a profile whose sha256 ≠ `run.json` `profile_sha256`. `qa-judgment.json` stores `judge_rounds_sha256`: hand-edited rounds refused. D50 pause at every level (`publish_anyway` L2+ only); planner proves Q7b from `qa-judgment.json` beside `run.json` (same `run_id`, recomputed from ledger + `plan.yml` + pinned profile; `--outcome success` needs `--profile`). Script summary block = single source of verdict / confidence / score: report template §1/§8 no longer restate them at L2+; everywhere except the title line and §2–§7 (rest of title area, §1, §8, §9+, footer; ATX/setext numbered headings) any `x/10`, `x%` / percent, verdict label or verdict line is refused whatever its value (NFKC + entity/markup normalization; missing `## 1.` / `## 8.` heading refused). i18n `missing_for_100` reworded ("below full"). Status label parser: empty label = absent. Report template: verdict, confidence, score, rounds, missing for 10, mocked, E2E MR placeholder (L3); `verdict_pending` key removed |
| Ledger schema | `ledger_version` 1 | Additive: optional `adherence[] {scenario, ac, adherent, reason}`, `scenarios[].mock_reason`, `judge_rounds[].resume: true`. Gate: adherence pairs (unique, covered AC, executed scenario), `mock_reason` only off `real`, no-gain round last unless next `resume` |
| Run schema | `run_version` 1 | Additive: `created_resources[].repo_root` (worktree only), `publication {approvals[], outcome}`; pause answer `publish_anyway` (below_min_score only). Gate: approvals ↔ answered preview pauses, outcome after approve, offline ↔ `none`, publication only at effective L2+, Q9 passed ⇒ outcome published, `publish_anyway` only at effective L2+ |
| QA profile | — | No new keys. Effective level L2 now reachable; L3 capped at L2 (`autonomy_caps`) |
| CI | — | `validate-skills.yml` runs `test_qa_verdict.py`, `test_qa_judge.py`, `test_qa_publish.py` |
| Harness tests | — | `test/qa-env-fixture.mjs`: completed L1 run passes Q7b; planner `success` without `--profile` = exit 3; `leftover` plan drives the qa-env removals |

Consumers: existing L1 runs (Q7 `skipped`) still keep everything at Q10; new runs reach Q10 success. Raising `autonomy_level` to `L2` enables publication after preview approval.

## `ns-qa-homologation` 0.3.0 — Phase 3: execution and evidence, L1 (2026-11-24)

`IMPLEMENTED_MAX_LEVEL` = `L1`: runs execute Q0–Q6 + local report (verdict not computed, pending Phase 4). Q1 status sync active at L1. L2/L3 profiles run as L1; `environment.provider: none` runs as L0. Q10 does not run at L1 yet (planner needs Q7 verdict gate) → every run-owned resource kept; human removes via leftovers.

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-qa-homologation` | 0.2.0 → 0.3.0 | New `references/execution-lanes.md` (runner lane first, browser lane complement, ledger skeleton, spec source D34, retries 0, tags, evidence flow, Q6 gate, resume), `references/browser-tools.md` (capabilities, tool map, probe, no tool → browser lane blocked), `references/failure-triage.md` (ENV/DATA/TEST/FLAKY/PRODUCT order + caps, run record fields, checkpoint D48, stall D49). Scripts: `qa_triage_rules.py` + `qa_triage.py` (history replay → class / next action / cap), `junit_to_ledger.py` (DOCTYPE/ENTITY refused, `@S-n` / `@AC-n` exact tokens, one run per JUnit file, re-merge refused), `qa_evidence.py` (`add` / `verify` / `index`; names `S-<n>-<seq>-<slug>.<ext>`, sha256, `pii_scrubbed` from masked `pii_fields`, confinement, no symlinks). `--check-ledger` replays each scenario `history` (status/triage must match), re-reads each runner run's own JUnit `source` (outcome for the scenario must match; one run per file), matches `<run_dir>/plan.yml` (ids, lane, type, covers; required once `run.json` shows Q4 passed; output `plan_checked`), checks lane evidence + evidence layout (no symlinks anywhere), ENV exhaustion → `blocked_reasons`. Shared `qa_junit_rules.py` (safe JUnit read, suite nesting cap 256, tag mapping). Unchanged re-run after a `pass` allowed (later fail → FLAKY); `junit_to_ledger.py` skips scenarios already closed `fail`/`flaky`/`blocked` (`ignored_terminal`). Ids bounded to 6 digits. `--check-run`: pause answers per reason, k-th checkpoint ↔ k-th checkpoint pause, optional pause `note`. Cleanup planner rejects `success` after a `stop` / `do_not_publish` answer. Report template: L1 §6 table, `verdict_pending`, kept resources. Evals: broken env, flaky, product defect |
| Ledger schema | `ledger_version` 1 | **Breaking for hand-written ledgers** (none could exist: L0 never wrote one): required `environment.resets` (0–2), `scenarios[].history[]` (`outcome`, `change`, `health`, `signals`, `suggested_class`, `source` required on runner lane), `blocked_reason` when `blocked`, `tool {name, missing}` when lane `browser`; junit paths `results/<name>.xml`, other kinds `evidence/S-<n>-<seq>-<slug>.<ext>`. `S-`/`AC-`/`F-`/`IA-` ids (ledger, plan, acceptance) max 6 digits |
| QA profile | — | `execution.browser_tool_preference` = tool ids of `browser-tools.md` (unknown id → warning); template default lists all four. No new keys |
| `ns-e2e-tests` | 1.2 → 1.3 | Phase 0.0: homologation call with QA-profile `execution.e2e_root` (incl. separate repo with own `AGENTS.md`) → use it, never bootstrap. Homologation specs carry `@S-n` + `@AC-n` title tokens next to `@smoke` / `@regression`. Other triggers unchanged |
| CI | — | `validate-skills.yml` runs `test_qa_triage.py`, `test_qa_junit.py`, `test_qa_evidence.py` |

Consumers: `harness sync`. Profiles at L1 now execute (env + runner/browser); keep `provider: none` or set `autonomy_level: L0` to stay plan-only. Replace `browser_tool_preference` placeholders with tool ids.

## `ns-qa-homologation` 0.2.0 — Phase 2: environment, data, cleanup (2026-11-24)

Q5 (environment + data) and Q10 (cleanup) specified with deterministic checks. Execution still capped at L0 (`IMPLEMENTED_MAX_LEVEL`); Q5/Q10 run from Phase 3 (L1). No routing or tracker behavior change.

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-qa-homologation` | 0.1.0 → 0.2.0 | New `references/qa-env-contract.md` (consumer `qa-env` script: CLI, JSON per subcommand, exit 0/1/2, run-owned ids, idempotency, `down` order + stop on first failure, timeouts), `references/environment.md` (Q5: providers `script`/`url`, health + commit check, data cycle prepare → test → discard with `data_source` ladder, `residual_state`, ENV ≤2 reset → run Blocked, DATA ≤2 reseed, contract break → stall), `references/cleanup.md` (Q10 registration, outcome matrix, never-deleted list, procedure, leftovers). `templates/qa-env.template.sh` (providers `fixed_url`, `compose`, `slot`). `templates/qa-run.schema.json` (`run.json`: level, phases, `created_resources[] {kind, id, created_at, created_by_phase, via}`, checkpoints, pauses) + `templates/qa-env-output.schema.json`. `qa_gate.py --check-run` / `--check-env [--run-id]` (exit 0/2/3). `scripts/qa_cleanup_plan.py` (prints ordered plan with `argv` + shell-quoted `command`; executes nothing; `success` only when `run.json` proves every gate of the level passed; effective L0 → no Q10; profile validated). Resource ids: strict charset (no whitespace, shell metacharacters, leading `-`, `..`) + boundary-aware run-id match. `run.json` key `resources` → `created_resources` |
| QA profile | — | `environment.version_url` (required when `provider: url`), optional `environment.timeouts {up, seed, reset, default}`; `provider: url` → `data.seed.kind` `api`\|`none`. Existing `provider: url` profiles must add `version_url` |
| Harness tests | — | `packages/harness/test/fixtures/qa-app/` (static app + fake offline `qa-env.sh`) + `test/qa-env-fixture.mjs` in `npm test` (needs `bash` + `python3`) |
| CI | — | `validate-skills.yml`: Python set up before `npm test`; runs `scripts/tests/test_qa_run.py` |

Consumers: `harness sync` to update the skill. Profiles with `provider: url` add `environment.version_url`. Scaffold `environment.script` from `templates/qa-env.template.sh` before Phase 3.

## Add catalog skill — `ns-qa-homologation` 0.1.0, Phase 1 (2026-11-24)

Acceptance homologation face (Q0–Q10). Phase 1 = Q0–Q4 + local report (L0). Profile level ≥ L1 runs as L0 until Q5–Q9 land; report states declared vs effective level. Explicit invocation only — no routing row yet (Phase 6). Python 3.9+ mandatory (Q0 stops without it; deliberate divergence from `ns-judge`).

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-qa-homologation` | 0.1.0 | New. `SKILL.md` + references (`profile-schema[-policy]`, `profile-discovery`, `intake`, `acceptance-criteria`, `impact-mapping`, `test-design`, `entry-triggers`, `report.template`). `templates/`: profile template + JSON schemas (profile, acceptance, plan, ledger). `scripts/qa_gate.py` (`--check-profile` / `--check-plan` / `--check-ledger`; exit 0/2/3, 1 unused) + stdlib YAML-subset parser + tests/mutation tests. Catalog `depends`: `ns-harness`, `ns-e2e-tests`, `ns-judge`, `ns-reviewer` (`mcp-gitlab-usage` runtime only, never declared) |
| `docs/qa-homologation/` | — | Removed. `profile-schema.md` → `skills/ns-qa-homologation/references/` (split into `profile-schema.md` + `profile-schema-policy.md` for the 8 KB reference budget; example moved to `templates/qa-profile.template.md`); `qa-ledger.schema.json` → `skills/ns-qa-homologation/templates/` |
| Preset `qa` | — | New (`presets/` + bundled copy, alias `qa`): extends `gitlab`, adds `ns-qa-homologation` + `ns-e2e-tests`; `warnings`: Python 3.9+ required. `full` extends `qa` instead of `gitlab` (same skills + QA). `full` consumers therefore also get the `## Acceptance tier` section inlined in generated `AGENTS.md` (installed `ns-qa-homologation`) and the Python 3.9+ install warning |
| `catalog.json` | — | `ns-qa-homologation` depends + category `qa`; `skill-paths.json` entry |
| Harness `GITIGNORE_ENTRIES` | — | `/docs/qa/` (QA evidence never versioned). Managed block → applies to **every** consumer on next `harness sync`, with or without the `qa` preset |
| `ns-harness` | 1.6.1 → 1.6.2 | `artifact-layout.md`: `docs/context/qa-profile.md`, `docs/qa/<run_id>/` |
| CI | — | `validate-skills.yml` runs `ns-qa-homologation` Python tests; `npm test` dry-runs `--preset qa`; `validate-catalog.js` checks `qa.json` mirror |

Consumers: `npx @nextstage-brasil/harness --preset qa --yes`; re-run `harness sync` to add `/docs/qa/` to `.gitignore`. Profile: `docs/context/qa-profile.md` from template (or Q0 discovery), starts at L1.

## QA homologation — Phase 0 foundations (2026-11-24)

Groundwork for planned `ns-qa-homologation`. No new catalog skill; no `catalog.json` key. Existing behavior unchanged except `ns-gitlab-board-sync` MCP correction.

| Surface | Version | Change |
| ------- | ------- | ------ |
| `ns-harness` | 1.6.0 → 1.6.1 | New `references/acceptance-tier.md` (+ `packages/harness/templates/snippets/acceptance-tier.md`): tier = agent-run E2E inside human-invoked homologation run; user-requested E2E under other skills keeps existing rules. Pointer in `docker-and-testing.md` (both copies); `agents-md.md` + template include it only when `ns-qa-homologation` installed; `rules-sync.md` default subagent models = code (`inherit` cursor/antigravity) |
| `packages/harness/templates/harness-README.md` | — | Subagent manifest example model = code default (`inherit`) |
| Generated `AGENTS.md` | — | Docker and testing gains one acceptance-tier pointer line; `## Acceptance tier` inlined only when `ns-qa-homologation` installed |
| `ns-coder` | 2.5 → 2.6 | Acceptance-tier pointer at E2E bans (`SKILL.md`, `run-implementation.md`, `run-implementation-closure.md`); ban unchanged. `references/` links to `ns-harness` fixed `../../../` → `../../` |
| `ns-spec-driven` | 1.8.8 → 1.8.9 | Pointer in `execution-handoff.template.md`; `e2e-test-task-generator.md`, `unit-test-task-generator.md`, `stacks/laravel-react.md` rule paths `.mdc` → `.nextstage-harness/rules/<name>.md` |
| `ns-backend-tests` | 1.1 → 1.2 | Rule paths `.mdc` → `.md` (`SKILL.md`, `backend-testing-architecture.md`) |
| `ns-e2e-tests` | 1.1 → 1.2 | Acceptance-tier pointer; `e2e-tests-rules` path → `.md` (optional via `harness add-rule`; not distributed) |
| `ns-gitlab-ci-generator` | 1.0 → 1.1 | Rule paths `.mdc` → `.md` |
| `ns-gitlab-board-sync` | 1.2 → 1.3 | **Behavior fix:** `Status: *` via `set_issue_status` only (never `set_issue_labels`) + Status guard (read current status; never overwrite in-progress/done/blocked; unexpected status → no change, report); dropped non-existent `list_project_labels` — unknown label names: ask human once, record in config. Config template: optional homologation status keys; config = single source of status label names |
| `docs/qa-homologation/` | — | Phase 0 contracts: `profile-schema.md`, `qa-ledger.schema.json` (moved into skill in Phase 1) |

Consumers: `harness agents-md --force` to pick up the pointer line. Board-sync configs: no key renames.

## Engineering guardrails + Test tiers (2026-10-24)

Portable engineering guardrails landed in generated/refined `AGENTS.md`, architecture-rules template, docker-and-testing snippets, and worker/review skills.

| Surface | Change |
| ------- | ------ |
| Generated `AGENTS.md` | New **Engineering guardrails** (Ask before / Never / library-drift rule) after Hard stops |
| Docker + testing snippets | **Test tiers** — default deterministic; live opt-in (marker + excluded from default CI/coder loop; credentials from env/secret manager) |
| `architecture-rules` template | Domain invariants; Ask before / Never; Live (on demand) suite row |
| `ns-coder` 2.3 → 2.4 | Ask-before gates; protected tests; default-tier-only pre-review |
| `ns-reviewer` 2.3 → 2.4 | Critical/Warning rows for secrets, weakened tests, default-tier live/LLM |
| `ns-judge` 1.0 → 1.1 | `scan_bypasses.py`: type-escape + expanded test-skip |
| `ns-backend-tests` / `ns-e2e-tests` 1.0 → 1.1 | Live group / stubbed third-party by default |
| `ns-langgraph-agents` 1.19 → 1.20 | Model role env vars; fake LLM default tier; LLM evals on-demand |
| `ns-harness` 1.5.2 → 1.5.3 | Snippets + agents-md + architecture-rules + git atomic + skill precedence |

Consumers: refresh `AGENTS.md` (`harness agents-md --force` or `/ns-harness` agents-md) and re-run architecture-rules prepare when updating constitution stubs.

## Add catalog skill — `ns-mcp-shield` (2026-09-28)

Secure MCP server development/review (OWASP GenAI Practical Guide v1.0). Catalog `depends`: none (standalone — no `ns-harness`). **Not** in `alwaysInstall` or presets — opt-in:

```bash
npx skills add nextstage-brasil/skills@ns-mcp-shield --full-depth -y
```

Category: `labs`. Progressive disclosure: `references/vulnerability-landscape.md`, `controls.md`, `minimum-bar.md`. License: CC-BY-SA-4.0 (OWASP attribution).

## Module 5 — agent platform + runtime remainder (2026-09-08)

| Skill | Version | Change |
| ----- | ------- | ------ |
| `ns-agent-platform` | 1.0 | New. Compute topology, multi-tenant, onboarding, LLM-gateway-as-product. `docs/specs/agent-platform.md`. Catalog + `skill-paths.json` + `agents` preset + `external-skills.json` `nsSkills` |
| `ns-agent-architecture` | 1.23 → 1.24 | Pointer only: Related skills + Gateway line (API entry ≠ LLM gateway product). No `depends: ns-agent-platform` |
| `ns-langgraph-agents` | 1.15 → 1.16 | `guardrail-and-adversarial.md`; cascade OR both signals; golden-set promotion; audit retention/query |
| `ns-agent-adaptation` | 1.4 → 1.5 | Malformed-arg self-validation in `tool-schema-design.md` |

Do not restate Wave 4 ADR/transport/provider (already 1.22/1.23). Parallel-producer already 1.15. New `catalog.json` key: `ns-agent-platform`.

## Modules 1–3 coverage wave (2026-09-07)

Build-grade gaps from fundamentos / single-agent / multi-agent modules. Module 5 out of scope.

| Skill | Version | Change |
| ----- | ------- | ------ |
| `ns-agent-adaptation` | 1.3 → 1.4 | `tool-schema-design.md`; typed schema inventory; reality-test gate; report Typed schema column |
| `ns-agent-architecture` | 1.21 → 1.22 | `inter-agent-transport.md`, `provider-selection.md`; multi-agent Failure/Compensation/Events in ADR (not defense-only); provider/hosting + threshold owner probes; sizing table |
| `ns-langgraph-agents` | 1.14 → 1.15 | Parallel producer staleness + settle-all; Reflection surface/content + blocking eligibility; iteration trace; escalate on non-convergence |

No new `catalog.json` key.

## Module 4 — AI-specific patterns coverage wave (2026-09-05)

Gateway intent routing = deterministic only (rule / cheap non-LLM / embedding). LLM `intent_classify` hop **FORBIDDEN**. Cascade escalate = post-generation confidence.

| Skill | Version | Change |
| ----- | ------- | ------ |
| `ns-postgres-rag` | 1.2 → 1.3 | `retrieval-augmentations.md` — Multi-Index + agentic additive Gate 2; routing key = ADR Gateway category |
| `ns-agent-architecture` | 1.20 → 1.21 | `gateway-calibration.md` — categories, tier, thresholds, always-escalate; conditional ADR section |
| `ns-langgraph-agents` | 1.13 → 1.14 | Cascade allows deterministic Gateway; `tool_executions` audit fields; measured semantic-cache thresholds; draft SSE pending HITL |

No new `catalog.json` key. Stacks on 1.20 defense pack; `architecture-defense-template.md` untouched.

## Architecture defense pack opt-in (`ns-agent-architecture` 1.20) (2026-09-05)

Step 9 after ADR: opt-in `docs/specs/agent-architecture-defense.md` (boundary, orchestration, failure/saga, events, A-vs-B, slide seed). Schema: `architecture-defense-template.md`. Grill CAP/saga/event gaps; never invent. ADR = implementation handoff. No new `catalog.json` key.

## Rename — agent pipeline IDs (2026-09-05)

Catalog keys and directories:

| Old | New |
| --- | --- |
| `ns-agent-engineering` | `ns-agent-adaptation` |
| `ns-multi-agent-architect` | `ns-agent-architecture` |

Aliases in `retired-skills.json` (plus legacy `multi-agent-architect`). README lists them as Stage 1 → 2 → 3 with `ns-langgraph-agents`. Scope unchanged — not a merge.

## AI-First doctrine gaps — Wave 4 (`ns-reviewer` 2.1 / `ns-agent-adaptation` 1.2) (2026-09-05)

`ns-reviewer`: AI/agent diff criteria under Review priorities (irreversible write without gate, prompt without version bump, audit UPDATE/DELETE = Critical; exact LLM equality assert = Warning + score cap 7–8; missing token/cost accounting = Warning, no extra cap). `ns-agent-adaptation`: episodic vs semantic external memory, retention liability, Reflection section. No new `catalog.json` key.

## AI-First doctrine gaps — Waves 2–3 (`ns-langgraph-agents` 1.13) (2026-09-05)

Distributed failure: availability vs consistency per block, multi-write compensation, concurrent-turn version checks. `max_cost_per_turn` stop wired to reservation rule. New `model-cascade-and-cache.md` (post-generation escalate; not intent_classify). No new `catalog.json` key.

## AI-First doctrine gaps — Wave 1 (`ns-agent-architecture` 1.18) (2026-09-05)

Orchestration pattern catalog (`orchestration-patterns.md`); throughput trade-off axis; per-context budget rows. No new `catalog.json` key.

## SDD nest under `sdd/` (2026-09-02)

Canonical SDD root: `docs/versions/{version_san}/sdd/`. All SDD face outputs (requirements, clarify, source, tasks, handoff, roadmap, subversions, delivery-units, ui-contract, spec-coverage, graph-spec, execution-plan) live there. `pm/` stays sibling under the same version folder. `docs/context/` and `docs/specs/` unchanged.

- SSoT: `skills/ns-harness/references/artifact-layout.md` (legacy read fallback + nest migration gate).
- Resume: `ns-spec-driven` → `references/session-continuity.md`.
- PM boundary: `ns-project-manager` → `pm-persist.md` excludes entire `sdd/` subtree.
- **GitLab MCP follow-up (server-side, out of scope here):** `generate_requirements` / publish defaults should accept explicit `docs/versions/{version_san}/sdd/requirements.md`; align server default away from version root.

## Remove catalog skill — `mcp-gitlab-usage` (2026-09-02)

`mcp-gitlab-usage` is no longer a harness catalog skill. The GitLab MCP server creates and updates it on first use (`get_mcp_gitlab_skill`). Removed from `catalog.json`, presets (`gitlab`), `skill-paths.json`, and install-time `depends`. Runtime body references remain (agents follow the MCP-written skill). Dropped retired alias `"ns-mcp-gitlab-usage": "mcp-gitlab-usage"` (target no longer in catalog). Do not re-add under `skills/mcp-gitlab-usage/`.

## Add catalog skill — `ns-graphrag` (2026-09-02)

GraphRAG **process** doctrine (ontology, schema-locked extract, logical edges with evidence and mentions, six answer shapes, cite-or-refuse). Frontmatter and catalog `depends`: `ns-harness`, `ns-postgres-rag`. **Not** in `alwaysInstall`; included in `agents` and `full` presets. Opt-in otherwise (pulls `ns-postgres-rag` when `depends` resolve):

```bash
npx skills add nextstage-brasil/skills@ns-graphrag --full-depth -y
```

Do **not** add `ns-graphrag` to `ns-postgres-rag` depends.

## Subagent spawn binds adapter model (`ns-harness` 1.5.1 / `ns-spec-driven` 1.8.1) (2026-08-28)

`subagent-dispatch.md`: child phase **MUST** spawn project agent by exact `manifest` `name` (`.cursor/agents/{name}.md` / `/{name}`) so YAML `model` applies. **FORBIDDEN:** Task `inherit`, `coder`, `generalPurpose` as stand-in (parent model leak). If platform cannot spawn `{name}`, stop; human invokes `/{name}`. Face `ns-spec-driven` 1.8.1 cites the same rule on Tasks. No new `catalog.json` key.

## Spec fidelity — Gate 0 detectors (`ns-spec-driven` 1.8) (2026-08-28)

Three generic detectors in `clarify-strict.md` after category checklist, before Gate 0: D1 unresolved value, D2 unanchored external source (+ unreachable-path escape = major premise, no re-block), D3 contradiction/capability. Default hit = major; critical only if public contract, persistence/schema, or feature impossible. D1 rescan on `requirements.md` contract tables at Consistency; D1 on task Contract at `task-generator`; D2 ledger on `ui-screen` mapped. Phase/order tables stay coverage + partition — not Clarify. No new `catalog.json` key.

## Spec fidelity — `ns-spec-driven` Clarify-Strict (2026-08-28)

Version **1.7**. Completeness before fidelity. Clarify-Strict **grill** = Gate 0; confirm gates 1–4 and brownfield 0.4 unchanged.

**Intake** phase: persist verbatim `docs/versions/{version_san}/sdd/source/{slug}.md` (anchors `S1`, `S3.1`, `S10.4`); never rewrite; never edit after Gate 1.

New version artifacts: `clarify-contract.md`, `unknowns-register.md`, `source/`, `spec-coverage.md`, `ui-contract.md` (UI only). Product pointer: `docs/context/reference-sources.md`.

Clarify-Strict (`references/clarify-strict.md`) ≠ `ns-requirements-enricher` (per-issue GitLab). `ns-project-manager` stays decoupled. No new `catalog.json` key.

## Restore catalog skill `ns-requirements-enricher` (2026-08-28)

`ns-requirements-enricher` is a catalog skill again (`skills/ns-requirements-enricher/`). Issue/chat execution-readiness (grill-me vs code) — **not** folded into PM, **not** merged with SDD Clarify.

- Frontmatter `provides: gate:requirements-enrichment` lives on this skill only (removed from `ns-project-manager`)
- Catalog `depends`: `ns-harness`; GitLab category + `--preset gitlab`
- Runtime: follow MCP-provisioned `mcp-gitlab-usage` for tool contracts (not an install `depends`)
- Retired: drop `"ns-requirements-enricher": "ns-project-manager"` (live names must not map away). `"requirements-enricher"` → `ns-requirements-enricher`
- Nested under PM: `ns-commercial-budget`, `ns-delivery-schedule` only

## Add catalog skill — `ns-postgres-rag` (2026-08-18)

PostgreSQL retrieval doctrine (`pgvector`, hybrid FTS, relational GraphRAG). Frontmatter and catalog `depends`: `ns-harness` (session-boot). **Not** in `alwaysInstall`, **not** in any harness preset (`full` included). Opt-in:

```bash
npx skills add nextstage-brasil/skills@ns-postgres-rag --full-depth -y
```

## Fold business skills into `ns-project-manager` (2026-08-14)

`ns-commercial-budget` and `ns-delivery-schedule` are no longer catalog skills. They live under `skills/ns-project-manager/references/<id>/` (own `workflow.md` + `references/` / `assets/`; no evals). Invoke `/ns-project-manager`. `ns-requirements-enricher` was nested in this fold, then restored as a catalog skill on 2026-08-28. Retired aliases in `packages/harness/templates/retired-skills.json` redirect remaining nested-face installs to `ns-project-manager`.

## Conventions

| Item | Rule |
|------|------|
| Directory names | `kebab-case` under `skills/<name>/` |
| Frontmatter `name` | Must match directory name |
| Language | English only for all artifacts |
| `SKILL.md` | Under 500 lines; workflow in body, details in `references/` |
| Templates / checklists | `references/` |
| Scripts | `scripts/` |
| Evals | `evals/evals.json` — 2–3 realistic prompts per skill |
| Path coupling | Use `ns-harness` (`depends` + `../../ns-harness/references/session-boot.md` from domain skills); never hardcode legacy factory skill paths |
| Skill dependencies | Declare `depends:` in frontmatter — resolved by `@nextstage-brasil/harness` and Skills CLI ([skills#861](https://github.com/vercel-labs/skills/pull/861)) |

## Session boot (summary)

1. Obey `AGENTS.md` already in host context — **never** tool-Read it
2. Read `agents.local.md` when present; load `.nextstage-harness/rules/`
3. Read `architecture-rules.md` first; layer rules by changed files
4. **Legacy:** `.cursor/rules/*.mdc` only when `.nextstage-harness/` is absent — `harness init` then `npx @nextstage-brasil/harness sync` (absorbs orphans)
5. Regenerate adapters with `npx @nextstage-brasil/harness sync` after editing canonical rules (also absorbs orphan `.cursor/rules/*.mdc`)

See `skills/ns-harness/references/session-boot.md` and `rules-sync.md`.

## Canonical paths

| Path | Meaning |
|------|---------|
| `.nextstage-harness/` | On-disk harness root (rules, agents, manifest) — **not** the skill name |
| `.nextstage-harness/rules/*.md` | Canonical rules |
| `.agents/skills/` | Installed skills (Skills CLI) |
| `docs/specs/` | Living domain specs |
| `docs/context/` | Product-wide context |
| `{version_san}` | Sanitized version id (e.g. `1.0.0`) |
| `docs/versions/{version_san}/` | Version folder (`sdd/` + `pm/`) |
| `docs/versions/{version_san}/sdd/` | SDD planning/delivery artifacts |
| `docs/versions/{version_san}/pm/` | PM deliverables (commercial budget, schedule, version card) |

## Skill catalog

See root `README.md` for the full catalog and `packages/harness/templates/catalog.json` for install presets and `depends`.

## Cross-skill dependencies

Declared in frontmatter `depends` (install-time) and referenced in skill bodies (runtime):

| Skill | `depends` |
|-------|-----------|
| `ns-harness` | — (base dependency) |
| SDD consumers (`ns-living-spec`, `ns-coder`, `ns-investigator`, `ns-spec-driven`) | `ns-harness` |
| `ns-reviewer` | `ns-harness` |
| `ns-judge` | `ns-harness`, `ns-reviewer` |
| `ns-execution-gitlab-issue` | `ns-harness`, `ns-reviewer`, `ns-judge`, `ns-autonomous` (calls it internally for Phase 2), `ns-coder` |
| `ns-autonomous` | `ns-harness`, `ns-reviewer`, `ns-judge` |
| `ns-gitlab-board-sync` | — (runtime: MCP-provisioned `mcp-gitlab-usage`) |
| `ns-requirements-enricher` | `ns-harness` |
| `ns-project-manager` | `ns-harness` |
| `ns-postgres-rag` | `ns-harness` (in `agents` / `full` presets) |
| `ns-graphrag` | `ns-harness`, `ns-postgres-rag` (in `agents` / `full` presets) |

SDD workflow ordering (internal `ns-spec-driven` phases including unit/e2e test-task references) and execution pairs (`ns-e2e-tests`, `ns-backend-tests`) stay as separate install phases.

## Install

```bash
npx @nextstage-brasil/harness
```

Or manually:

```bash
npx skills add nextstage-brasil/skills@<skill-name> --full-depth -y
```

When CLI supports `depends`, transitive deps install automatically. Until then (`skills@1.5.14`), use `@nextstage-brasil/harness` or install peers explicitly — see `README.md`.

## Flatten domain folders (2026-08-14)

Domain folders (`sdd/`, `code/`, `gitlab/`, …) were removed. All catalog skills live at `skills/<name>/` again so cross-skill relative paths resolve correctly after install. Skill IDs unchanged.

**Consumer action:** reinstall skills; run `harness update` if lock files still reference old `skills/<domain>/<name>` paths.

## Domain folders + skill renames (2026-08-14, harness 1.x) — superseded

Catalog skills (except `ns-harness`) moved under domain folders. Several skills dropped redundant category prefixes from their IDs. Skill ID = **leaf directory name** (install path includes domain).

| Old path | New path |
| -------- | -------- |
| `skills/ns-spec-driven` | `skills/sdd/ns-spec-driven` |
| `skills/ns-sdd-living-spec-consolidator` | `skills/sdd/ns-living-spec` |
| `skills/ns-code-coder` | `skills/code/ns-coder` |
| `skills/ns-code-reviewer` | `skills/code/ns-reviewer` |
| `skills/ns-code-investigator` | `skills/code/ns-investigator` |
| `skills/ns-code-autonomous` | `skills/code/ns-autonomous` |
| `skills/ns-gitlab-board-sync` | `skills/gitlab/ns-gitlab-board-sync` |
| `skills/ns-gitlab-ci-generator` | `skills/gitlab/ns-gitlab-ci-generator` |
| `skills/ns-execution-gitlab-issue` | `skills/gitlab/ns-execution-gitlab-issue` |
| `skills/mcp-gitlab-usage` | `skills/gitlab/mcp-gitlab-usage` |
| `skills/ns-pm-unit-test-task-generator` | `skills/testing/ns-pm-unit-test-task-generator` |
| `skills/ns-pm-e2e-test-task-generator` | `skills/testing/ns-pm-e2e-test-task-generator` |
| `skills/ns-code-e2e-tests` | `skills/testing/ns-e2e-tests` |
| `skills/ns-code-backend-tests` | `skills/testing/ns-backend-tests` |
| `skills/ns-code-frontend-design` | `skills/frontend/ns-frontend-design` |
| `skills/ns-proto-creator` | `skills/frontend/ns-proto-creator` |
| `skills/ns-proto-visual-guide` | `skills/frontend/ns-proto-visual-guide` |
| `skills/ns-harness-agents-md` | `skills/docs/ns-agent-generator` |
| `skills/ns-harness-codebase-reverse-spec` | `skills/docs/ns-codebase-reverse-spec` |
| `skills/ns-harness-architecture-rules` | `skills/docs/ns-architecture-rules` |
| `skills/ns-harness-bootstrap-brownfield` | `skills/docs/ns-bootstrap-brownfield` |
| `skills/ns-harness-prepare` | `skills/docs/ns-harness-prepare` |
| `skills/ns-code-docs-writer` | `skills/docs/ns-docs-writer` |
| `skills/ns-code-best-practices` | `skills/docs/ns-best-practices` |
| `skills/ns-project-manager` | `skills/business/ns-project-manager` |
| `skills/ns-pm-delivery-schedule` | `skills/business/ns-delivery-schedule` |
| `skills/ns-commercial-budget` | `skills/business/ns-commercial-budget` |
| `skills/ns-requirements-enricher` | `skills/business/ns-requirements-enricher` |
| `skills/ns-agent-architecture` | `skills/labs/ns-agent-architecture` |
| `skills/ns-langgraph-agents` | `skills/labs/ns-langgraph-agents` |

**Root (unchanged):** `skills/ns-harness`.

Retired aliases for renamed IDs: `packages/harness/templates/retired-skills.json`. Dependency graph: `docs/dependency-graph.md`.

**Consumer action:** reinstall skills; run `harness update` + `prune-retired-skills`. Until Skills CLI resolves `depends` ([skills#861](https://github.com/vercel-labs/skills/pull/861)), install peers manually — see `docs/dependency-graph.md`.

## Removed `{product_root}` resolution (2026-08)

Harness install dir (`--dir`) **is** the project root. Retired path tokens:

| Old token | Replacement |
| --------- | ----------- |
| `{product_root}/…` | repo-relative `…` |
| `{harness_root}` | `.nextstage-harness/` |
| `{context_root}` | `docs/context/` |
| `{specs_root}` | `docs/specs/` |
| `{product_slug}` | dropped |
| `harness-discovery.md` | collapsed into `session-boot.md` |

Session boot: `skills/ns-harness/references/session-boot.md` (literal paths only). Keep `{version_san}` / `{subversion_san}`.

## Folded prepare workers into `ns-harness` (2026-08)

`ns-harness-prepare`, `ns-architecture-rules`, `ns-agent-generator`, `ns-codebase-reverse-spec`, and `ns-bootstrap-brownfield` are **retired** — workflows live under `skills/ns-harness/references/`. Face: `/ns-harness prepare this repo` or a single-worker prompt (architecture rules, AGENTS.md, reverse-spec, brownfield map). Retired aliases point at `ns-harness`.

## No tool-Read of `AGENTS.md` (2026-08)

Hosts already inject `AGENTS.md` (Cursor) or point at it (`CLAUDE.md`). Session boot, generated First action, and subagent bridges must **obey** it and **never** tool-Read it. Boot loads only `agents.local.md` + `.nextstage-harness/rules/` + `docs/context/` when needed.

## Breaking change — `ns-` prefix + SDD workers (2026-07-25)

All catalog skills were renamed with a global `ns-` prefix. Six SDD planning workers dropped the `pm-` domain prefix in favor of `sdd-`. The human PM face skill was renamed to `ns-project-manager`.

| Change | Detail |
| ------ | ------ |
| Global prefix | Every skill directory/frontmatter `name` is now `ns-<…>` (34 skills) |
| Face / base short names | `nextstage-harness` → `ns-harness`; `nextstage-spec-driven` → `ns-spec-driven` |
| SDD workers | `pm-clarify-requirements` → `ns-sdd-clarify-requirements` (also: requirements-generator, analyze-consistency, version-partitioner, task-generator, living-spec-consolidator) |
| PM face | `pm-requirements-copilot` → `ns-project-manager` |
| Harness on-disk root | Unchanged: still `.nextstage-harness/` at the install / project root |
| `alwaysInstall` | Only `ns-harness` — Spec-Driven / prepare come from presets (`spec-driven`, …) |
| `project-manager` preset | `ns-project-manager` + `ns-delivery-schedule` + `ns-requirements-enricher` + `ns-commercial-budget` (no SDD/code workers) |
| `ns-skill-creator` | **Retired** — use Anthropics `skill-creator`; see `ns-harness` → `references/project-skill-authoring.md` |

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@<new-name>`. After install, `harness init` / `harness update` removes retired directories when the replacement skill is present (`packages/harness/templates/retired-skills.json`). Preview: `npx @nextstage-brasil/harness prune-retired-skills --dry-run`.

New preset: `--preset project-manager` (`ns-project-manager`, `ns-delivery-schedule`, `ns-requirements-enricher`, `ns-commercial-budget`).

## Consolidate SDD workers into `ns-spec-driven` (2026-08-14)

Seven catalog skills merged into `ns-spec-driven/references/` as internal phases. Invoke only `/ns-spec-driven` (including resume / continue / partitioned slices). Retired aliases in `packages/harness/templates/retired-skills.json` redirect installs to `ns-spec-driven`.

| Retired skill | Replacement |
| ------------- | ----------- |
| `ns-sdd-clarify-requirements` | `ns-spec-driven` → `references/clarify-requirements.md` |
| `ns-sdd-requirements-generator` | `ns-spec-driven` → `references/requirements-generator.md` |
| `ns-sdd-analyze-consistency` | `ns-spec-driven` → `references/analyze-consistency.md` |
| `ns-sdd-version-partitioner` | `ns-spec-driven` → `references/version-partitioner.md` |
| `ns-sdd-task-generator` | `ns-spec-driven` → `references/task-generator.md` (`task-writer-agent` bridge) |
| `ns-sdd-execution-handoff-generator` | `ns-spec-driven` → `references/execution-handoff.md` |
| `ns-execution-orchestrator` | `ns-spec-driven` → `references/orchestrator.md` |
| `ns-pm-unit-test-task-generator` | `ns-spec-driven` → `references/unit-test-task-generator.md` |
| `ns-pm-e2e-test-task-generator` | `ns-spec-driven` → `references/e2e-test-task-generator.md` |

Classic version execution loop moved to `ns-coder/references/run-implementation.md`.

**Consumer action:** reinstall via `npx @nextstage-brasil/harness` or `npx skills add nextstage-brasil/skills@ns-spec-driven`. Run `harness update` / `prune-retired-skills` to remove old directories.

## Remove `nsutil-mcp` from catalog (2026-08-14)

`nsutil-mcp` was not a skills-repo deliverable — NsUtil MCP is created in the application at use time. **No retired alias.** Remove any local `skills/nsutil-mcp/` install manually; reinstall without `--preset full` if it was the only reason that skill was present.

## New preset — `frontend-prototype` (2026-08-11)

Playwright-driven reverse prototyping without full SDD:

| Skill | Role |
| ----- | ---- |
| `ns-proto-creator` | Face — capture live UI, create or evolve one `prototype/` tree (git history, not `vN/` folders) |
| `ns-proto-visual-guide` | Normative appearance MDs (rename of `descricao-normativa-visual`) |
| `/ns-harness` reverse-spec | Business reverse from code (complementary) |
| `ns-living-spec` | **Appearance** mode (no Code Review gate) |
| `ns-frontend-design` / `ns-best-practices` | Design + quality (guidelines fetch fused into best-practices) |

Install: `npx @nextstage-brasil/harness --preset frontend-prototype --yes`.

## Rename — `descricao-normativa-visual` → `ns-proto-visual-guide` (2026-08-11)

Normative visual appearance skill joins the `ns-proto-*` family. Retired in `packages/harness/templates/retired-skills.json`. Source-of-truth paths cite `prototype/` (single tree).

## New skill — `ns-delivery-schedule` (2026-08-07)

Triple productivity delivery schedule: one markdown with PERT + Monte Carlo for productivity scenarios P100 (current h/FP), P85 (50% faster), P50 (85% faster). Section 0 commercial summary + calendar delivery dates. Persists under `docs/versions/{version_san}/pm/`. Reuses `ns-project-manager` `pert_montecarlo.py`. Presets `project-manager` and `full`. Depends on `ns-harness` + `ns-project-manager`.

## New skill — `ns-commercial-budget` (2026-08-03)

Client-facing commercial budget in **product voice** (PM/client — no fields/classes). Features + Function Points + hours (COSMIC CFP only when asked); macro-activity table; risk margins. Paths `{version_san}-commercial-budget-internal.md` (delivery) and optional `{version_san}-commercial-budget-costumer.md` (client export) under `docs/versions/{version_san}/pm/`; header Sequência + Gerado em. Custo (R$) only with rates. Loads reverse-spec/brownfield when present. Presets `project-manager` and `full`. Depends on `ns-harness`.

## Commercial budget artifact rename (2026-08-05)

| Old path | New path |
| -------- | -------- |
| `commercial-budget.md` | `commercial-budget-internal.md` |
| `commercial-budget-cliente.md` | `commercial-budget-costumer.md` |

Client header reference: `{version_san}-costumer`. Regenerate or rename existing version folders; do not use `commercial-budget-full-*` variants.

## Commercial budget version-prefixed filenames (2026-09-02)

Persisted basenames must include `{version_san}-` prefix:

| Old path (under `pm/`) | New path |
| ---------------------- | -------- |
| `commercial-budget-internal.md` | `{version_san}-commercial-budget-internal.md` |
| `commercial-budget-costumer.md` | `{version_san}-commercial-budget-costumer.md` |

Example: `docs/versions/orcamento-api-v1/pm/orcamento-api-v1-commercial-budget-internal.md`. Unprefixed copies: STOP gate via `pm-persist.md` — propose rename, do not silent-write.

## Rename — `ns-mcp-gitlab-usage` → `mcp-gitlab-usage` (2026-07-27)

GitLab MCP usage skill drops the `ns-` prefix (exception to the global `ns-` catalog convention). Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-execution-handoff-generator` → `ns-sdd-execution-handoff-generator` (2026-07-25)

Aligned with other SDD planning workers (`ns-sdd-*`). Bridge planning → implementation unchanged; only the skill id moved. Retired in `packages/harness/templates/retired-skills.json`.

## Rename — `ns-pm-e2e-test-generator` → `ns-pm-e2e-test-task-generator` (2026-07-25)

Aligned with sibling `ns-pm-unit-test-task-generator`: the `-task-` segment clarifies the skill produces planning task markdown, not Cypress code (that's `ns-e2e-tests`). Retired in `packages/harness/templates/retired-skills.json`.

## Breaking change — preset consolidation (2026-07-25)

Presets that bundled `ns-spec-driven` for a single add-on (`gitlab`, `implementation`, `complements`) produced near-duplicate, confusing skill lists (21-23 overlapping skills each) because `--preset` only accepts one value. Renamed and merged for clarity:

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `delivery` | `spec-driven` | Same skills, clearer name |
| `recommended` | *(removed)* | Was a dead alias of `delivery` |
| `gitlab` | `spec-driven-gitlab` | Name now signals it's additive on top of `spec-driven` |
| `implementation`, `complements`, `spec-driven-quality` | *(removed)* | Near-duplicates of `spec-driven`; install quality skills via `--skill` or `--preset full` |
| `project-manager`, `full`, `agents-api` | Unchanged | |
| `brownfield` | *(removed 2026-08-14)* | Use any delivery preset, then `/ns-harness prepare this repo` |

**Consumer action:** update any scripted `--preset delivery` / `--preset gitlab` / `--preset implementation` / `--preset complements` / `--preset recommended` / `--preset spec-driven-quality` calls. Use `spec-driven`, `spec-driven-gitlab`, `--skill …`, or `full`.

## Breaking change — preset flattening (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `implementation` | *(removed)* | Skills merged into `spec-driven` |
| `spec-driven-gitlab` | `gitlab` | Canonical name; `spec-driven-gitlab` kept as alias |
| `spec-driven` | `spec-driven` | Now includes `code/*`, `ns-living-spec`, and `ns-spec-driven` directly (no `extends`) |
| `frontend` | `frontend` | `ns-living-spec` moved to `spec-driven` only |

**Consumer action:** replace `--preset implementation` with `--preset spec-driven`. Prefer `--preset gitlab` over `--preset spec-driven-gitlab` (alias still works).

## Breaking change — remove full-experimental preset (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `full-experimental` | *(removed)* | Use `--preset agent-creator` (labs only) or `--preset full` |

**Consumer action:** replace `--preset full-experimental` with `--preset full` plus explicit `--skill` for labs if needed.

## Breaking change — merge `coder-langgraph` into `agents-api` (2026-08-14)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `coder-langgraph` | `agents-api` | Same NS coder/investigator/review/langgraph stack; `agents-api` also installs the full external set |

**Consumer action:** replace `--preset coder-langgraph` with `--preset agents-api`.

## Retired catalog skill — `ns-skill-creator` (2026-08-14)

| Old | Replacement |
| --- | ----------- |
| `ns-skill-creator` | Anthropics `skill-creator` ([anthropics/skills](https://github.com/anthropics/skills)) |

Path overrides and `harness sync` after authoring: `ns-harness` → `references/project-skill-authoring.md`.

**Consumer action:** install `skill-creator` (`npx skills add https://github.com/anthropics/skills --skill skill-creator -y`) or `npx @nextstage-brasil/harness --preset full --yes`. Run `harness update` to prune retired `ns-skill-creator` when `skill-creator` is present.

## Breaking change — merge `agent-creator` and `agents-api` into `agents` (2026-08-18)

| Old preset | New preset | Detail |
| ---------- | ---------- | ------ |
| `agent-creator` | `agents` | Same spec-driven + LangGraph labs; also installs LangChain/MCP/eval externals |
| `agents-api` | `agents` | Same externals + NS agent stack; also includes the full spec-driven set |

Aliases `agent-creator` and `agents-api` still resolve to `presets/agents.json`.

**Consumer action:** replace `--preset agent-creator` / `--preset agents-api` with `--preset agents`.

## Breaking change — domain prefix rename (2026-07)

Skills were renamed with domain prefixes (`pm-`, `code-`, `execution-`, `harness-`). Those mid-names are themselves retired in favor of the `ns-` names above; the table below is historical.

| Old name | Mid name (pre-`ns-`) |
| -------- | -------------------- |
| `clarify-requirements` | `pm-clarify-requirements` |
| `requirements-generator` | `pm-requirements-generator` |
| `analyze-consistency` | `pm-analyze-consistency` |
| `version-partitioner` | `pm-version-partitioner` |
| `task-generator` | `pm-task-generator` |
| `unit-test-task-generator` | `pm-unit-test-task-generator` |
| `e2e-test-generator` | `pm-e2e-test-generator` |
| `living-spec-consolidator` | `pm-living-spec-consolidator` |
| `create-e2e-tests` | `code-e2e-tests` |
| `create-backend-tests` | `code-backend-tests` |
| `execute-gitlab-issue` | `execution-gitlab-issue` |
| `agents-md-generator` | `harness-agents-md` |
| `architecture-rules-generator` | `harness-architecture-rules` |
| `bootstrap-brownfield` | `harness-bootstrap-brownfield` |
| `codebase-reverse-spec` | `harness-codebase-reverse-spec` |
| `frontend-design` | `code-frontend-design` |
| `docs-writer` | `code-docs-writer` |
| `best-practices` | `code-best-practices` |
