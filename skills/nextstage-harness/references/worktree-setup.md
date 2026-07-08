# Worktree setup (single tree, monorepo)

Canonical mechanics for isolating a run in a dedicated `git worktree`. Consumer skills (`execute-gitlab-issue`, `code-autonomous`) derive their own `{run_id}` and point here instead of duplicating the commands.

## Path

```
{product_root}/.worktrees/{run_id}/
```

One worktree, one branch, one MR (when applicable) per run — no per-project/per-repo looping in a monorepo.

## Commands

```bash
git fetch origin {SOURCE_BRANCH}

# REUSE_MODE = false (new branch)
git worktree add -b {WORK_BRANCH} "{WORKTREE_ROOT}" origin/{SOURCE_BRANCH}
git -C "{WORKTREE_ROOT}" push -u origin {WORK_BRANCH}

# REUSE_MODE = true (existing branch, checkout without recreating)
git fetch origin {WORK_BRANCH}
git worktree add "{WORKTREE_ROOT}" {WORK_BRANCH}
```

`REUSE_MODE = true` never force-pushes and never rewrites history — the branch and its remote already exist.

## Rules

- All coding happens inside `{WORKTREE_ROOT}`; never in the main checkout when concurrent work is possible.
- `.worktrees/` in `.gitignore` or `.git/info/exclude`.
- Abort if a worktree already exists for the same `{run_id}` and is in use by another run, unless this is an explicit resume.
- One worktree per run — do not create additional worktrees per subdirectory or per subagent; multi-agent dispatch (see `code-autonomous`) operates on disjoint file scopes inside the same worktree.

## `{run_id}` derivation (per consumer)

| Consumer            | `{run_id}`                          |
| -------------------- | ------------------------------------ |
| `execute-gitlab-issue` | `{ISSUE_ID}` (see its `references/worktree-setup.md` override) |
| `code-autonomous` standalone | `{version_san}` (see its `references/standalone-pipeline.md`) |

## Cleanup

After merge, remove the worktree with `git worktree remove` once a human confirms.
