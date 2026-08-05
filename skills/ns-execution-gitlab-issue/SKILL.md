---
name: ns-execution-gitlab-issue
description: (NS) Execute a GitLab issue end-to-end — status gates, worktree isolation, atomic delivery, MR, mandatory review+fix loop. Use for ISSUE_URL or "implement this GitLab issue". Not for local ad-hoc coding (ns-code-coder) or non-GitLab autonomous runs (ns-code-autonomous). Delegates coding to ns-code-autonomous; needs mcp-gitlab-usage + ns-code-reviewer.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.3"
depends:
  - ns-harness
  - mcp-gitlab-usage
  - ns-code-reviewer
  - ns-code-autonomous
---

# Execute GitLab Issue

Entry priority **1** for GitLab `ISSUE_URL`. Owns GitLab issue state end to end — status, branch/worktree lifecycle, MR, comments, delivery, review gate. Delegates actual coding to the `ns-code-autonomous` engine (Phase 2). Full routing: `../ns-harness/references/code-skill-routing.md`.

## Routing (read first)

Entry priority **1**. Harness table: `../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

| Handoff | Target |
| ------- | ------ |
| Phase 2 execution | `ns-code-autonomous` (Engine mode) |
| MR / status / time / comments | `mcp-gitlab-usage` |
| Phase 4 review gate | `reviewer-agent` → `ns-code-reviewer` |
| Rejected fix loop | `ns-code-autonomous` → `C2` subagents (same worktree; no re-entry to this skill from `A`/`C2`) |

`G` remains the single GitLab lifecycle owner until delivery completes. Work units under `A` must not re-open this skill.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. **Complete Session boot (blocking)** there before any MCP call. Read `mcp-gitlab-usage` after Session boot.

## Inputs

| Variable         | Required                            |
| ---------------- | ----------------------------------- |
| `ISSUE_URL`      | Yes                                 |
| `SOURCE_BRANCH`  | No — resolved by Gate 1 if omitted  |
| `{product_root}` | When multiple products in workspace |

Single worktree, single branch, single MR, single commit per issue (monorepo model — no per-repo looping):

- `WORKTREE_ROOT = {product_root}/.worktrees/{ISSUE_ID}`
- `WORK_BRANCH = work/{ISSUE_ID}-{ISSUE_SLUG}`

## Phase 0 — Context (boot before MCP)

1. **Session boot (blocking)** — complete `../ns-harness/references/harness-discovery.md` before any MCP call.
2. Resolve `{product_root}` (factory: `apps/{slug}/`; standalone: repo root).
3. Ensure `.worktrees/` is gitignored (see `references/worktree-setup.md`).
4. Read `mcp-gitlab-usage` before the first MCP call.

## Phase 1 — Prepare

### First act (mandatory, before any gate)

Apply `status_in_progress` (Em andamento) to the issue via MCP. If this call fails, **abort immediately** and wait for human intervention — nothing below runs on an issue that isn't marked in progress.

### Gate 0 — Existing branch/MR reuse

An issue may already have a work branch (e.g. returned by a human reviewer). Detect it **before** Gate 1 so you never open a duplicate branch/MR:

1. `list_issue_merge_requests` — look for an open MR whose `source_branch` matches `work/{ISSUE_ID}-*`; record its `source_branch` and `target_branch`.
2. `git ls-remote --heads origin "work/{ISSUE_ID}-*"` as a second signal.
3. Found → `REUSE_MODE = true`, `WORK_BRANCH = {existing branch}`, `SOURCE_BRANCH = {existing MR target}`. Skip `WORK_BRANCH` derivation below and skip Gate 1 (only re-validate the branch still exists on the remote).
4. Not found → `REUSE_MODE = false`, proceed to Gate 1.

### Gate 1 — SOURCE_BRANCH (mandatory, blocking; skipped when `REUSE_MODE = true`)

Resolve `SOURCE_BRANCH` only via `references/source-branch-resolution.md` (priority order: human → issue text → product rule → milestone/version discovery → mandatory `develop` fallback).

- **Never** infer from the current checkout or ad hoc heuristics.
- **Never** auto-use any branch except a discovered version-relative `develop_*` / `develop-*` or the `develop` fallback — other bases (`homolog`, `release/*`, `main`, `master`, etc.) require explicit human confirmation this run.
- `main` / `master` are allowed as `SOURCE_BRANCH` **only** with express human authorization this run — never auto; issue text naming them alone is not enough (ask once).

After resolution, validate on the remote (fetch, `ls-remote`, `_` ↔ `-` alternates) per the same reference. When the mandatory `develop` fallback is missing on the remote → abort with the exact error; ask the operator once.

### Gate 1.5 — Single worktree (monorepo)

Create `WORKTREE_ROOT` per `references/worktree-setup.md` — always `{product_root}/.worktrees/{ISSUE_ID}`, never under `.cursor/`. Abort if a worktree already exists for this `ISSUE_ID` and is in use by another run, unless this is an explicit resume. Never implement in the main checkout or on `main`/`master`/`SOURCE_BRANCH`. If `git worktree add` fails → abort with the exact error (do not fall back to the main checkout "to keep going"). Isolation is a hard gate before Phase 2.

### MCP setup

- `due_date` if empty: current date + 5 business days.
- Do **not** set `START_TIME` here — wall-clock for spent time starts at Phase 2 (see `references/time-tracking.md`).

## Phase 2 — Execution (delegated)

1. Read the full issue payload via MCP (title, description, comments, attachments). Note `time_stats.time_estimate` for the estimate gate below.
2. Set `START_TIME` / `START_EPOCH` **now** (UTC + Unix epoch) — immediately before the first Engine invoke. See `references/time-tracking.md`.
3. Invoke the `ns-code-autonomous` skill in **Engine mode**, passing: issue payload, `{product_root}`, `WORKTREE_ROOT`, `WORK_BRANCH`, `SOURCE_BRANCH`. The engine self-decides planning depth, runs its doubt protocol, and dispatches implementation (single- or multi-agent) inside `WORKTREE_ROOT` — see `ns-code-autonomous`'s `references/routing.md` for what "Engine mode" means and what it returns.
4. **Estimate (first invocation only):** call `set_issue_estimate` **only if** `time_stats.time_estimate` is empty (`0` / missing) **and** the engine returned `estimate_seconds` ≥ 60. If an estimate already exists, or the engine value is < 60 — **skip**; never overwrite, never write a 1-second estimate. Full rules: `references/time-tracking.md`.
5. **Doubt escalation contract** — the engine never mutates GitLab state itself. When it returns a destructive-doubt event instead of (or alongside) unit results:
   - Record `PAUSE_START` epoch (exclude wait from spent time).
   - Apply `status_blocked` (Em Impedimento).
   - Post a comment **mentioning the issue author** (`@{author.username}` from `read_issue`) with the questions, options, and recommended default.
   - Mirror the same question in the interactive chat and wait.
   - On answer (chat and/or issue comment): add pause duration to `PAUSED_SECONDS`, set status back to `status_in_progress` (Em andamento), and re-invoke the engine with the resolved doubt appended to its context.
6. No intermediate confirmations otherwise — this loop is the only pause point until Phase 4's review gate.

## Phase 3 — Delivery

1. **Squash to one Conventional Commit** before push (`<type>(#{ISSUE_ID}): <imperative description in English>`, types: feat/fix/refactor/test/docs/chore). The engine may leave internal checkpoint commits per work unit in the worktree during Phase 2 — squash them here to preserve one-commit-per-delivery atomicity. See `../ns-harness/references/agent-git-identity.md` for attribution.
2. Push `WORK_BRANCH`.
3. Run Phase 4 (review gate). Do **not** set `END_TIME`, spent time, or Dev 100% until Phase 4 returns `Approved`.
4. **On `Approved` only — close the clock and board** (same instant):
   - Set `END_TIME` / `END_EPOCH` **now**.
   - `add_issue_spent_time` with `duration = ELAPSED_SECONDS` from `references/time-tracking.md` (epoch delta minus `PAUSED_SECONDS`). **Never** use `estimate_seconds` or any plan estimate as `duration`.
   - Status → `status_done` (Dev 100%).
   - Internal delivery comment (`internal: true`) using `references/delivery-report.template.md`.

## Phase 4 — Review gate (blocking, bounded fix loop)

Canonical rules: `../ns-harness/references/review-gate-workflow.md`.

1. Invoke **`reviewer-agent`** when available (else **`ns-code-reviewer`**) in **Issue review mode** (`ISSUE_URL`) only — bridge/skill loads `AGENTS.md` then reviewer workflow. Read-only official gate; posts the internal GitLab comment. **Forbidden:** Task subagents (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or any substitute unless the human explicitly requests it for this run. **Allowed:** harness `reviewer-agent`.
2. Loop, max **3** rounds:
   - `Approved` → return to Phase 3 step 4 (END + spent + Dev 100% + delivery comment).
   - `Rejected` with rounds remaining → re-invoke `ns-code-autonomous` (same worktree/branch) with the findings as a fix work unit, then **mandatory re-review** via `reviewer-agent` / `ns-code-reviewer`. Keep the original `START_TIME`; do not call spent/Dev 100% yet.
   - `Blocked`, or rounds exhausted → `status_blocked` (Em Impedimento), post the findings, stop. Do **not** set `END_TIME`, spent time, or Dev 100%.
3. Final output: `Fatto!` + `MR_URLS` + `Code Review: {verdict}` — exactly the verdict string `ns-code-reviewer` returned.

## Stop and ask the human

| Condition                                                 | Action                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| Gate 1: `develop` fallback missing on remote                  | Stop — ask once                                   |
| Gate 1: non-default base (`main`/`master`/`homolog`/…) without express human confirmation this run | Stop — ask once |
| Worktree conflict (same issue, another run)               | Stop unless explicit resume                       |
| Ambiguous or conflicting acceptance criteria              | Stop — ask once                                   |
| MCP unavailable or auth failure                           | Stop — state blocker                              |
| `project_id` trio not confirmed                           | Stop per `mcp-gitlab-usage`                       |
| Work on protected/base branch per `gitlab-sync-config.md` | Stop                                              |
| Destructive ops (issue delete, force-push main/master)    | Stop — require explicit human                     |
| Product decision not stated in the issue                  | Stop — ask once                                   |
| Engine reports a destructive doubt                        | Pause/resume per Phase 2 step 4 — not a hard stop |

See `mcp-gitlab-usage` for MCP tool contracts and confirmation gates.

## Related skills

| Skill               | Role                             |
| ------------------- | -------------------------------- |
| `mcp-gitlab-usage`  | All GitLab tools                 |
| `ns-gitlab-board-sync` | Status label semantics           |
| `ns-code-reviewer`     | Phase 4 gate (prefer `reviewer-agent`) |
| `ns-code-autonomous`   | Phase 2 execution engine         |
| `ns-code-coder`        | Non-GitLab ad-hoc implementation |

## References

| File                                     | When                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `references/source-branch-resolution.md` | Gate 1 — milestone/version discovery, `develop` fallback, remote validation |
| `references/worktree-setup.md`           | `ISSUE_ID` → `run_id` override (canonical mechanics in `ns-harness`) |
| `references/mr-conventions.md`           | MR title, draft, linking, reuse note                                        |
| `references/delivery-report.template.md` | Phase 3 internal delivery comment                                           |
| `references/time-tracking.md`            | Estimate fill-if-empty; spent-time wall-clock + pause rules                 |
