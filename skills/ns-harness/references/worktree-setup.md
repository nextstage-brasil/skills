# Worktree setup (single tree)

Canonical isolation for one run. Consumers (`ns-execution-gitlab-issue`, `ns-autonomous`) own `{run_id}`; point here — do not duplicate commands.

## Path (mandatory)

```
.worktrees/{run_id}/
```

Default: repo-relative under `.worktrees/`. Exception: Step 0 reuse of pre-existing linked worktree. Session boot (`session-boot.md`) first.

| Valid | Invalid |
| ----- | ------- |
| `.worktrees/{run_id}/` | Under `.cursor/` or `.claude/` (e.g. `.claude/worktrees/`) |
| Absolute form of same path | IDE/agent-runtime sandbox trees (best-of-n, ephemeral task trees, host-created agent worktrees) |
| Pre-existing linked worktree of same repo passing Step 0 reuse | OS temp as substitute |
| | Main checkout (non-worktree) |

Never invent path under `.cursor/`, `.cursor/worktrees/`, `.claude/worktrees/`, or IDE agent sandbox. IDE runtime ≠ this isolation layer.

Agent host built-in worktree features (enter-worktree tools, subagent worktree isolation, CLI worktree flags) **never** create run tree. This file decides path; create via Commands only.

One worktree, one branch, one MR (when applicable) per run — no per-project/per-repo looping.

## Step 0 — Detect existing linked worktree (mandatory)

Run from session cwd before Commands. Inputs: `{SOURCE_BRANCH}`, `{WORK_BRANCH}`, `REUSE_MODE`.

```bash
GIT_DIR=$(git rev-parse --path-format=absolute --git-dir)
COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
SUPER=$(git rev-parse --show-superproject-working-tree)   # non-empty = submodule, not linked worktree
CURRENT_BRANCH=$(git branch --show-current)               # empty = detached
```

`--path-format` needs git ≥ 2.31. Older git: `GIT_DIR=$(cd "$(git rev-parse --git-dir)" && pwd -P)`, same for `--git-common-dir`. Still failing: abort, ask.

First matching row wins.

| State | Action |
| ----- | ------ |
| `GIT_DIR == COMMON_DIR` (main checkout) | Commands below: create `.worktrees/{run_id}`. `WORKTREE_MODE = created` |
| Linked tree bound earlier this session to another `{run_id}` (e.g. prior delivery unit), or under agent-host runtime dir (`.claude/`, `.cursor/`, OS temp) | Not reusable. Create `.worktrees/{run_id}` under main checkout root (parent of `COMMON_DIR` when it ends in `.git`). `WORKTREE_MODE = created` |
| Linked (`GIT_DIR != COMMON_DIR`, `SUPER` empty) + all reuse conditions | Reuse cwd as `WORKTREE_ROOT`. No `.worktrees/{run_id}`. `WORKTREE_MODE = reused` |
| Any other linked state (reuse condition fails, or `SUPER` non-empty) | Abort, ask human. Never silently create second tree |

Reuse conditions (all):

- Path not under `.cursor/`, `.claude/`, IDE/agent sandbox dir, or OS temp.
- `CURRENT_BRANCH` non-empty; not `main`/`master`/`develop*`/`{SOURCE_BRANCH}`.
- `git status --porcelain` empty.
- Not harness tree of another run (path `.worktrees/{other_run_id}` or branch `work/{other_run_id}-*`). Same `{run_id}` = resume, allowed; `.worktrees/` path keeps `WORKTREE_MODE = created`.
- Upstream not bound to another run: `git rev-parse --abbrev-ref @{u}` fails (no upstream) or equals `origin/{WORK_BRANCH}`. Prior reuse sets upstream via `push -u`; `origin/work/{other_run_id}-*` = tree served earlier run, not reusable. Other upstream: abort, ask.

### Align reused tree

