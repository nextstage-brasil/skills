# Worktree setup override

Mechanics canonical in `../../ns-harness/references/worktree-setup.md`. Run its **Step 0** first; `WORKTREE_ROOT` = Step 0 result. This skill's only override:

**External issue mode:**

```
{run_id} = {ISSUE_ID}
WORKTREE_ROOT = reused linked worktree (Step 0) | .worktrees/{ISSUE_ID}
```

**SDD unit mode** (`unit` + `issue_iid` from `delivery-units.md`):

```
{run_id} = {unit}
WORKTREE_ROOT = reused linked worktree (Step 0, first unit only) | .worktrees/{unit}
```

`REUSE_MODE` from Gate 0; `SOURCE_BRANCH`/`WORK_BRANCH` from Gate 1 + identifiers step. `WORKTREE_MODE = reused`: every push `git push -u origin HEAD:{WORK_BRANCH}`; MR source = `{WORK_BRANCH}`; final output includes Step 0 local test commands. Everything else (path shape, commands, abort-on-conflict, `.gitignore` entry, **never under `.cursor/`**, **never fall back to main checkout**) follows canonical reference unchanged.
