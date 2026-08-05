# Skill integrations

Agent-api / intelligent SaaS: mandatory `ns-langgraph-agents` — see `agent-runtime-integration.md`.

## Soft complements

Optional. Never block delivery if missing.

### Check (once per session)

| Skill | When |
| ----- | ---- |
| `ns-code-frontend-design` | UI, components, design-brief |
| `ns-code-docs-writer` | README, `docs/` guides (not code comments) |
| `ns-code-best-practices` | Security headers, CSP, modernize (not MR review) |
| `mcp-gitlab-usage` | GitLab MCP configured |
| `ns-execution-gitlab-issue` | Issue URL |

### Installed

Delegate slice to complement. Face skill stays orchestrator; no inline duplicate workflows.

| Skill | Rule |
| ----- | ---- |
| `ns-code-frontend-design` | Load `design-brief.md` when present |
| `ns-code-docs-writer` | README / `docs/` after delivery or on request |
| `ns-code-best-practices` | Security/compatibility pass; MR review stays `ns-code-reviewer` |

### Missing

Continue with workers + rules. Recommend once per session:

```bash
npx @nextstage-brasil/harness --skill ns-code-frontend-design --skill ns-code-docs-writer --skill ns-code-best-practices --no-scaffold -y
```

## GitLab (soft)

| Installed | Behavior |
| --------- | -------- |
| `mcp-gitlab-usage` + `ns-execution-gitlab-issue` | Prefer issue execution on `ISSUE_URL` |
| MCP only | MCP per `mcp-gitlab-usage`; code via `ns-code-autonomous` or `ns-code-coder` |
| Neither | Local execute; mention `--preset spec-driven-gitlab` once if user cites GitLab |

## ns-project-manager

Forecast/RICE only. **Do not** route delivery. Use only on explicit copilot / forecast request.
