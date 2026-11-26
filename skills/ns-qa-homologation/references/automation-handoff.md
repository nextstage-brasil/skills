# Q8 Automation (L3)

Effective L3 only. After Q7b, before Q9 (D51): MR opens without human approval; its link feeds Q9 preview. Input: `plan.yml` `automate: true`. Output: E2E branch + MR, `run.json` `automation`. Guard `scripts/qa_automation.py` executes nothing: prints argv (no shell), agent runs them. Exit 0/2/3 like every gate script. Profile keys: `profile-schema-execution.md`.

## Steps

All subcommands: `--run-dir <run_dir> --profile docs/context/qa-profile.md [--repo .]`.

| # | Subcommand | Agent then |
| - | ---------- | ---------- |
| 1 | `plan [--title "<dev issue title>"]` | Skip → `run.json` Q8 `skipped` (note = reason) → Q9. Else run `argv` (fetch base, `switch -c` branch from `<remote>/<base>`) |
| 2 | Author specs (below) in run-owned E2E worktree | — |
| 3 | `specs --spec <path>...` (relative to worktree; in-repo layout: under `<e2e_root>/`, e.g. `e2e-tests/cypress/e2e/x.cy.js`) | Re-run after any spec edit: new spec set, stability restarts |
| 4 | Runner run → `<run_dir>/automation/run-<k>.xml`; `record-run --junit automation/run-<k>.xml` | Repeat until `stability.stable`; each report must differ in content (comments/whitespace ignored) |
| 5 | `lint_e2e_antipatterns.py` + reviewer (below); `record-review --verdict <V> --score <S>` | Rejected → fix → step 3 |
| 6 | `commit --subject "<text in commit_language>"` | Run `argv` (`add`, `commit -- <specs>`) |
| 7 | `record-commit --sha <git rev-parse HEAD>` | Run push `argv` |
| 8 | `record-push` | MCP MR (below) |
| 9 | `record-mr --iid <n> --url <web_url>` | `run.json` Q8 `passed`, `phase: Q8` → Q9 |

`status` = read-only state + next step (resume).

## Candidates + no-op

Selected = `automate: true` ∧ lane `runner` ∧ `existing` empty ∧ ledger status `pass`. Others → `excluded[]` with reason. Nothing selected → `skip_reason` recorded by `plan` = justified no-op:

| Case | Reason |
| ---- | ------ |
| `runner: none` | no runner |
| no `automate: true` | nothing marked |
| all marked excluded | browser lane, existing coverage reused, scenario not passing (defect specs never committed) |

Q8 `skipped` valid only when `skip_reason` + `excluded` equal the recomputation from `plan.yml` (pinned by Q7b `plan_sha256`) + ledger: Q9 preview and Q10 success refuse a hand-written reason (`--check-run` checks the shape only). Any other blocker → stall, never skip.

## Authoring (D34)

| `execution.e2e_authoring` | Author with |
| ------------------------- | ----------- |
| `auto` | E2E repo own skills (via its `AGENTS.md`) when present; else `ns-e2e-tests` |
| `repo-local` | E2E repo own skills; none → stall |
| `ns-e2e-tests` | `ns-e2e-tests` homologation mode (`runner: playwright` → its `playwright-architecture.md`) |

Outside homologation nothing changes. Q6 specs in worktree reused. Tags `@S-n` + `@AC-n` in title. Never weaken assertion, add retries, fixed wait, `force`.

Worktree: exactly one `run.json` resource `kind: worktree`, `via: agent`, `repo_root = execution.e2e_root` (Q6) or `repo_root = .` when `e2e_root` is a folder of the product repo (monorepo layout: `id` relative to the project root, `git -C . worktree add .worktrees/qa-<run_id>-e2e`; both layouts registered = refused); on disk a linked git worktree (regular `.git` file, no symlink). Emitted `git -C` path is absolute. None (Q6 reused every spec) → `git -C <e2e_root> worktree add .worktrees/qa-<run_id>-e2e`, register (`created_by_phase: Q8`), `--check-run`, then `plan`.

