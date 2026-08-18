# Placement and domains

Decide **where** an artifact lives before writing code. Wrong folders become permanent debt: locale under `graph/`, domain heuristics in skill loaders, orphan prompt copies.

Read this before any new file under `{agent_api_root}`. Emit a **Placement Decision Block** (see `SKILL.md`) and refuse paths outside the matrix.

## Artifact → path matrix

| Artifact type | Canonical path | Layer |
| ------------- | -------------- | ----- |
| Control flow, edges, compile | `src/graph/` (`graph.ts`, `factory.ts`, `guards.ts`) | graph |
| Node orchestration (thin) | `src/graph/nodes/*.node.ts` | graph |
| System prompt markdown + scope helpers | `src/conversation/prompts/` | conversation |
| Turn schemas, reply copy, contact flows | `src/conversation/` | conversation |
| Locale formatters, humanize, month/date labels | `src/conversation/locale/` | conversation |
| `resolveConversationLocale` / `formatUserFacing` (conversation-observed) | `src/conversation/locale/` | conversation |
| Presentation (charts, mermaid sanitize, display adapters) | `src/conversation/presentation/` | conversation |
| Versioned tenant / product domain data | `config/tenants/{id}/` | config |
| Local `StructuredTool`s | `src/tools/` | tools |
| MCP client, discovery, adapters, governance glue | `src/mcp/` | mcp |
| Capability types, allowlist, rate limit, fingerprint | `src/capability/` | capability |
| Skill procedure markdown | `skills/*.md` (repo root of agent-api) | skills-data |
| Skill loader / registry / wire-to-tool | `src/skills/` | skills-runtime |
| Checkpointer, store, trim, summarize | `src/memory/` | memory |
| Provider config, JSON output helpers | `src/llm/` | llm-infra |
| HTTP server, SSE, routes | `src/http/` | http |
| Audit / LangSmith / OTel | `src/observability/` | observability |

Do not invent ad-hoc folders because the product has one tenant — still use this matrix.

## Ownership rules

- **`src/graph/`** — wiring only. Nodes call into conversation/tools/mcp; they do not own locale, copy, or domain regex.
- **`src/conversation/`** — prompts, schemas, locale, presentation. One canonical prompt path: `conversation/prompts/`.
- **`src/skills/`** — loader, registry, and LangChain tool adapters only. No domain heuristics, no domain-specific regex, no auto-inject policy that embeds product rules in TypeScript.
- **`src/mcp/`** — generic client + governance adapters. No hardcoded vendor/domain policy tables in adapters; policy lives in config or capability allowlists.
- **`config/`** — versioned domain and tenant data. Code may reference only paths that exist on disk (and vice versa).
- **`src/llm/`** — provider/infra only. Never domain prompts or qualify copy.

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
| `config/*` paths imported in code but missing on disk | Create config files in the same change (or remove refs) |
| Fat god-node with compose + bind + routing inline | Thin `*.node.ts` + helpers outside the node |

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

If the requested path is not in the matrix, stop and propose the closest legal path — do not invent a new top-level folder.
