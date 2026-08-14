# Agent git commit identity

Attribute agent commits only when **both** env vars set + non-empty:

| Variable | Purpose |
|----------|---------|
| `AGENT_GIT_AUTHOR_NAME` | Display name for `git commit --author` |
| `AGENT_GIT_AUTHOR_EMAIL` | Email for `git commit --author` |

## Usage

```bash
if [ -n "$AGENT_GIT_AUTHOR_NAME" ] && [ -n "$AGENT_GIT_AUTHOR_EMAIL" ]; then
  git commit --author="${AGENT_GIT_AUTHOR_NAME} <${AGENT_GIT_AUTHOR_EMAIL}>" -m "Your message in English"
else
  git commit -m "Your message in English"
fi
```

## Rules

- `--author` only when **both** vars set; else default git identity.
- Never modify global/local `git config` for author.
- Messages: English, imperative, **why**.
