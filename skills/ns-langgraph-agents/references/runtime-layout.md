# Runtime layout — `agent-api/`

Canonical tree for LangGraph.js production runtimes. Adapt folder names to the product; keep **layer rules** intact.

**Placement authority:** `references/placement-and-domains.md` — emit a Placement Decision Block before new files.
**Inject authority:** `references/prompt-and-capability-injection.md` — compose/bind before changing prompts or tools.

## Target tree

```
agent-api/
├── config/                 # Versioned domain data (not fixtures/)
│   ├── tenants/{id}/
│   └── verticals/{id}/     # optional: segment-specific behavior as data
├── evals/
├── postman/                # executable HTTP contract
├── skills/                 # *.md procedure files (auto-discovered)
├── src/                    # production only — no *.test.ts
│   ├── catalog/            # optional: search/summary helpers
│   ├── conversation/       # domain: turns, schemas, contact flows
│   │   ├── prompts/        # canonical system prompt markdown + scope helpers
│   │   ├── locale/         # formatters, humanize, date/month labels
│   │   └── presentation/   # charts, mermaid sanitize, display adapters
│   ├── graph/              # wiring only — no locale/copy/domain heuristics
│   │   ├── graph.ts        # StateGraph compile + getGraph
│   │   ├── factory.ts      # LangGraph Studio export
│   │   ├── guards.ts
│   │   └── nodes/*.node.ts # thin orchestrators; one file per node
│   ├── http/               # server, sse.ts, dev-chat (optional)
│   ├── db/                 # client, migrate, migrations/
│   ├── llm/                # config, provider, json-output — infra only
│   ├── memory/             # checkpointer, store, context-window, summarizer
│   ├── observability/      # postgres, run-context, langsmith, otel
│   ├── capability/         # types, allowlist, rate limit, fingerprint
│   ├── mcp/                # client, registry, discovery, governance, adapter
│   ├── skills/             # registry, loader, to-langchain-tool (no domain heuristics)
│   ├── tools/              # local StructuredTools
│   ├── shared/
│   ├── state.ts
│   └── index.ts
├── tests/                  # mirrors src/ + setup.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Layer dependencies

```
http → graph → graph/nodes → conversation | catalog | tools
conversation → llm (via dedicated turn modules, not graph imports into llm)
graph → memory (checkpointer only)
graph → observability
mcp/skills → capability governance → tools bound in agent node
```

`graph/` wires control flow. Domain prompts, locale, and presentation live under `conversation/`. Skill and MCP TypeScript modules stay generic; product/vertical rules live in `config/` + conversation.

## Hard prohibitions

| Anti-pattern | Correct pattern |
| ------------ | ---------------- |
| `StateGraph` in `memory/` | Compile in `graph/graph.ts` |
| Qualify/conversation prompts in `llm/` or `src/prompts/` | `conversation/prompts/` |
| Locale / i18n / humanize under `graph/` | `conversation/locale/` |
| Presentation under `graph/` or `llm/` | `conversation/presentation/` |
| Domain regex in `src/skills/` or `src/mcp/` | `conversation/` or `config/` |
| `llm/` imports `graph/` | Nodes orchestrate |
| `fixtures/`, `qualify/`, `rag/` as orphan folders | `config/`, `conversation/`, `catalog/` |
| `src/**/*.test.ts` | `tests/**` |
| Monolithic `nodes/index.ts` with all logic | One thin `*.node.ts` per node; helpers outside |
| Large payloads in graph state | Store refs; fetch via tools/MCP when needed |
| Dead prompt copies (`* copy.md`, dual trees) | One canonical path; delete orphans |

## Naming conventions

| Concept | Location |
| ------- | -------- |
| Main graph | `graph/graph.ts` — `getGraph()`, `resetGraphForTests()` |
| Extra graphs | `graph/{flow}.graph.ts` only when multiple distinct graphs |
| LLM config | `llm/config.ts` — `resolveLlmConfig()` |
| Context trim | `memory/context-window.ts` |
| System prompt compose | Prefer helper near `conversation/prompts/` — not inside god-node |
| MCP wire adapter | `mcp/to-langchain-tool.ts` |

## Bootstrap order

1. `state.ts` + empty graph compile
2. Checkpointer + `tests/setup.ts` isolation
3. LLM provider + JSON output helper
4. Context window module (tool cap + skill-body cap)
5. Capability layer + local tools
6. MCP client + governance
7. Agent node with trim + tool loop (thin node; compose/bind helpers extracted)
8. HTTP routes + Postman
9. Observability migrations
10. Eval suites

## Validation

```bash
cd agent-api
npm run build
npm test
```

Pass criteria: no tests under `src/`; graph in `graph/`; prompts under `conversation/prompts/`; `npm test` uses `CHECKPOINTER=memory` and `LLM_DISABLED=true`.
