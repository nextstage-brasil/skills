# Placement and domains

Pick path before code. Wrong folder = debt (locale in `graph/`, heuristics in skill loaders, orphan prompts).

Read before any new file under `{agent_api_root}`. Emit **Placement Decision Block** (`SKILL.md`). Refuse paths outside matrix.

## Artifact → path matrix

| Artifact type | Canonical path | Layer |
| ------------- | -------------- | ----- |
| Control flow, edges, compile | `src/graph/` (`graph.ts`, `factory.ts`, `guards.ts`) | graph |
| Node orchestration (thin) | `src/graph/nodes/*.node.ts` | graph |
| Analyst payload / plan-action parser (wiring helpers, no copy/locale) | `src/graph/analyst/` | graph |
| Composer payload builders (wiring helpers, no copy/locale) | `src/graph/composer/` | graph |
| System prompt markdown + scope helpers | `src/conversation/prompts/` | conversation |
| Motor compose (`system-prompt.ts`, `load-role-prompt.ts`) | `src/conversation/` | conversation |
| Turn schemas, reply copy, contact flows | `src/conversation/` | conversation |
| Locale formatters, humanize, month/date labels | `src/conversation/locale/` | conversation |
| `resolveConversationLocale` / `formatUserFacing` (conversation-observed) | `src/conversation/locale/` | conversation |
| Presentation (progress copy, charts, mermaid sanitize) | `src/conversation/presentation/` | conversation |
| Versioned tenant / product domain data | `config/tenants/{id}/` | config |
| Local `StructuredTool`s | `src/tools/` | tools |
| MCP client, discovery, adapters, governance glue | `src/mcp/` | mcp |
| Capability types, allowlist, rate limit, fingerprint | `src/capability/` | capability |
| Skill procedure markdown | `skills/*.md` (agent-api root) | skills-data |
| Skill loader / registry / wire-to-tool | `src/skills/` | skills-runtime |
| Checkpointer, store, trim, summarize | `src/memory/` | memory |
| Provider config, JSON output helpers | `src/llm/` | llm-infra |
| HTTP server, SSE, routes, stream-turn, HITL resume | `src/http/` | http |
| Dev-chat React bench | `src/http/dev-chat-app/` | http |
| Audit / LangSmith / OTel | `src/observability/` | observability |

One-tenant product still uses this matrix — no ad-hoc folders.

## Ownership rules

- **`src/graph/`** — wiring only. Nodes call conversation/tools/mcp. Payload/plan helpers: `graph/analyst/` + `graph/composer/` — no locale/copy. No domain regex in nodes.
- **`src/conversation/`** — prompts, schemas, locale, presentation. Prompt SSoT: `conversation/prompts/`.
- **`src/skills/`** — loader, registry, LangChain adapters only. No domain heuristics/regex; no product rules in TS auto-inject.
- **`src/mcp/`** — generic client + governance. No hardcoded vendor/domain policy; config or capability allowlists.
- **`config/`** — versioned domain/tenant data. Code refs must exist on disk (and vice versa).
- **`src/llm/`** — provider/infra only. No domain prompts or qualify copy.

## Anti-patterns (placement)

| Wrong | Correct |
| ----- | ------- |
| i18n / month labels / humanize under `graph/` | `src/conversation/locale/` |
| Presentation / chart sanitize under `graph/` or `llm/` | `src/conversation/presentation/` |
| Domain prompts under `src/llm/` or top-level `src/prompts/` | `src/conversation/prompts/` |
| Frontend-style `locales/translation.json` inside agent-api | conversation locale helpers + config copy |
| Bootstrap / `.env` locale as primary reply-format SoT | `resolveConversationLocale` + ephemeral `turnLocale` — `evidence-and-fidelity.md` |
| Domain regex / heuristics in `src/skills/*-auto-inject.ts` | `conversation/` or `config/` |
| Vendor/domain policy hardcoded in `src/mcp/` adapters | allowlist + `config/` + `capability/` |
| Orphan `src/prompts/` plus dead `* copy.md` duplicates | Single canonical path; delete dead copies |
| `config/*` paths imported in code but missing on disk | Create config files same change (or remove refs) |
| Fat god-node with compose + bind + routing inline | Thin `*.node.ts` + helpers outside node |

## Placement Decision Block (required shape)

```markdown
### Placement Decision Block
- Artifact: {what is being added}
- Type: {from matrix}
- Target path: {canonical path}
- Layer: {layer name}
- Refs: placement-and-domains.md [, others]
- do_not_create_under: [list forbidden roots, e.g. graph/, llm/, src/prompts/]
```

Path not in matrix → stop; propose closest legal path. Do not invent new top-level folder.
