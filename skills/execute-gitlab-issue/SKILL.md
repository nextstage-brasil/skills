---
name: execute-gitlab-issue
description: (NS) Execute a GitLab issue end-to-end — first-act status, branch-reuse and source-branch gates, single-worktree isolation, atomic delivery, MR lifecycle, mandatory code review gate with bounded fix loop. Use when the user provides a GitLab ISSUE_URL or asks to implement a GitLab issue directly — not for local-only ad-hoc coding (use code-coder) or non-GitLab autonomous runs (use code-autonomous standalone). Delegates actual coding to the code-autonomous engine. Requires mcp-gitlab-usage for MCP and code-reviewer for the review gate.
depends:
  - nextstage-harness
  - mcp-gitlab-usage
  - code-reviewer
  - code-autonomous
---

# Execute GitLab Issue

Owns GitLab issue state end to end — status, branch/worktree lifecycle, MR, comments, delivery, review gate. Delegates actual coding to the `code-autonomous` engine (Phase 2).

## Harness discovery

See `../nextstage-harness/references/harness-discovery.md`. Read `mcp-gitlab-usage` before MCP calls.

## Inputs

| Variable         | Required                            |
| ---------------- | ----------------------------------- |
| `ISSUE_URL`      | Yes                                 |
| `SOURCE_BRANCH`  | No — resolved by Gate 1 if omitted  |
| `{product_root}` | When multiple products in workspace |

Single worktree, single branch, single MR, single commit per issue (monorepo model — no per-repo looping):

- `WORKTREE_ROOT = {product_root}/.worktrees/{ISSUE_ID}`
- `WORK_BRANCH = work/{ISSUE_ID}-{ISSUE_SLUG}`

## Phase 0 — Context

1. Resolve `{product_root}` (factory: `apps/{slug}/`; standalone: repo root).
2. Load product context: follow **Implementation boot rule** in `../nextstage-harness/references/artifact-layout.md`.
3. Ensure `.worktrees/` is gitignored (see `references/worktree-setup.md`).

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

`SOURCE_BRANCH` is never inferred ad hoc. It is valid only when:

1. **Product branch-resolution rule** — apply `{harness_root}/rules/branch-resolution.md` when the harness defines one; a resolved branch is pre-confirmed.
2. **Explicit in the issue** — the source branch is stated textually and unambiguously in the issue title/description/comments; record the source (field + exact excerpt).
3. **Explicit human confirmation** — the human names/confirms the branch in this run.

`main`/`master` are always invalid, no exceptions — reject even if named explicitly. Never default to the currently checked-out branch.

After resolution, validate on the remote per `references/source-branch-resolution.md`:

1. `git fetch origin`
2. Confirm the branch exists with `git ls-remote --exit-code --heads origin {SOURCE_BRANCH}`.
3. When the exact name is missing, try `_` ↔ `-` alternates (e.g. `develop_1.32` ↔ `develop-1.32`) and adopt the **exact name** returned by the remote.
4. Still missing → abort with theexact error; do not create the branch or substitute another.

### Gate 1.5 — Single worktree (monorepo)

Create `WORKTREE_ROOT` per `references/worktree-setup.md` — always `{product_root}/.worktrees/{ISSUE_ID}`, never under `.cursor/`. Abort if a worktree already exists for this `ISSUE_ID` and is in use by another run, unless this is an explicit resume. Never implement in the main checkout or on `main`/`master`/`SOURCE_BRANCH`. If `git worktree add` fails → abort with the exact error (do not fall back to the main checkout "to keep going"). Isolation is a hard gate before Phase 2.

### MCP setup

- `due_date` if empty: current date + 5 business days.
- `START_TIME` = ISO 8601 UTC timestamp.
- `set_issue_estimate` once the `code-autonomous` engine returns a plan-based estimate (Phase 2, step 2).

## Phase 2 — Execution (delegated)

1. Read the full issue payload via MCP (title, description, comments, attachments).
2. Invoke the `code-autonomous` skill in **Engine mode**, passing: issue payload, `{product_root}`, `WORKTREE_ROOT`, `WORK_BRANCH`, `SOURCE_BRANCH`. The engine self-decides planning depth, runs its doubt protocol, and dispatches implementation (single- or multi-agent) inside `WORKTREE_ROOT` — see `code-autonomous`'s `references/routing.md` for what "Engine mode" means and what it returns.
3. Call `set_issue_estimate` with the estimate the engine returns on its first invocation.
4. **Doubt escalation contract** — the engine never mutates GitLab state itself. When it returns a destructive-doubt event instead of (or alongside) unit results:
   - Apply `status_blocked` (Em Impedimento).
   - Post a comment **mentioning the issue author** (`@{author.username}` from `read_issue`) with the questions, options, and recommended default.
   - Mirror the same question in the interactive chat and wait.
   - On answer (chat and/or issue comment): record it, set status back to `status_in_progress` (Em andamento), and re-invoke the engine with the resolved doubt appended to its context.
5. No intermediate confirmations otherwise — this loop is the only pause point until Phase 4's review gate.

## Phase 3 — Delivery

1. **Squash to one Conventional Commit** before push (`<type>(#{ISSUE_ID}): <imperative description in English>`, types: feat/fix/refactor/test/docs/chore). The engine may leave internal checkpoint commits per work unit in the worktree during Phase 2 — squash them here to preserve one-commit-per-delivery atomicity. See `../nextstage-harness/references/agent-git-identity.md` for attribution.
2. Push `WORK_BRANCH`.
3. `add_issue_spent_time` (`ELAPSED_SECONDS = max(1, ceil(END_TIME - START_TIME))`).
4. Status → `status_done` (Dev 100%) only after Phase 4 returns `Approved` — never before.
5. Internal delivery comment (`internal: true`) using `references/delivery-report.template.md`.

## Phase 4 — Review gate (blocking, bounded fix loop)

1. Invoke `code-reviewer` in **Issue review mode** (`ISSUE_URL`) — read-only, official gate, posts the internal GitLab comment.
2. Loop, max **3** rounds:
   - `Approved` → proceed to Phase 3's status/comment closure (Dev 100%).
   - `Rejected` with rounds remaining → re-invoke `code-autonomous` (same worktree/branch) with the findings as a fix work unit, then re-review.
   - `Blocked`, or rounds exhausted → `status_blocked` (Em Impedimento), post the findings, stop. Do **not** reach Dev 100%.
3. Final output: `Fatto!` + `MR_URLS` + `Code Review: {verdict}` — exactly the verdict string `code-reviewer` returned.

## Stop and ask the human

| Condition                                                 | Action                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| Gate 1: `SOURCE_BRANCH` missing/invalid after fetch       | Stop — ask once                                   |
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
| `gitlab-board-sync` | Status label semantics           |
| `code-reviewer`     | Phase 4 gate                     |
| `code-autonomous`   | Phase 2 execution engine         |
| `code-coder`        | Non-GitLab ad-hoc implementation |

## References

| File                                     | When                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `references/source-branch-resolution.md` | Gate 1 — remote branch validation (`_` / `-`)                               |
| `references/worktree-setup.md`           | `ISSUE_ID` → `run_id` override (canonical mechanics in `nextstage-harness`) |
| `references/mr-conventions.md`           | MR title, draft, linking, reuse note                                        |
| `references/delivery-report.template.md` | Phase 3 internal delivery comment                                           |
