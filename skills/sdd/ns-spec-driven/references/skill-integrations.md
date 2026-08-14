# Skill integrations

Agent-api / intelligent SaaS: mandatory `ns-langgraph-agents` — see `agent-runtime-integration.md`.

## Soft complements

Optional. Never block delivery if missing.

### Check (once per session)

| Skill | When |
| ----- | ---- |
| `ns-frontend-design` | UI, components, design-brief |
| `ns-docs-writer` | README, `docs/` guides (not code comments) |
| `ns-best-practices` | Security headers, CSP, modernize (not MR review) |
| `mcp-gitlab-usage` | GitLab MCP configured |
| `ns-execution-gitlab-issue` | Issue URL |

### Installed

Delegate slice to complement. Face skill stays orchestrator; no inline duplicate workflows.

| Skill | Rule |
| ----- | ---- |
| `ns-frontend-design` | Load `design-brief.md` when present |
| `ns-docs-writer` | README / `docs/` after delivery or on request |
| `ns-best-practices` | Security/compatibility pass; MR review stays `ns-reviewer` |

### Missing

Continue with workers + rules. Recommend once per session:

```bash
npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y
```

## GitLab (soft)

| Installed | Behavior |
| --------- | -------- |
| `mcp-gitlab-usage` + `ns-execution-gitlab-issue` | Prefer issue execution on `ISSUE_URL` |
| MCP only | MCP per `mcp-gitlab-usage`; code via `ns-autonomous` or `ns-coder` |
| Neither | Local execute; mention `--preset gitlab` once if user cite GitLab |

## ns-project-manager

Forecast/RICE only. **Do not** route delivery. Use only on explicit copilot / forecast request.
