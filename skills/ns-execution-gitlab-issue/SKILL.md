---
name: ns-execution-gitlab-issue
description: (NS) Execute a GitLab issue end-to-end — status gates, worktree isolation, atomic delivery, MR, mandatory review+fix loop. Use for external ISSUE_URL or SDD delivery unit (unit + issue_iid). External mode delegates coding to ns-autonomous; SDD unit mode uses ns-coder run-implementation. Needs mcp-gitlab-usage + ns-reviewer.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.6"
depends:
  - ns-harness
  - mcp-gitlab-usage
  - ns-reviewer
  - ns-autonomous
  - ns-coder
---

# Execute GitLab Issue

Entry priority **1** for external GitLab `ISSUE_URL`. **SDD unit mode** (below) when `delivery-units.md` supplies `unit` + `issue_iid` — not an external URL. Full routing: `../../ns-harness/references/code-skill-routing.md`.

## Routing (read first)

Entry priority **1**. Harness table: `../../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`.

| Handoff | Target |
| ------- | ------ |
| Phase 2 execution (external) | `ns-autonomous` (Engine mode) |
| Phase 2 execution (SDD unit) | `../../ns-coder/references/run-implementation.md` (unit tasks only) |
| MR / status / time / comments | `mcp-gitlab-usage` |
| Phase 4 review gate | `reviewer-agent` → `ns-reviewer` |
| Rejected fix loop (external) | `ns-autonomous` → `C2` subagents (same worktree; no re-entry to this skill from `A`/`C2`) |
| Rejected fix loop (SDD unit) | `coder-agent` → `ns-coder` / `run-implementation` (same worktree; no `ns-autonomous`) |

`G` remains the single GitLab lifecycle owner until delivery completes. External work units under `A` must not re-open this skill. SDD unit Phase 2 uses `run-implementation.md` — not `A`.

## Session boot

See `../../ns-harness/references/session-boot.md`. **Complete Session boot (blocking)** there before any MCP call. Read `mcp-gitlab-usage` after Session boot.

## Inputs

| Variable         | Required                            |
| ---------------- | ----------------------------------- |
| `ISSUE_URL`      | Yes for **external** issue mode     |
| `unit` + `issue_iid` | Yes for **SDD unit mode** (from `delivery-units.md`) |
| `SOURCE_BRANCH`  | No — resolved by Gate 1 if omitted  |

**External issue mode** (priority 1 unchanged): single worktree, single branch, single MR, single commit per issue:

- `WORKTREE_ROOT = .worktrees/{ISSUE_ID}`
- `WORK_BRANCH = work/{ISSUE_ID}-{ISSUE_SLUG}`

**SDD unit mode** — when `ns-spec-driven` dispatches a published delivery unit:

- Input: `unit` id (e.g. `unit-001`) + `issue_iid` from `delivery-units.md` — **not** external `ISSUE_URL`
- `WORKTREE_ROOT = .worktrees/{unit}`
- `WORK_BRANCH = work/{unit}-{slug}` per `delivery-units.md` / `source-branch-resolution.md`
- `SOURCE_BRANCH` = version-resolved branch recorded in `delivery-units.md` header (Gate 1 uses same rules; skip re-discovery when header set)
- Phase 2 coding: `../../ns-coder/references/run-implementation.md` for **unit tasks only** — not `ns-autonomous` Engine
- Status/spent: this skill owns lifecycle (First act + Phase 3). Skip Flow D. Cite `../ns-spec-driven/references/delivery-units.md` **GitLab status/spent (SSoT)**
- `add_issue_spent_time` **once per unit** at Phase 3 (wall-clock) — not per task, not estimate sum

## Phase 0 — Context (boot before MCP)

1. **Session boot (blocking)** — complete `../../ns-harness/references/session-boot.md` before any MCP call.
2. Ensure `.worktrees/` is gitignored (see `references/worktree-setup.md`).
3. Read `mcp-gitlab-usage` before the first MCP call.
4. **Mode detect:** external `ISSUE_URL` → **external issue mode**. `unit` + `issue_iid` from `delivery-units.md` → **SDD unit mode** — set `WORKTREE_ROOT`, `WORK_BRANCH`, `ISSUE_ID` substitutes below.
5. **Incomplete acceptance (optional pre-step):** AC missing, conflicting, or too thin for autonomous coding → run `/ns-requirements-enricher` first. Do **not** start Phase 1 (no `status_in_progress`, no coding) until enricher done or human explicitly skips.

## Phase 1 — Prepare

### First act (mandatory, before any gate)

Apply `status_in_progress` (Em andamento) to the issue via MCP. If this call fails, **abort immediately** and wait for human intervention — nothing below runs on an issue that isn't marked in progress.

### Gate 0 — Existing branch/MR reuse

