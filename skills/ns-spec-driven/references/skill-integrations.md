# Skill integrations

Agent-api / intelligent SaaS: mandatory `ns-langgraph-agents` — `agent-runtime-integration.md`.

## Code complements (preset default)

`spec-driven`, `gitlab`, `agents` install these via `ns-coder` `depends` + harness `resolveDepends`. Normal preset install: **present** — installed complements, not optional extras.

Once per session: confirm `.agents/skills/<id>/` exists. Present: **delegate** per table. Face/orchestrator stays owner; worker reads complement `SKILL.md` and returns.

| Skill | Delegate when |
| ----- | ------------- |
| `ns-frontend-design` | UI, components, pages, dashboards, `design-brief.md` alignment |
| `ns-docs-writer` | README, `docs/` guides after delivery or on request (not code comments) |
| `ns-best-practices` | Security headers, CSP, compat/a11y hygiene, Web Interface Guidelines audit — **not** MR/SOLID review |

`ns-coder` routing: `../ns-coder/SKILL.md` — **Complement delegation**.

### Missing (minimal / custom install only)

Absent from `.agents/skills/`: continue with harness rules + `ns-coder`; recommend once per session:

```bash
npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y
```

Never block delivery waiting for complements.

## GitLab (soft)

Three execution modes — GitLab optional; no hard `depends` change on this skill.

| Mode | When | Path |
| ---- | ---- | ---- |
| **Local** | Default sequential, no units file | `run-implementation.md` classic; unit batches only when `delivery-units.md` present |
| **Parallel units (no publish)** | Gate 4 publish `no`, `gate4_mode=parallel` — file without `issue_iid` | `run-implementation.md` unit batches per `gates.md` After answers |
| **Publish units** | Gate 4 publish `yes` — `delivery-units.md` + `issue_iid` per row | `mcp-gitlab-usage` SDD delivery-unit publish. Execute: **G** SDD unit mode when `ns-execution-gitlab-issue` present; else local `run-implementation` + Flow D. Status/spent: `delivery-units.md` **GitLab status/spent (SSoT)** |
| **External issue** | Human passes `ISSUE_URL` | `ns-execution-gitlab-issue` priority 1 — **not** same as SDD unit mode |

| Installed | Behavior |
| --------- | -------- |
| `mcp-gitlab-usage` + `ns-execution-gitlab-issue` | Gate 4 publish + unit mode; external `ISSUE_URL` still priority 1 |
| MCP only | MCP per `mcp-gitlab-usage`; code via `ns-autonomous` or `ns-coder` |
| Neither | Local execute; mention `--preset gitlab` once if user cite GitLab |

## ns-project-manager

Forecast/RICE only. **Do not** route delivery. Explicit copilot / forecast request only.
