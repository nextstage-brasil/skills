# Standalone pipeline (non-GitLab origin)

Full flow when this skill is the entry point — no `ns-execution-gitlab-issue` involved.

## 1. Resolve the descriptor

- Local plan file path, or pasted plan text. No MCP calls anywhere in this pipeline.
- Read it fully before deciding anything else.

## 2. Allocate the version

- Infer `change_kind` (`fix` or `feat`) from the descriptor.
- Allocate `{version_san}` (sanitized version id — see `../../../ns-harness/references/artifact-layout.md`).
- Create `docs/versions/{version_san}/sdd/` only if the planning-depth decision (`planning-decision.md`) calls for artifacts; a single-unit run doesn't need the folder.

## 3. Create the worktree

Follow `../../../ns-harness/references/worktree-setup.md` with:

```
{run_id} = {version_san}
WORKTREE_ROOT = .worktrees/{version_san}/
WORK_BRANCH = work/{version_san}
```

**Hard rules for this step:**

- Work inside the repo — never `.cursor` or any Cursor IDE folder.
- Use plain `git worktree add` into `.worktrees/{version_san}/` (mkdir parent if needed).
- Do **not** use Cursor Task / best-of-n / agent-runtime worktrees as a substitute.
- If `git worktree add` fails → **abort** with the exact error; do **not** continue in the main checkout.
- **Never** implement on `main`/`master` (or the base branch) as a workaround. That violates isolation even if a sandbox blocked the worktree.
- Exception only when the human **explicitly** said for this run: do not create a new branch / work in place on the current branch. Document that exception in the report.

### Preflight before any code write

From the shell about to edit files:

```bash
pwd                                          # must equal WORKTREE_ROOT (or be inside it)
git -C "{WORKTREE_ROOT}" rev-parse --abbrev-ref HEAD   # must equal WORK_BRANCH
git -C "{WORKTREE_ROOT}" rev-parse --show-toplevel     # must equal WORKTREE_ROOT
```

If any check fails → stop and report. Do not edit. Do not "proceed on main".

Resolve the base branch the same way `ns-execution-gitlab-issue`'s Gate 1 would (explicit in the descriptor, or ask once), including remote validation with `_` ↔ `-` alternates per `../../ns-execution-gitlab-issue/references/source-branch-resolution.md` — `main`/`master` are valid bases here since there's no issue-branch-resolution rule forcing otherwise, but confirm with the human if the descriptor doesn't state one. Abort if a worktree already exists for this `{version_san}` and is in use by another run, unless this is an explicit resume.

## 4. Plan, resolve doubts, dispatch

Identical logic to Engine mode:

- `planning-decision.md` for depth.
- `doubt-resolution.md` for doubts — destructive ones pause and ask **in chat only** (no GitLab actions available in this mode).
- `multi-agent-dispatch.md` for parallel/sequential dispatch and checkpoint commits.

## 5. Internal review loop

Follow `../../ns-reviewer/references/review-gate-workflow.md` (`Approved` = **10**; no second rubric).

- **MUST** `reviewer-agent` when available (else `ns-reviewer`) **version-closure mode** — bridge loads `AGENTS.md` then reviewer workflow — point at `docs/versions/{version_san}/sdd/` when exists, else worktree diff for single-unit run.
- Pass = `Approved` (score **= 10**). Score **9** = Lift (`Rejected`). Score ≤8 = Fail.
- Max 3 rounds:
  - Pass → closure.
  - Lift (**9**) or Fail (Criticals or ≤8) with rounds left → re-dispatch fix-loop toward **10**, tests if in scope, **mandatory re-review**.
  - Stop (`Blocked` or rounds exhausted) → report blocked. No success claim.

## 6. Report

To the human, include all **Final report** fields from `review-gate-workflow.md`, plus:

- `{version_san}` and worktree path.
- Commit(s) made (checkpoint commits, or a squashed one if the run chose to squash).
- Any follow-ups or unresolved suggestions from the review.

No GitLab board update, no MR — this pipeline is local-only for v1. The only exception: `docs/context/gitlab-sync-config.md` exists **and** the human explicitly asked for a merge request at closure; even then, this skill does not manage issue status or labels, only opens the MR.
