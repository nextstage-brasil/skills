# Agent runtime template

Harness scaffold for `{cwd}/agent-api/` (or `--dest`). **PostgreSQL** is mandatory for observability, memory and checkpointer; Vitest uses `CHECKPOINTER=memory` (no DB required for unit tests).

**Layout:** `references/runtime-layout.md`  
**Placement:** `references/placement-and-domains.md`  
**Capabilities (tools / MCP / skills):** `references/capability-governance.md`  
**Observability:** `references/observability.md`  
**Locale / fidelity:** `references/evidence-and-fidelity.md`

Copy via `scripts/bootstrap-agent-runtime.mjs` — see `references/bootstrap-agent-runtime.md`. Do not copy another product tree.

Placeholders `{{PRODUCT_SLUG}}` and `{{PRODUCT_DISPLAY_NAME}}` are substituted at bootstrap.

## Bootstrap deliverables (mandatory)

| Deliverable | Path |
|-------------|------|
| PostgreSQL schema + migrations | `src/db/migrations/001_*.sql`, `002_tool_executions_capability.sql` |
| DB client + migrate | `src/db/client.ts`, `src/db/migrate.ts` |
| Observability | `src/observability/postgres.ts`, `run-context.ts`, `langsmith.ts`, `otel.ts` (opt-in) |
| Capability governance | `src/capability/` (types, allowlist, fingerprint, `tool-budget.ts`, `tool-names.ts`, `system-prompt.ts`) |
| MCP client (in-process) | `src/mcp/` — `normalizeMcpToolResult` → truncate; wire `mcp__{server}__{tool}` |
| Skills registry | `src/skills/` + `skills/*.md` — wire `use_skill__{id}`; skill body cap ≠ tool wire |
| Streaming SSE helper | `src/http/sse.ts` (when `interaction_mode: streaming_sse`) |
| Dev chat (manual test page) | `src/http/dev-chat.ts` — `GET /dev-chat`, **mandatory** local (`DEV_CHAT_ENABLED=true` in `.env.example`; never in production) |
| Memory | `src/memory/checkpointer.ts`, `store.ts` |
| LLM + JSON logs | `src/llm/json-output.ts` (writes `llm_logs` via run-context) |
| HTTP stub | `src/http/server.ts` (`initDb()` + `initOtel()` + skills bootstrap on startup) |
| Postman | `postman/agent-api.postman_collection.json` |
| Tests | `tests/setup.ts` — **no** `*.test.ts` under `src/` |

Starting scaffold (`architecture: plan_execute` — change if `graph-spec.md` locks another topology):

`guard` → `context_manager` → `mcp_catalog` → `analyst` ⇄ (`executor` | `composer` | `analyst`) → `composer` → `respond` → END

Optional HITL: `interrupt()` inside executor/analyst when graph-spec locks it — not a compiled interrupt node by default. Align `src/graph/` with product `graph-spec.md` after copy.

```bash
npm install
cp .env.example .env   # set DATABASE_URL
npm run db:migrate     # optional — also runs on HTTP startup via initDb()
npm test
npm run build
npm start              # requires DATABASE_URL + Postgres running
```

## Env (required)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CHECKPOINTER` | `postgres` (default) or `memory` (tests only) |
| `LLM_*` | Model for graph LLM hops |
| `LLM_LIGHT_*` | Optional lighter model |

See `.env.example`.

## LangSmith (opt-in)

Set `LANGSMITH_ENABLED=true` and `LANGCHAIN_API_KEY`. Every `graph.invoke()` must use `buildRunConfig(threadId, ctx)` for LangGraph `thread_id`. HTTP handlers wrap invokes in `runStorage.run({ threadId, tenantId }, ...)`.

## Postman

Update `postman/*.json` whenever HTTP routes change. See `postman/README.md`.

## Dev chat (manual testing)

Set `DEV_CHAT_ENABLED=true` (local default in `.env.example`) and open `http://localhost:{PORT}/dev-chat` — single self-contained HTML page that talks to the same `/threads` HTTP/SSE contract as any integrator.

Not for production; keep unset outside local/dev.

## Product system prompt (injected persona)

Motor is fixed; persona is mutable per turn via `RunnableConfig.configurable` — **never** graph `state` / checkpointer.

| Key | Role |
|-----|------|
| `product_system_prompt` | Shared product persona |
| `gather_product_prompt` | Optional gather-only override |
| `composer_product_prompt` | Optional composer-only override |

Nodes MUST call `composeSystemPrompt({ role, configurable })` → `base_invariant(role) + injected`. Injected text does **not** expand allowlist or waive HITL. See `references/prompt-and-capability-injection.md`.

## Conversation-observed locale

Numbers, currency, and dates follow the **user's language/context this turn** — not a fixed product locale. See `references/evidence-and-fidelity.md`.