## Stability

Runner retries 0 on CLI (Cypress `--config retries=0`, Playwright `--retries=0`); one JUnit file per explicit run; never merged into ledger (verdict + judge stay pinned). Window = trailing runs on current spec set (sha256 of every declared spec). Stable = ≥ `execution.stability_runs` (min 2) runs, all green (every automated scenario `pass`, no failing test case). Red run in window (pass → fail → pass unchanged = flaky) blocks until specs change. Same report path or content twice → refused.

## Review gate (ADR-18)

1. Lint: `python3 scripts/lint_e2e_antipatterns.py --root <worktree> [--forbid-spec-intercepts] <spec>...` (exit 0 clean, 2 findings, 3 bad input). Flag from profile `execution.e2e_lint.forbid_spec_intercepts`. E2E repo checkout (`e2e_root`; in-repo layout: `<e2e_root>/.e2e-antipatterns.json`, worktree copy at the same relative path) `.e2e-antipatterns.json` overrides rules (`version`, `disable`, `forbidden_selectors`, `forbid_spec_intercepts`); Q8 never creates or edits it; a differing worktree copy → `record-review` refused; config sha256 recorded. Spec-only rules (`raw-selector`, `spec-intercept`, `cypress-env`, `focused-or-skipped`) lint spec files only (`*.cy.*`, `*.spec.*`, `*.test.*`); support/page objects/fixtures get `fixed-wait`, `force-action`, `uncaught-exception`. `record-review` re-runs lint in-process; findings + enforced rules recorded, rules disclosed in MR description.
2. Reviewer = profile `policy.e2e_reviewer`: `ns-reviewer` → mode `e2e-spec` (`../../ns-reviewer/references/e2e-spec-review.md`), in-session, given specs + lint JSON; project agent name → that agent.
3. max 3 rounds. Approved only at score 10 with 0 lint findings, on current spec set; 4th round refused → stall. `Blocked` → stall.

## Git (D39)

| Rule | Detail |
| ---- | ------ |
| Branch | `e2e_git.branch_pattern` (`{iid}` `{run_id}` `{slug}` from `--title`, ASCII, ≤40) from `e2e_git.base_branch`; strict charset, no `..`, no leading `-`; ≠ base, ∉ `protected_branches` |
| Commit | `<commit_prefix> <subject>` (no `@mention`; `commit` binds the spec set: `specs` afterwards resets it, `record-commit` verifies it) + `Related to <dev issue>`; subject in `commit_language` (target repo convention; overrides catalog English there only); only declared specs (`git commit -- <specs>`) |
| Author | `--author` when `AGENT_GIT_AUTHOR_NAME` + `AGENT_GIT_AUTHOR_EMAIL` set (`../../ns-harness/references/agent-git-identity.md`) |
| Push | `git -C <worktree> push --set-upstream <remote> refs/heads/<branch>:refs/heads/<branch>` only |
| Never | merge, `--force*`, `--no-verify`, `--amend`, delete refspec, push base/protected, rewrite pushed commit |

Executor dev branch gate (`ns-execution-gitlab-issue`) not used here.

## MR (ADR-20)

`record-push` writes `<run_dir>/automation/mr.md`: run marker `<!-- ns-qa:run=<run_id>;kind=e2e -->`, title, scenario → AC table, specs, stability, review, exactly one `Related to <dev issue>`. Validated before MCP:

1. `list_merge_requests` (`source_branch` = branch). MR description with marker → `record-mr` with it (resume; never duplicate).
2. Else `create_merge_request`: project = E2E repo remote (MCP project discovery), source = branch, target = base, title + description exactly as returned.
3. `record-mr`: refused if `mr.md` edited. MCP has no MR edit: description wrong later → `tracker.mr_edit: glab` → `glab mr update <iid> --description <mr.md>` (argv), else report pending.

MR never merged by agent. Remote branch + MR never deleted (Q10).

## Resume

`run.json` `automation` = state. `status` → next step. Commit recorded → spec set, runs, reviews final.
