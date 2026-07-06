# Worktree setup

## Paths

```
{product_root}/.worktrees/{ISSUE_ID}/
  backend/     # if backend is separate git repo
  frontend/
  root/        # meta-repo when entry is "."
```

## Per affected project

```bash
git -C "{PROJECT_REPO_PATH}" fetch origin {SOURCE_BRANCH}
git -C "{PROJECT_REPO_PATH}" worktree add -b {WORK_BRANCH} "{PROJECT_WORKTREE}" origin/{SOURCE_BRANCH}
git -C "{PROJECT_WORKTREE}" push -u origin {WORK_BRANCH}
```

## Rules

- All coding in worktrees when concurrent work possible
- `.worktrees/` in `.gitignore` or `.git/info/exclude`
- Abort if worktree exists for same issue unless resuming
- `AFFECTED_PROJECTS` minimal — no branch for repos without changes

## Cleanup

After merge, remove worktrees with `git worktree remove` when human confirms.
