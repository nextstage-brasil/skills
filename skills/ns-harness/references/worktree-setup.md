# Worktree setup (single tree)

Canonical isolation for one run. Consumers (`ns-execution-gitlab-issue`, `ns-autonomous`) own `{run_id}`; point here — do not duplicate commands.

## Path (mandatory)

```
.worktrees/{run_id}/
```

Always repo-relative under `.worktrees/`. Session boot (`session-boot.md`) first.

| Valid | Invalid |
| ----- | ------- |
| `.worktrees/{run_id}/` | Under `.cursor/` |
| Absolute form of same path | Cursor Task / best-of-n / agent-runtime "worktrees" |
| | OS temp as substitute |
| | Main checkout (non-worktree) |

Never invent path under `.cursor/`, `.cursor/worktrees/`, or Cursor agent sandbox. IDE runtime ≠ this isolation layer.

One worktree, one branch, one MR (when applicable) per run — no per-project/per-repo looping.

## Commands

From repo root. `mkdir -p .worktrees` first.

```bash
git fetch origin {SOURCE_BRANCH}

# REUSE_MODE = false (new branch)
git worktree add -b {WORK_BRANCH} ".worktrees/{run_id}" origin/{SOURCE_BRANCH}
git -C ".worktrees/{run_id}" push -u origin {WORK_BRANCH}

# REUSE_MODE = true (existing branch)
git fetch origin {WORK_BRANCH}
git worktree add ".worktrees/{run_id}" {WORK_BRANCH}
```

`REUSE_MODE = true`: never force-push, never rewrite history.

## Failure policy

`git worktree add` fails (permissions, sandbox, path conflict, missing remote):

1. **Abort** — exact error + path attempted.
2. **Do not** code in main checkout.
3. **Do not** retry under `.cursor/` or non-canonical path.
4. **Do not** stay on `main`/`master`/`SOURCE_BRANCH` "to make progress".
5. Ask human only for path/permission unlock — or explicit authorize work-in-place on current branch.

## Rules

- All coding inside `{WORKTREE_ROOT}`; never main checkout when concurrent work possible.
- `.worktrees/` in `.gitignore` or `.git/info/exclude`.
- Abort if worktree for same `{run_id}` already in use (unless explicit resume).
- One worktree per run — no extra trees per subdir/subagent; multi-agent (`ns-autonomous`) = disjoint scopes in same tree.

## `{run_id}` derivation

| Consumer | `{run_id}` |
| -------- | ---------- |
| `ns-execution-gitlab-issue` | `{ISSUE_ID}` (its `references/worktree-setup.md` override) |
| `ns-autonomous` standalone | `{version_san}` (`references/standalone-pipeline.md`) |

## Cleanup

After merge: `git worktree remove` once human confirms.
