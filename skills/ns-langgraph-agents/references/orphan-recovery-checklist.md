# Orphan recovery checklist

Run this **before** new features when the agent runtime is disorganized or the team is blocked.

Score each item: ✅ pass | ⚠️ partial | ❌ fail

## Structure

- [ ] Graph compiles in `src/graph/graph.ts` (not `memory/`)
- [ ] `src/state.ts` defines `AgentState` with `messages` reducer
- [ ] No `*.test.ts` under `src/` — tests in `tests/` with `setup.ts`
- [ ] No legacy folders: `fixtures/`, `qualify/`, `rag/`, `cql/`
- [ ] `llm/` has infra only — conversation prompts in `conversation/prompts/`
- [ ] One thin `*.node.ts` per graph node
- [ ] Locale/humanize under `conversation/locale/` — not under `graph/`
- [ ] Presentation under `conversation/presentation/` — not under `graph/` or `llm/`
- [ ] No orphan `src/prompts/` or dead `* copy.md` prompt duplicates
- [ ] `src/skills/` is loader/registry only — no domain heuristics
- [ ] `src/mcp/` has no hardcoded vertical/vendor policy tables

## Spec artifacts

- [ ] `graph-spec.md` exists and matches compiled nodes/edges/capabilities/wire names
- [ ] Spec includes domain ownership, prompt composition, bind/inject table, `recursion_limit`
- [ ] Locked header: `framework`, `tenant_model`, `architecture`, `interaction_mode`
- [ ] Postman collection matches HTTP routes
- [ ] Spec Sync Gate understood: stale archive ≠ force-fit code

## Persistence

- [ ] `DATABASE_URL` in `.env` for dev/prod
- [ ] `initDb()` before HTTP `getGraph()`
- [ ] Migrations applied (observability + tool_executions)
- [ ] Tests use `CHECKPOINTER=memory`, no `DATABASE_URL`

## Context window

- [ ] Agent node calls `trimMessagesForLlm` — never raw `state.messages`
- [ ] Tool nodes call `truncateToolOutput` before `ToolMessage`
- [ ] `CONTEXT_SKILL_BODY_MAX_CHARS` separate from `CONTEXT_TOOL_OUTPUT_MAX_CHARS`
- [ ] Summarization persists via `RemoveMessage(REMOVE_ALL_MESSAGES)` rewrite

## Capabilities / inject

- [ ] `capability/` module: allowlist, classification, rate limit
- [ ] MCP wire names use `mcp__server__tool` (no `:` in new wire names)
- [ ] Skills use `use_skill__id` **or** auto-inject — not both per id without decision
- [ ] Bind parity: every tools-node-dispatchable tool is in `bindTools` (or unbound + test)
- [ ] Compose `base_invariant` (motor) + `injected` (product) per LLM invoke — ordered layers; session overlay ≠ canonical body
- [ ] Nudges in composed system text — not fake `HumanMessage`
- [ ] Composed system/persona prompt + secrets **not** in graph state, checkpointer, or durable `messages` (summary `SystemMessage` at index 0 OK)

## MCP

- [ ] Client reused per process (not per request stdio spawn)
- [ ] Discovery filtered before `bindTools`
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

1. Structure + placement alignment (tree, locale/prompts out of graph)
2. Spec sync (graph-spec matches intended runtime)
3. State + checkpointer + tests setup
4. Context window + skill-body cap (stops token/doctrine bleed)
5. Inject/bind parity + capability governance + MCP filter
6. Observability migrations
7. HTTP/Postman + SSE/HITL if required
8. Evals

Post gap report with ❌ items grouped by phase. Implement one phase per PR via `ns-code-coder` with `target_paths` / `do_not_create_under` / `injection_notes`.

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
