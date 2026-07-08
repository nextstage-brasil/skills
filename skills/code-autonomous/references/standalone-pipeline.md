# Standalone pipeline (non-GitLab origin)

Full flow when this skill is the entry point — no `execute-gitlab-issue` involved.

## 1. Resolve the descriptor

- Local plan file path, or pasted plan text. No MCP calls anywhere in this pipeline.
- Read it fully before deciding anything else.

## 2. Allocate the version

- Infer `change_kind` (`fix` or `feat`) from the descriptor.
- Allocate `{version_san}` (sanitized version id — see `../nextstage-harness/references/artifact-layout.md`).
- Create `{product_root}/docs/versions/{version_san}/` only if the planning-depth decision (`planning-decision.md`) calls for artifacts; a single-unit run doesn't need the folder.

## 3. Create the worktree

Follow `../nextstage-harness/references/worktree-setup.md` with:

```
{run_id} = {version_san}
WORKTREE_ROOT = {product_root}/.worktrees/{version_san}/
WORK_BRANCH = work/{version_san}
```

Resolve the base branch the same way `execute-gitlab-issue`'s Gate 1 would (explicit in the descriptor, or ask once) — `main`/`master` are valid bases here since there's no issue-branch-resolution rule forcing otherwise, but confirm with the human if the descriptor doesn't state one. Abort if a worktree already exists for this `{version_san}` and is in use by another run, unless this is an explicit resume.

## 4. Plan, resolve doubts, dispatch

Identical logic to Engine mode:

- `planning-decision.md` for depth.
- `doubt-resolution.md` for doubts — destructive ones pause and ask **in chat only** (no GitLab actions available in this mode).
- `multi-agent-dispatch.md` for parallel/sequential dispatch and checkpoint commits.

## 5. Internal review loop

- Invoke `code-reviewer` in **version-closure mode**, pointing at `{product_root}/docs/versions/{version_san}/` when it exists, or at the worktree diff directly for a single-unit run.
- Max 3 rounds:
  - `Approved` → proceed to closure.
  - `Rejected` with rounds left → re-run dispatch (`multi-agent-dispatch.md`'s fix-loop re-dispatch) for the findings, then re-review.
  - `Blocked`, or rounds exhausted → stop, report as blocked. Do not report success.

## 6. Report

To the human, report:

- `{version_san}` and worktree path.
- Commit(s) made (checkpoint commits, or a squashed one if the run chose to squash).
- Review verdict.
- Any follow-ups or unresolved suggestions from the review.

No GitLab board update, no MR — this pipeline is local-only for v1. The only exception: `docs/context/gitlab-sync-config.md` exists **and** the human explicitly asked for a merge request at closure; even then, this skill does not manage issue status or labels, only opens the MR.
