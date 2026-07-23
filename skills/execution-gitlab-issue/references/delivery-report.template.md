# Delivery report template

Internal GitLab comment (`internal: true`) posted in Phase 3, step 5.

```markdown
## Delivery

**LLM:** {LLM_PROVIDER} / {LLM_MODEL}
**MR:** {MR_URL — or "None (no code change in a git repository)" if empty}
**Commit:** `{SHORT_COMMIT_HASH}` — `{COMMIT_MESSAGE}`

## What was done

- {Item 1: main deliverable from a business-value angle}
- {Item 2+: engineering changes and system behavior}

## Files changed

- `{path/file.ext}` — {one-line summary}

## Decisions / notes

- {Architecture, patterns, or trade-offs. Remove this section if there are no relevant notes.}

## Validation

- {Unit, integration, or manual checks performed and their pass/fail state}

## Pending items (if any)

- {Suggestions left unaddressed + technical justification. If everything was resolved, write "None".}
```

Fill `{LLM_PROVIDER}` / `{LLM_MODEL}` with the exact model identifier executing the issue (e.g. `Anthropic / claude-opus-4-8`). If it cannot be determined with certainty, write `Undetermined`.
