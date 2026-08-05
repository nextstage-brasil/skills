# MCP complex access

Patterns for agents that connect to **multiple MCP servers** with large or overlapping tool catalogs.

## Architecture

```
Agent (LangGraph)
  → capability governance (allowlist, classify, rate limit)
  → MCP client (singleton per process)
  → Streamable HTTP | stdio (dev only)
  → MCP Server A, B, C …
```

LangGraph owns **orchestration**; MCP owns **tool protocol**. Do not replace the graph with MCP — complement it.

## Client lifecycle

| Environment | Pattern |
| ----------- | ------- |
| Production HTTP service | One `MultiServerMCPClient` (or custom registry) created at process startup; reuse for all requests |
| Local dev | stdio acceptable for single-user; still prefer one long-lived subprocess |
| Serverless | Consider in-process tools instead of stdio MCP per invocation |

Per-request stdio spawn causes latency, zombie processes, and broken horizontal scaling.

## Multi-server configuration

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
  gitlab: {
    url: process.env.MCP_GITLAB_URL!,
    transport: "http",
    headers: { Authorization: `Bearer ${token}` },
  },
  postgres: {
    url: process.env.MCP_POSTGRES_URL!,
    transport: "http",
  },
});

const discovered = await client.getTools(); // then govern before bind
```

Bearer tokens come from request `configurable` or tenant context — not from graph state.

## Discovery → governance → bind

1. **Discover** — `list_tools` per server (or adapter `getTools()`).
2. **Filter** — intersect with server `allow_tools` in config.
3. **Classify** — assign `read|write|destructive|admin` locally per tool.
4. **Rename** — `mcp__{server}__{tool}` for OpenAI-compatible APIs.
5. **Bind** — only governed tools reach `bind_tools`.
6. **Audit** — log `capability_id`, fingerprint, latency, status.

Never expose the full remote catalog to the model when the agent only needs 5–15 tools.

## Overlapping tool names

When two servers expose `search` or `read_file`:

- Wire names **must** include server: `mcp__gitlab__search`, `mcp__drive__search`.
- Internal ids: `mcp:gitlab:search`, `mcp:drive:search`.
- Prompt hint: one line in system message mapping wire names to intent.

## Transport selection

| Transport | Use when |
| --------- | -------- |
| Streamable HTTP | Deployed agents, multi-tenant, shared MCP fleet |
| SSE (legacy HTTP) | Older servers; migrate when possible |
| stdio | Local IDE, single developer, same machine |

## Timeouts and cancellation

- Per-tool timeout (e.g. 30s read, 120s batch).
- Propagate `AbortSignal` from HTTP request to MCP call when supported.
- On timeout: `ToolMessage` with `status: "error"` and clear message — let model retry or escalate.

## Complex servers (GitLab, DB, CRM)

| Challenge | Mitigation |
| --------- | ---------- |
| 40+ tools | Strict allowlist per agent persona; dynamic bind by route/intent node |
| Write/destructive tools | `destructive` class → HITL interrupt before execute |
| Tenant-specific MCP URL | `url_source: payload` with validated allowlist of hosts |
| Schema drift | Pin server version; re-discover on deploy, not every message |
| Large JSON results | `normalizeMcpToolResult` then `truncateToolOutput`; offer "fetch by id" tools |

## When NOT to use MCP

If the tool is a thin wrapper over an internal library in the same process, a local `StructuredTool` is simpler and faster. Use MCP when:

- Tool is shared across agents/IDEs
- Tool runs in another team's service
- You need independent deploy and versioning

## Normalize before truncate

Always:

```
raw = await mcpClient.callTool(...)
text = normalizeMcpToolResult(raw)
safe = truncateToolOutput(text, CONTEXT_TOOL_OUTPUT_MAX_CHARS)
```

See `templates/snippets/context-window.ts.snippet`. Double-stringifying `{content, structuredContent}` before extract silently corrupts totals.

## Structural and field-values cache (opt-in)

For agents that rediscover the same catalog shape every turn:

| Tier | Key shape | Caches |
| ---- | --------- | ------ |
| L1 structural | `tenantId` + resource + token fingerprint | `tools/list` or catalog tree shape |
| L2 field-values | L1 key + field id | Enum/list values for known fields |

Rules:

- Write-through on cache miss; after cache hit replace bulky ToolMessage with short note
- Flush on process boot when remote catalog version may have changed
- **Never** cache confirmed absence of free-text search — negative discovery stays live
- Opt-in only — agents without catalog rediscovery pain skip this

## Policy file

See `templates/snippets/mcp-policy.example.yaml` for declarative server/tool policy.

Snippet: `templates/snippets/mcp-client-lifecycle.ts.snippet`.
