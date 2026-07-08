# Worktree setup override

Mechanics are canonical in `../../nextstage-harness/references/worktree-setup.md`. This skill's only override:

```
{run_id} = {ISSUE_ID}
WORKTREE_ROOT = {product_root}/.worktrees/{ISSUE_ID}
```

`REUSE_MODE` comes from Gate 0; `SOURCE_BRANCH`/`WORK_BRANCH` come from Gate 1 and the issue identifiers step. Everything else (path shape, commands, abort-on-conflict rule, `.gitignore` entry) follows the canonical reference unchanged.
