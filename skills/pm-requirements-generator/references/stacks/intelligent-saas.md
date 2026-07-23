# Intelligent SaaS stack profile

Apply when product includes backend, frontend, and agent-api (LangGraph or similar agent runtime).

## product_class

```markdown
## product_class
intelligent_saas

## Deliverables
- backend/
- frontend/
- agent-api/

## Architecture rule
Frontend → Backend → Agent-API (never direct browser → agent-api)
```

## Mandatory setup features (before domain)

1. Monorepo infra — compose with app, frontend, agent-api, db, redis
2. Backend base + API auth
3. Backend agent proxy — HTTP/SSE relay to agent-api
4. Backend tool execution layer — internal endpoints consumed by agent
5. Agent runtime bootstrap — graph spec, vertical config
6. Frontend shell — API base URL to backend only; no direct agent env in browser
7. Env wiring — service tokens, healthchecks

## Additional artifacts

- `{product_root}/docs/versions/{version_san}/graph-spec.md` when agent graph is in scope
- Agent module features section or dedicated agent requirements merge

## References in harness

When `{product_root}/docs/context/intelligent-saas/` exists, read for graph and networking details.