`git fetch origin {SOURCE_BRANCH}` (plus `{WORK_BRANCH}` when `REUSE_MODE = true`) first. Never auto-rebase.

| `REUSE_MODE` | Check | Action |
| ------------ | ----- | ------ |
| `false` | `git rev-list --count origin/{SOURCE_BRANCH}..HEAD` = `0` | `git reset --hard origin/{SOURCE_BRANCH}` — safe only here |
| `false` | count > `0` (commits not from this run) | Abort, ask |
| `true` | `git merge-base --is-ancestor origin/{WORK_BRANCH} HEAD` | Keep HEAD (contains remote work) |
| `true` | else `git rev-list --count origin/{WORK_BRANCH}..HEAD` = `0` | `git reset --hard origin/{WORK_BRANCH}` (no local commits lost) |
| `true` | else | Abort, ask. Never force-push |

### Reused-tree branch rules

- Keep local branch name (`LOCAL_BRANCH = CURRENT_BRANCH`). External tool owns it; renaming can break it.
- Remote name stays canonical `{WORK_BRANCH}`. **Every** push: `git push -u origin HEAD:{WORK_BRANCH}` — bare `git push` rejected under `push.default=simple` when names differ.
- MR source branch = `{WORK_BRANCH}`.

### Report (reused tree)

Final report MUST give human local test commands for main checkout:

```bash
git fetch origin && git switch {WORK_BRANCH}
```

Works since local name differs from branch held by linked tree. `LOCAL_BRANCH == {WORK_BRANCH}`: switch fails (branch checked out elsewhere); tell human test inside `WORKTREE_ROOT`.

## Commands

`WORKTREE_MODE = created` only. From repo root. `mkdir -p .worktrees` first.

```bash
git fetch origin {SOURCE_BRANCH}

# REUSE_MODE = false (new branch)
git worktree add -b {WORK_BRANCH} ".worktrees/{run_id}" origin/{SOURCE_BRANCH}
git -C ".worktrees/{run_id}" push -u origin {WORK_BRANCH}

# REUSE_MODE = true (existing branch)
git fetch origin {WORK_BRANCH}
git worktree add ".worktrees/{run_id}" {WORK_BRANCH}
```

`WORKTREE_MODE = reused`, `REUSE_MODE = false`: after align, `git push -u origin HEAD:{WORK_BRANCH}`.

`REUSE_MODE = true`: never force-push, never rewrite history.

## Failure policy

`git worktree add` fails (permissions, sandbox, path conflict, missing remote), or Step 0 aborts:

1. **Abort** — exact error + path attempted (or Step 0 state).
2. **Do not** code in main checkout.
3. **Do not** retry under `.cursor/` or non-canonical path.
4. **Do not** stay on `main`/`master`/`SOURCE_BRANCH` "to make progress".
5. Ask human only for path/permission unlock — or explicit authorize work-in-place on current branch.

## Rules

- All coding inside `{WORKTREE_ROOT}` (created or reused); never main checkout when concurrent work possible.
- `.worktrees/` in `.gitignore` or `.git/info/exclude`.
- Abort if worktree for same `{run_id}` already in use (unless explicit resume).
- One worktree per run — no extra trees per subdir/subagent; multi-agent (`ns-autonomous`) = disjoint scopes in same tree.
- Reuse covers one run per tree. Multi-unit dispatch: later units follow Step 0 "bound earlier" row.

## `{run_id}` derivation

| Consumer | `{run_id}` |
| -------- | ---------- |
| `ns-execution-gitlab-issue` (external) | `{ISSUE_ID}` — see skill `references/worktree-setup.md` |
| `ns-execution-gitlab-issue` (SDD unit) | `{unit}` — see skill `references/worktree-setup.md` |
| `ns-autonomous` standalone | `{version_san}` (`references/standalone-pipeline.md`) |

## Cleanup

`WORKTREE_MODE = created`: after merge, `git worktree remove` once human confirms. `reused`: never `git worktree remove` — external tool owns tree.
