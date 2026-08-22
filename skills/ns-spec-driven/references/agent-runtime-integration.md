# Agent runtime integration (mandatory)

Agent-api or intelligent SaaS: **MUST** load `ns-langgraph-agents` before Clarify / Specify / Tasks / Execute. Not soft complement. Missing or skipped load = **stop**.

## Detection (any)

| Signal | Where |
| ------ | ----- |
| `agent-api/` | `agent-api/` |
| Intelligent SaaS context | `docs/context/intelligent-saas/` |
| Product class | `intelligent_saas` in `brownfield-map.md`, `AGENTS.md`, version `requirements.md` |
| Graph spec | `agent-api/graph-spec.md` or `docs/versions/{version_san}/graph-spec.md` |
| Version scope | Request, `requirements.md`, tasks mention agent-api, LangGraph, MCP, graph nodes, agent runtime |
| Greenfield agent | Empty repo or no `agent-api/package.json`; user wants new LangGraph runtime |
| Stack profile | Specify uses `stacks/intelligent-saas.md` or `stacks/agent-runtime.md` |

Any match = agent runtime project (session or version slice).

## Boot gate (blocking)

Once per session after Session boot.

| Step | Action |
| ---- | ------ |
| 1 | Confirm detection |
| 2 | `ns-langgraph-agents` in `.agents/skills/` — else **stop** |
| 3 | Read `ns-langgraph-agents/SKILL.md` + phase refs (placement, prompt/capability inject, architectures, capability governance if MCP) |
| 4 | `{agent_api_root}` default `agent-api` |
| 5 | Chat one-liner: doctrine loaded; path |

Step 2 fail — install, re-run boot:

```bash
npx @nextstage-brasil/harness --skill ns-langgraph-agents --no-scaffold -y
```

## Greenfield (no `agent-api/package.json`)

Coordinate **features** here; **skeleton** is `ns-langgraph-agents` bootstrap. Do not invent a second tree.

1. Framework unlocked? → `ns-multi-agent-architect` then continue
2. Specify first infrastructure feature: copy `templates/agent-runtime/` (`ns-langgraph-agents/references/bootstrap-agent-runtime.md`) + `graph-spec.md`
3. Later features = deltas only (MCP servers, HITL routes, domain in `conversation/` + `config/`, evals)
4. Execute: first pending task **runs the bootstrap script** (not snippet assembly, not copy from another product). Later tasks → `ns-coder`

## Orchestration

| Phase | Rule |
| ----- | ---- |
| Clarify | Graph/MCP/HITL ambiguities; topology via `ns-langgraph-agents`, `ns-multi-agent-architect` only if framework unlocked |
| Specify | `intelligent-saas.md` or `agent-runtime.md`; version `graph-spec.md` when graph in scope; greenfield Feature 001 = bootstrap; requirements cite placement, bind, spec sync |
| Tasks | First greenfield task = bootstrap command + `npm test`. Later: `graph-spec.md` sync, capability plan, or placement block per langgraph pre-change gates |
| Execute | Bootstrap task: `ns-langgraph-agents` script. Feature tasks: `coder-agent` / `ns-coder`; refs in parent context |
| Close | `ns-reviewer` anti-patterns for agent-api; parent must not contradict doctrine |

**MUST NOT** inline langgraph workflows in this face skill. **MUST** keep doctrine in context.

## No agent-api in scope

Backend/frontend only, no detection signal: skip gate. Re-detect if scope expands.

## Workers

PM workers do not replace gate. Parent `ns-spec-driven` **MUST** load langgraph before bridges so handoffs inherit doctrine.
