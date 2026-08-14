# Task file schema

Output path: `docs/versions/{version_san}/tasks/task-NNN-slug.md`

```markdown
# {Imperative task title}
**Routing rationale:** {one line}
**Estimate (seconds):** N
**Related feature:** Feature NNN — {title}
**Depends on:** task-MMM-slug.md | None

---

### Summary
{1–2 paragraphs — what and why}

### Detailed description
{Expanded plan: files, architecture rules, edge cases, validation — NOT a copy of summary}

### Files to create or modify
- `{path}` — {purpose}

### data-testid contract (Frontend only)
| data-testid | Element | Context |
|-------------|---------|---------|
| `form-user-email-input` | Input | User form |

### Validation criteria
- [ ] {testable criterion}
- [ ] {testable criterion}

### Execution notes

{Omit until implementation. Append only relevant items: blockers, human waivers, branch notes.}
```

## Header fields

- **Estimate** in seconds (integer) — used for GitLab `set_issue_estimate` when synced
- **Depends on** — explicit task file names for ordering
- **Related feature** — traceability to requirements

## Naming

- File: `task-NNN-kebab-slug.md` — `NNN` zero-padded three digits
- Slug from task title, ASCII, kebab-case
- Handoff table uses short id only: `task-NNN`

## Execution notes

- Written during implementation — not at task generation
- Relevant items only (blockers, waivers); never dump session chatter
