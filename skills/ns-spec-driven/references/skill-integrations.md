# Skill integrations

Agent-api / intelligent SaaS: mandatory `ns-langgraph-agents` — see `agent-runtime-integration.md`.

## Code complements (preset default)

`spec-driven`, `gitlab`, and `agent-creator` install these via `ns-coder` `depends` + harness `resolveDepends`. On a normal preset install they are **present** — treat as installed complements, not optional extras.

Once per session: confirm `.agents/skills/<id>/` exists. If present → **delegate** per table below. Face/orchestrator stays owner; worker reads complement `SKILL.md` and returns.

| Skill | Delegate when |
| ----- | ------------- |
| `ns-frontend-design` | UI, components, pages, dashboards, `design-brief.md` alignment |
| `ns-docs-writer` | README, `docs/` guides after delivery or on request (not code comments) |
| `ns-best-practices` | Security headers, CSP, compat/a11y hygiene, Web Interface Guidelines audit — **not** MR/SOLID review |

`ns-coder` routing: `../ns-coder/SKILL.md` → **Complement delegation**.

### Missing (minimal / custom install only)

If absent from `.agents/skills/`, continue with harness rules + `ns-coder`; recommend once per session:

```bash
npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y
```

Never block delivery waiting for complements.

## GitLab (soft)

| Installed | Behavior |
| --------- | -------- |
| `mcp-gitlab-usage` + `ns-execution-gitlab-issue` | Prefer issue execution on `ISSUE_URL` |
| MCP only | MCP per `mcp-gitlab-usage`; code via `ns-autonomous` or `ns-coder` |
| Neither | Local execute; mention `--preset gitlab` once if user cite GitLab |

## ns-project-manager

Forecast/RICE only. **Do not** route delivery. Use only on explicit copilot / forecast request.