An issue may already have a work branch (e.g. returned by a human reviewer). Detect it **before** Gate 1 so you never open a duplicate branch/MR:

**External issue mode:**

1. `list_issue_merge_requests` — look for an open MR whose `source_branch` matches `work/{ISSUE_ID}-*`; record its `source_branch` and `target_branch`.
2. `git ls-remote --heads origin "work/{ISSUE_ID}-*"` as a second signal.

**SDD unit mode:**

1. `list_issue_merge_requests` — open MR with `source_branch` matching `work/{unit}-*`.
2. `git ls-remote --heads origin "work/{unit}-*"`.
3. `mr_url` in `delivery-units.md` row when present — prefer reuse.

**Both modes (reuse decision):**

4. Found → `REUSE_MODE = true`, `WORK_BRANCH = {existing branch}`, `SOURCE_BRANCH = {existing MR target}`. Skip `WORK_BRANCH` derivation below and skip Gate 1 (only re-validate the branch still exists on the remote).
5. Not found → `REUSE_MODE = false`, proceed to Gate 1.

### Gate 1 — SOURCE_BRANCH (mandatory, blocking; skipped when `REUSE_MODE = true`)

**SDD unit mode:** when `delivery-units.md` header already records `SOURCE_BRANCH`, use it — do not re-run discovery unless human overrides this run.

**External issue mode:** resolve only via `references/source-branch-resolution.md` (priority order: human → issue text → product rule → milestone/version discovery → mandatory `develop` fallback).

- **Never** infer from the current checkout or ad hoc heuristics.
- **Never** auto-use any branch except a discovered version-relative `develop_*` / `develop-*` or the `develop` fallback — other bases (`homolog`, `release/*`, `main`, `master`, etc.) require explicit human confirmation this run.
- `main` / `master` are allowed as `SOURCE_BRANCH` **only** with express human authorization this run — never auto; issue text naming them alone is not enough (ask once).

After resolution, validate on the remote (fetch, `ls-remote`, `_` ↔ `-` alternates) per the same reference. When the mandatory `develop` fallback is missing on the remote → abort with the exact error; ask the operator once.

### Gate 1.5 — Single worktree (monorepo)

Create `WORKTREE_ROOT` per `references/worktree-setup.md`:

- **External issue mode:** `.worktrees/{ISSUE_ID}`
- **SDD unit mode:** `.worktrees/{unit}`

Never under `.cursor/`. Abort if a worktree already exists for this id and is in use by another run, unless explicit resume. Never implement in main checkout or on `main`/`master`/`SOURCE_BRANCH`. If `git worktree add` fails → abort with exact error (no main-checkout fallback). Isolation is hard gate before Phase 2.

### MCP setup

- `due_date` if empty: current date + 5 business days.
- Do **not** set `START_TIME` here — wall-clock for spent time starts at Phase 2 (see `references/time-tracking.md`).

## Phase 2 — Execution (delegated)

### External issue mode

1. Read the full issue payload via MCP (title, description, comments, attachments). Note `time_stats.time_estimate` for the estimate gate below.
2. Set `START_TIME` / `START_EPOCH` **now** (UTC + Unix epoch) — immediately before the first Engine invoke. See `references/time-tracking.md`.
3. Invoke the `ns-autonomous` skill in **Engine mode**, passing: issue payload, `WORKTREE_ROOT`, `WORK_BRANCH`, `SOURCE_BRANCH`. The engine self-decides planning depth, runs its doubt protocol, and dispatches implementation (single- or multi-agent) inside `WORKTREE_ROOT` — see `ns-autonomous`'s `references/routing.md` for what "Engine mode" means and what it returns.
4. **Estimate (first invocation only):** call `set_issue_estimate` **only if** `time_stats.time_estimate` is empty (`0` / missing) **and** the engine returned `estimate_seconds` ≥ 60. If an estimate already exists, or the engine value is < 60 — **skip**; never overwrite, never write a 1-second estimate. Full rules: `references/time-tracking.md`.
5. **Doubt escalation contract** — the engine never mutates GitLab state itself. When it returns a destructive-doubt event instead of (or alongside) unit results:
   - Record `PAUSE_START` epoch (exclude wait from spent time).
   - Apply `status_blocked` (Em Impedimento).
   - Post a comment **mentioning the issue author** (`@{author.username}` from `read_issue`) with the questions, options, and recommended default.
   - Mirror the same question in the interactive chat and wait.
   - On answer (chat and/or issue comment): add pause duration to `PAUSED_SECONDS`, set status back to `status_in_progress` (Em andamento), and re-invoke the engine with the resolved doubt appended to its context.
6. No intermediate confirmations otherwise — this loop is the only pause point until Phase 4's review gate.

### SDD unit mode

