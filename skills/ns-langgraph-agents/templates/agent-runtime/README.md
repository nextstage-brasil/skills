# Agent runtime template

Harness scaffold for `{cwd}/agent-api/` (or `--dest`). **PostgreSQL** is mandatory for observability, memory and checkpointer; Vitest uses `CHECKPOINTER=memory` (no DB required for unit tests).

**Layout:** `references/runtime-layout.md`  
**Placement:** `references/placement-and-domains.md`  
**Capabilities (tools / MCP / skills):** `references/capability-governance.md`  
**Observability:** `references/observability.md`  
**Locale / fidelity:** `references/evidence-and-fidelity.md`  
**Turn flow gates:** `references/turn-flow-gates.md`

Copy via `scripts/bootstrap-agent-runtime.mjs` — see `references/bootstrap-agent-runtime.md`. Do not copy another product tree.

Placeholders `{{PRODUCT_SLUG}}` and `{{PRODUCT_DISPLAY_NAME}}` are substituted at bootstrap (extensions include `.ts`, `.tsx`, `.yml`, `.dockerignore`).

## Bootstrap deliverables (mandatory)

| Deliverable | Path |
|-------------|------|
| PostgreSQL schema + migrations | `src/db/migrations/*.sql` (copied to `dist/db/migrations` on build) |
| DB client + migrate | `src/db/client.ts`, `src/db/migrate.ts` |
| Observability | `src/observability/postgres.ts`, `run-context.ts`, `langsmith.ts`, `otel.ts` (opt-in) |
| Capability governance | `src/capability/` (types, allowlist, fingerprint, `tool-budget.ts`, `tool-names.ts`) |
| System prompt compose | `src/conversation/system-prompt.ts` + `prompts/analyst.md`, `composer.md` |
| MCP client (in-process) | `src/mcp/` — `normalizeMcpToolResult` → truncate; wire `mcp__{server}__{tool}` |
| Skills registry | `src/skills/` + `skills/*.md` — wire `use_skill__{id}`; skill body cap ≠ tool wire |
| Streaming SSE | `src/http/sse.ts`, `stream-turn.ts` — `POST /threads/:id/message` + resume SSE |
| Dev chat | Shell `src/http/dev-chat.ts` + React `src/http/dev-chat-app/` → `dist/dev-chat-app.js` |
| Docker | `Dockerfile` (node:24-slim multi-stage), `docker-compose.yml` (agent-api only), `.dockerignore` |
| Memory | `src/memory/checkpointer.ts`, `store.ts` |
| LLM + JSON logs | `src/llm/` — providers `lmstudio\|openai\|openrouter\|vllm`; `BASE_URL` / `REASONING` per stage |
| HTTP | `src/http/server.ts` (`initDb()` + `initOtel()` + skills bootstrap on startup) |
| Postman | `postman/agent-api.postman_collection.json` |
| Tests | `tests/setup.ts` — **no** `*.test.ts` under `src/` |

Starting scaffold (`architecture: plan_execute` — change if `graph-spec.md` locks another topology):

`guard` → `context_manager` → `mcp_catalog` → `analyst` ⇄ (`executor` | `composer`) → `composer` → `respond` → END

No analyst self-loop. `routeAfterExecutor` is conditional. Cap: `AGENT_MAX_ANALYST_ITERATIONS` (default 3).

Optional HITL: `interrupt()` inside executor/analyst when graph-spec locks it — not a compiled interrupt node by default. Align `src/graph/` with product `graph-spec.md` after copy.

```bash
npm install
cp .env.example .env   # set DATABASE_URL
npm run db:migrate     # optional — also runs on HTTP startup via initDb()
npm test
npm run build          # tsc + typecheck React + esbuild + copy migrations/prompts
npm start              # rebuilds dev-chat bundle then RUN_HTTP=1
docker build -t agent-api .   # optional; Postgres/LLM stay outside compose
```

## Env (required)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CHECKPOINTER` | `postgres` (default) or `memory` (tests only) |
| `LLM_*` | Main profile + optional per-stage `LLM_<STAGE>_{PROVIDER,MODEL,API_KEY,TEMPERATURE,BASE_URL,REASONING}` |
| `LLM_LIGHT_*` | Optional lighter model |
| `AGENT_MAX_ANALYST_ITERATIONS` | Analyst hop cap (default 3) |

See `.env.example`. In Docker, host LLM URLs use `host.docker.internal`.

## LangSmith (opt-in)

Set `LANGSMITH_ENABLED=true` and `LANGCHAIN_API_KEY`. Every `graph.invoke()` / stream must use `buildRunConfig(threadId, ctx)` for LangGraph `thread_id`. HTTP handlers wrap invokes in `runStorage.run({ threadId, tenantId }, ...)`.

## Postman

Update `postman/*.json` whenever HTTP routes change. See `postman/README.md`. Includes SSE `Accept` on `/message` and `/resume`, plus an `interrupted` example.

## Dev chat (manual testing)

Set `DEV_CHAT_ENABLED=true` (local default in `.env.example`) and open `http://localhost:{PORT}/dev-chat`. Styled pico + IBM Plex shell; React mounts from `/dev-chat/app.js` (run `npm run build:dev-chat` if missing → 503).

Same HTTP/SSE contract as integrators: `/threads/:id/message` and `/resume` with `Accept: text/event-stream`. Interrupt options resume in-page.

Not for production; keep unset outside local/dev.

## Product system prompt (injected persona)

Motor is fixed; persona is mutable per turn via `RunnableConfig.configurable` — **never** graph `state` / checkpointer.

| Key | Role |
|-----|------|
| `product_system_prompt` | Shared product persona |
| `gather_product_prompt` | Optional gather-only override |
| `composer_product_prompt` | Optional composer-only override |

Nodes MUST call `composeSystemPrompt({ role, configurable })` from `src/conversation/system-prompt.ts` → `base_invariant(role) + injected`. Injected text does **not** expand allowlist or waive HITL. See `references/prompt-and-capability-injection.md`.

## Conversation-observed locale

Numbers, currency, and dates follow the **user's language/context this turn** — not a fixed product locale. See `references/evidence-and-fidelity.md`.
