# Agent git commit identity

When committing on behalf of an automated agent, attribute the commit only when
both environment variables are set and non-empty:

| Variable | Purpose |
|----------|---------|
| `AGENT_GIT_AUTHOR_NAME` | Display name for `git commit --author` |
| `AGENT_GIT_AUTHOR_EMAIL` | Email for `git commit --author` |

## Usage

Check both vars before committing:

```bash
if [ -n "$AGENT_GIT_AUTHOR_NAME" ] && [ -n "$AGENT_GIT_AUTHOR_EMAIL" ]; then
  git commit --author="${AGENT_GIT_AUTHOR_NAME} <${AGENT_GIT_AUTHOR_EMAIL}>" -m "Your message in English"
else
  git commit -m "Your message in English"
fi
```

## Rules

- Use `--author` only when **both** vars are set; otherwise use the default git identity.
- Never modify global or local `git config` to set author name or email.
- Commit messages: English, imperative, focused on **why**.
