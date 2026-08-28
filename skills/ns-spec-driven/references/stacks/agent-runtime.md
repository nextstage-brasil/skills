# Agent-runtime stack profile

Standalone LangGraph `agent-api` (`product_class: agent_runtime`). No Laravel/React app in same version.

## product_class

```markdown
## product_class
agent_runtime

## Deliverables
- agent-api/

## Architecture rule
HTTP/SSE clients talk to agent-api; no browser-direct secrets in the runtime
```

## Mandatory setup features (before domain)

1. Agent runtime bootstrap — `ns-langgraph-agents` `scripts/bootstrap-agent-runtime.mjs` into `agent-api/` + `graph-spec.md`
2. Env + PostgreSQL (`DATABASE_URL`) + `npm test`
3. Dev-chat local (`DEV_CHAT_ENABLED`) when `interaction_mode: streaming_sse`
4. Domain conversation prompts / skills / MCP allowlist as **later** features

## Additional artifacts

- `docs/versions/{version_san}/graph-spec.md`
- `docs/specs/agent-architecture.md` when `ns-multi-agent-architect` ran

`ns-spec-driven` parent: **MUST** load `ns-langgraph-agents` per `agent-runtime-integration.md`.
