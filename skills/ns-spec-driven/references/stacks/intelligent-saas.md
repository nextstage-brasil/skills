# Intelligent SaaS stack profile

Product includes backend, frontend, and agent-api (LangGraph or similar agent runtime).

## product_class

```markdown
## product_class
intelligent_saas

## Deliverables
- backend/
- frontend/
- agent-api/

## Architecture rule
Frontend then Backend then Agent-API (never direct browser to agent-api)
```

## Mandatory setup features (before domain)

1. Monorepo infra — compose with app, frontend, agent-api, db, redis
2. Backend base + API auth
3. Backend agent proxy — HTTP/SSE relay to agent-api
4. Backend tool execution layer — internal endpoints consumed by agent
5. Agent runtime bootstrap — `ns-langgraph-agents` `bootstrap-agent-runtime.mjs` into `agent-api/` + `graph-spec.md`
6. Frontend shell — API base URL to backend only; no direct agent env in browser
7. Env wiring — service tokens, healthchecks

## Additional artifacts

- `docs/versions/{version_san}/graph-spec.md` when agent graph in scope
- Agent module features section or dedicated agent requirements merge

## References in harness

When `docs/context/intelligent-saas/` exists, read for graph + networking details.

`ns-spec-driven` parent: **MUST** load `ns-langgraph-agents` per `ns-spec-driven/references/agent-runtime-integration.md` before agent-api planning or execute.
