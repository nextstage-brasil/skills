# Soft skill integrations

Optional `code-*` complements — not in `alwaysInstall`. Never block delivery if missing.

## Check (once per session)

List `.agents/skills/` for:

| Skill | Prefer when |
| ----- | ----------- |
| `code-frontend-design` | UI pages, components, design-brief, avoiding generic AI UI |
| `code-docs-writer` | README, `docs/` guides, human-facing markdown (not code comments) |
| `code-best-practices` | Security headers/CSP, compatibility, modernize pass (not full MR review) |
| `mcp-gitlab-usage` | GitLab MCP configured |
| `execution-gitlab-issue` | User provides issue URL |

## If complement installed

**Delegate** to the complement skill for that slice of work. The face skill stays orchestrator — do not duplicate complement workflows inline.

### code-frontend-design

- Load `{product_root}/docs/context/design-brief.md` when present.
- Use for layout, tokens, component polish before or during UI tasks.

### code-docs-writer

- Use for README and `docs/` authoring after feature delivery or when user asks for documentation.
- Not for inline code comments or API docblocks in source.

### code-best-practices

- Use for security/compatibility/modernize checklist passes.
- **Not** a substitute for `code-reviewer` SOLID/MR gate.
- Route "review this MR" to `code-reviewer`, not here.

## If complement missing

1. Continue with worker skills + project rules.
2. **Recommend once per session** (do not repeat every message):

```bash
npx @nextstage-brasil/harness --preset complements --yes
```

## GitLab (soft)

| Installed | Behavior |
| --------- | -------- |
| `mcp-gitlab-usage` + `execution-gitlab-issue` | Prefer issue execution when `ISSUE_URL` present |
| MCP only | Use MCP tools per `mcp-gitlab-usage`; coding via `code-autonomous` or `code-coder` |
| Neither | Local execute only; mention `--preset gitlab` once if user references GitLab |

## pm-requirements-copilot

Separate product (forecast/RICE). **Do not** route delivery requests there. Use only when user explicitly asks for copilot / forecast workflow.
