# Worktree setup override

Mechanics are canonical in `../../../ns-harness/references/worktree-setup.md`. This skill's only override:

**External issue mode:**

```
{run_id} = {ISSUE_ID}
WORKTREE_ROOT = .worktrees/{ISSUE_ID}
```

**SDD unit mode** (`unit` + `issue_iid` from `delivery-units.md`):

```
{run_id} = {unit}
WORKTREE_ROOT = .worktrees/{unit}
```

`REUSE_MODE` comes from Gate 0; `SOURCE_BRANCH`/`WORK_BRANCH` come from Gate 1 and identifiers step. Everything else (path shape, commands, abort-on-conflict rule, `.gitignore` entry, **never under `.cursor/`**, **never fall back to main checkout**) follows the canonical reference unchanged.
