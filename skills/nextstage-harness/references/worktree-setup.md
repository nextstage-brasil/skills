# Worktree setup (single tree, monorepo)

Canonical mechanics for isolating a run in a dedicated `git worktree`. Consumer skills (`execute-gitlab-issue`, `code-autonomous`) derive their own `{run_id}` and point here instead of duplicating the commands.

## Path (mandatory)

```
{product_root}/.worktrees/{run_id}/
```

Resolve `{product_root}` first (repo root / product folder — see `harness-discovery.md`). The worktree path is **always** under that product root.

| Valid | Invalid |
| ----- | ------- |
| `{product_root}/.worktrees/{run_id}/` | Anywhere under `.cursor/` |
| Absolute form of the same path | Cursor Task / best-of-n / agent-runtime "worktrees" |
| | OS temp dirs used as a substitute |
| | Main checkout of `{product_root}` |

Never invent a path under `.cursor/`, `.cursor/worktrees/`, or the Cursor agent sandbox. Those are IDE-runtime locations — not this skill's isolation layer.

One worktree, one branch, one MR (when applicable) per run — no per-project/per-repo looping in a monorepo.

## Commands

Run from `{product_root}` (or pass absolute paths). Ensure `.worktrees/` exists as a directory first if needed (`mkdir -p "{product_root}/.worktrees"`).

```bash
git -C "{product_root}" fetch origin {SOURCE_BRANCH}

# REUSE_MODE = false (new branch)
git -C "{product_root}" worktree add -b {WORK_BRANCH} "{product_root}/.worktrees/{run_id}" origin/{SOURCE_BRANCH}
git -C "{product_root}/.worktrees/{run_id}" push -u origin {WORK_BRANCH}

# REUSE_MODE = true (existing branch, checkout without recreating)
git -C "{product_root}" fetch origin {WORK_BRANCH}
git -C "{product_root}" worktree add "{product_root}/.worktrees/{run_id}" {WORK_BRANCH}
```

`REUSE_MODE = true` never force-pushes and never rewrites history — the branch and its remote already exist.

## Failure policy

If `git worktree add` fails (permissions, sandbox, path conflict, missing remote branch):

1. **Abort** — report the exact error and path attempted.
2. **Do not** fall back to coding in the main checkout.
3. **Do not** retry under `.cursor/` or any other non-canonical path.
4. **Do not** switch to / stay on `main`/`master`/`SOURCE_BRANCH` and continue implementation "to make progress". That is a policy violation, not an alternative isolation strategy.
5. Ask the human only if the failure is a path/permission decision they can unlock — or if they explicitly authorize working in place on the current branch for this run.

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