1. `read_issue` for `issue_iid` — execution + review checklists in description.
2. Set `START_TIME` / `START_EPOCH` before first task in unit.
3. Run `../../ns-coder/references/run-implementation.md` scoped to **unit tasks** inside `WORKTREE_ROOT` — handoff rows stay per task; **no Flow D** here (G owns status/spent).
4. Skip `ns-autonomous` Engine. Skip per-task `add_issue_spent_time`.
5. Estimate at publish time = sum of task estimates (`delivery-units.md` `estimate_sum`) — do not re-estimate per task.

## Phase 3 — Delivery

1. **Squash to one Conventional Commit** before push (`<type>(#{issue_iid}): <imperative description in English>`, types: feat/fix/refactor/test/docs/chore). External mode may use `ISSUE_ID` in message when that is the issue identifier. Squash internal checkpoint commits to preserve one-commit-per-delivery atomicity. See `../../ns-harness/references/agent-git-identity.md` for attribution.
2. Push `WORK_BRANCH`.
3. Run Phase 4 (review gate). Do **not** set `END_TIME`, spent time, or Dev 100% until Phase 4 returns `Approved`.
4. **On `Approved` only — close the clock and board** (same instant):
   - Set `END_TIME` / `END_EPOCH` **now**.
   - `add_issue_spent_time` with `duration = ELAPSED_SECONDS` from `references/time-tracking.md` (epoch delta minus `PAUSED_SECONDS`). **Never** use `estimate_seconds` or any plan estimate as `duration`. **Single spent owner** when this skill runs full lifecycle — set `spent_posted` = `yes` on `delivery-units.md` row; Flow D must not double-post.
   - Status → `status_done` (Dev 100%).
   - Internal delivery comment (`internal: true`) using `references/delivery-report.template.md`.

## Phase 4 — Review gate (blocking, bounded fix loop)

Canonical rules: `../ns-reviewer/references/review-gate-workflow.md`.

1. **MUST** invoke **`reviewer-agent`** when available (else **`ns-reviewer`**) in **Issue review mode** — pass `ISSUE_URL` **or** `project_id` + `issue_iid` (SDD unit mode). Bridge/skill loads `AGENTS.md` then reviewer workflow. Read-only official gate; posts internal GitLab comment. **Forbidden:** Task subagents (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) or substitute unless human explicitly requests this run. **Allowed:** harness `reviewer-agent`. See `../../ns-harness/references/subagent-dispatch.md`.
2. Loop, max **3** rounds (`review-gate-workflow.md`; `Approved` = **10**):
   - `Approved` → Phase 3 step 4 (END + spent + Dev 100% + delivery comment).
   - `Rejected` (score **9** = Lift; or Criticals / score ≤8) with rounds left → **external:** re-invoke `ns-autonomous` (same worktree) with findings as fix unit. **SDD unit:** re-invoke `coder-agent` / `run-implementation` (same worktree). **Mandatory re-review** via `reviewer-agent` (**MUST** when available; else `ns-reviewer`). Keep `START_TIME`; no spent/Dev 100% yet.
   - `Blocked` or rounds exhausted → `status_blocked` (Em Impedimento), post findings, stop. No `END_TIME`, spent, or Dev 100%.
3. Final output: `Fatto!` + `MR_URLS` + `Code Review: {verdict}` — exactly the verdict string `ns-reviewer` returned.

## Stop and ask the human

| Condition                                                 | Action                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| Gate 1: `develop` fallback missing on remote                  | Stop — ask once                                   |
| Gate 1: non-default base (`main`/`master`/`homolog`/…) without express human confirmation this run | Stop — ask once |
| Worktree conflict (same issue, another run)               | Stop unless explicit resume                       |
| Ambiguous or conflicting acceptance criteria              | Stop — `/ns-requirements-enricher` first; do not start Phase 1 coding |
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
| `/ns-requirements-enricher` | Optional pre-step when AC incomplete — before Phase 1 |
| `mcp-gitlab-usage`  | All GitLab tools                 |
| `ns-gitlab-board-sync` | Status label semantics           |
| `ns-reviewer`     | Phase 4 gate (**MUST** `reviewer-agent` when available) |
| `ns-autonomous`   | Phase 2 execution engine         |
| `ns-coder`        | SDD unit mode coding; non-GitLab ad-hoc |

## References

| File                                     | When                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `references/source-branch-resolution.md` | Gate 1 — milestone/version discovery, `develop` fallback, remote validation |
| `references/worktree-setup.md`           | `ISSUE_ID` → `run_id` override (canonical mechanics in `ns-harness`) |
| `references/mr-conventions.md`           | MR title, draft, linking, reuse note                                        |
| `references/delivery-report.template.md` | Phase 3 internal delivery comment                                           |
| `references/time-tracking.md`            | Estimate fill-if-empty; spent-time wall-clock + pause rules                 |
