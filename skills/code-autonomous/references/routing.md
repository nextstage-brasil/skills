# Routing: issue vs. standalone

## Decision

Ask once, first thing: **is the origin a GitLab issue?**

- Yes (`ISSUE_URL`, an issue reference like `#123`, or the invoker states it is executing an issue) → `execution-gitlab-issue` owns the flow. If you were invoked directly with an issue origin and no caller context, redirect to `execution-gitlab-issue` instead of proceeding — don't touch GitLab state yourself.
- No (local `.plan.md` path, pasted plan text, ad-hoc "implement this autonomously" request) → run the standalone pipeline in this skill, start to finish.

This mirrors the single entry point used across the catalog: whoever the human invokes, the GitLab-origin check happens before any worktree or branch decision.

## Engine mode contract (when called by `execution-gitlab-issue`)

### Inputs the caller guarantees

- Full issue payload (title, description, comments, attachments).
- `{product_root}`.
- `WORKTREE_ROOT` and `WORK_BRANCH` — already created and checked out; the engine does not run `git worktree add` in this mode.
- `SOURCE_BRANCH` — already validated to exist on the remote.
- On fix-loop re-invocations: reviewer findings as free text.

### What the engine must never do in this mode

- Call any GitLab-mutating MCP tool (status labels, comments, MR creation, spent time). Those belong to `execution-gitlab-issue`.
- Create or remove worktrees/branches.
- Ask a question directly in chat for a destructive doubt — return the escalation event instead (see `doubt-resolution.md`); the caller owns the human-facing side of that gate.

### What the engine returns

A structured result the caller can act on without re-deriving anything:

- `units`: list of `{ id, status: done|blocked, files_changed, commit_sha? }`.
- `doubt`: `null`, or `{ questions, options, recommended_default, blocked_unit_ids }` when a destructive doubt paused dispatch.
- `estimate_seconds`: only on the first invocation for a given issue — the caller forwards this to `set_issue_estimate` and does not ask again on fix-loop re-invocations.

If `doubt` is non-null, treat the invocation as partially complete — whatever units didn't depend on the doubt still finish and report `done`.

## Standalone entry conditions

Any of these, with no issue in play:

- A local plan file path (e.g. a `.plan.md`, `execution-handoff.md`, or ad-hoc markdown) is provided.
- The human pastes plan text directly and asks for autonomous execution.
- The human asks for autonomous multi-step implementation without pointing at an existing SDD version's `execution-handoff.md` (that case belongs to `execution-orchestrator` instead — redirect if you detect it).

In standalone mode this skill is the only owner of the run: no `execution-gitlab-issue` phases apply, and GitLab is out of scope unless `docs/context/gitlab-sync-config.md` exists and the human explicitly asks for an MR at closure.
