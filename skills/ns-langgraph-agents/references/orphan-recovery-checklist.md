# Orphan recovery checklist

Run this **before** new features when the agent runtime is disorganized or the team is blocked.

Score each item: ✅ pass | ⚠️ partial | ❌ fail

## Structure

- [ ] Graph compiles in `src/graph/graph.ts` (not `memory/`)
- [ ] `src/state.ts` defines `AgentState` with `messages` reducer
- [ ] No `*.test.ts` under `src/` — tests in `tests/` with `setup.ts`
- [ ] No legacy folders: `fixtures/`, `qualify/`, `rag/`, `cql/`
- [ ] `llm/` has infra only — conversation prompts in `conversation/`
- [ ] One `*.node.ts` per graph node

## Spec artifacts

- [ ] `graph-spec.md` exists and matches compiled nodes/edges
- [ ] Locked header: `framework`, `tenant_model`, `architecture`, `interaction_mode`
- [ ] Postman collection matches HTTP routes

## Persistence

- [ ] `DATABASE_URL` in `.env` for dev/prod
- [ ] `initDb()` before HTTP `getGraph()`
- [ ] Migrations applied (observability + tool_executions)
- [ ] Tests use `CHECKPOINTER=memory`, no `DATABASE_URL`

## Context window

- [ ] Agent node calls `trimMessagesForLlm` — never raw `state.messages`
- [ ] Tool nodes call `truncateToolOutput` before `ToolMessage`
- [ ] Summarization persists via `RemoveMessage(REMOVE_ALL_MESSAGES)` rewrite

## Capabilities

- [ ] `capability/` module: allowlist, classification, rate limit
- [ ] MCP wire names use `mcp__server__tool`
- [ ] Skills use `use_skill__id`
- [ ] Secrets not in graph state or checkpointer

## MCP

- [ ] Client reused per process (not per request stdio spawn)
- [ ] Discovery filtered before `bind_tools`
- [ ] Local classification on every tool
- [ ] Transport appropriate for deployment (HTTP in prod)

## Observability

- [ ] `runStorage.run` wraps every HTTP invoke
- [ ] `buildRunConfig(threadId)` on every invoke
- [ ] `logLlmCall` and `logToolExecution` wired

## Quality

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] At least stub eval suite in `evals/`

## Recovery order (when multiple ❌)

1. Structure alignment (tree + graph location)
2. State + checkpointer + tests setup
3. Context window (stops token bleed)
4. Capability governance + MCP filter
5. Observability migrations
6. HTTP/Postman + SSE/HITL if required
7. Evals

Post gap report with ❌ items grouped by phase. Implement one phase per PR via `ns-code-coder`.

## Smoke commands

```bash
cd agent-api
npm install
cp -n .env.example .env   # set DATABASE_URL
npm run db:migrate 2>/dev/null || true
npm test
npm run build
npm start
```
