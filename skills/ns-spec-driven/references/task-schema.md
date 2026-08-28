# Task file schema

Output path: `docs/versions/{version_san}/tasks/task-NNN-slug.md`

**Read rule:** worker reads the **card** (header through Validation criteria), **always** the `### Contract` block when present. Open cited `source/` anchors. Open `Detailed description` on demand — ambiguity or `blocked`. No new files. No handoff change.

```markdown
# {Imperative task title}
**Routing rationale:** {one line}
**Estimate (seconds):** N
**Related feature:** Feature NNN — {title}
**Depends on:** task-MMM-slug.md | None
**Source refs:** {slug}.md Sx [, Sy]

---

### Summary
{1–2 paragraphs — what and why}

### Files to create or modify
- `{path}` — {purpose}

**Collision input:** list **concrete repo-relative write paths** only (files or directories the task will create or modify). No globs, no "TBD", no layer labels alone — `delivery-units.md` uses path intersection to merge tasks. Omit read-only paths.

### data-testid contract (Frontend only)
| data-testid | Element | Context |
|-------------|---------|---------|
| `form-user-email-input` | Input | User form |

### Contract
{Verbatim tables/strings from source for API, schema, or screen tasks. Empty only if not API/schema/screen.}

### Validation criteria
- [ ] {testable criterion}
- [ ] {testable criterion}

### Detailed description
{Expanded plan: architecture rules, edge cases, non-obvious ordering — NOT a copy of summary. Card above stays executable without this section.}

### Execution notes

{Omit until implementation. Append only relevant items: blockers, human waivers, branch notes.}
```

## Header fields

- **Estimate** in seconds (integer) — for GitLab `set_issue_estimate` when synced
- **Depends on** — explicit task file names for ordering
- **Related feature** — traceability to requirements
- **Source refs** — version `source/` file + anchors; required when source exists

## Naming

- File: `task-NNN-kebab-slug.md` — `NNN` zero-padded three digits
- Slug from task title, ASCII, kebab-case
- Handoff table uses short id only: `task-NNN`

## Execution notes

- Written during implementation — not at task generation
- Relevant items only (blockers, waivers); never dump session chatter
