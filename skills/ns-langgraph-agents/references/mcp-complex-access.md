# MCP complex access

Multi MCP servers, large or overlapping tool catalogs.

## Architecture

```
Agent (LangGraph)
  → capability governance (allowlist, classify, rate limit)
  → MCP client (singleton per process)
  → Streamable HTTP | stdio (dev only)
  → MCP Server A, B, C …
```

LangGraph = orchestration. MCP = tool protocol. Complement graph — do not replace.

## Client lifecycle

| Environment | Pattern |
| ----------- | ------- |
| Production HTTP | One `MultiServerMCPClient` (or registry) at startup; reuse all requests |
| Local dev | stdio OK single-user; prefer long-lived subprocess |
| Serverless | In-process tools over stdio MCP per invocation |

Per-request stdio spawn: latency, zombies, broken horizontal scale.

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

const discovered = await client.getTools(); // govern before bind
```

Bearer tokens from `configurable` or tenant context — not graph state.

## Discovery → governance → bind

1. **Discover** — `list_tools` per server (or `getTools()`)
2. **Filter** — intersect server `allow_tools` config
3. **Classify** — `read|write|destructive|admin` locally
4. **Rename** — `mcp__{server}__{tool}` for OpenAI APIs
5. **Bind** — governed tools only to `bind_tools`
6. **Audit** — `capability_id`, fingerprint, latency, status

Never expose full remote catalog when agent needs 5–15 tools.

## Overlapping tool names

Two servers expose `search` or `read_file`:

- Wire names include server: `mcp__gitlab__search`, `mcp__drive__search`
- Internal ids: `mcp:gitlab:search`, `mcp:drive:search`
- System prompt one-line wire name map

## Transport selection

| Transport | Use when |
| --------- | -------- |
| Streamable HTTP | Deployed agents, multi-tenant, shared MCP fleet |
| SSE (legacy HTTP) | Older servers; migrate when possible |
| stdio | Local IDE, single developer, same machine |

## Timeouts and cancellation

- Per-tool timeout (e.g. 30s read, 120s batch)
- Propagate `AbortSignal` from HTTP when supported
- Timeout: `ToolMessage` `status: "error"` — model retry or escalate

## Complex servers (GitLab, DB, CRM)

| Challenge | Mitigation |
| --------- | ---------- |
| 40+ tools | Strict allowlist per persona; dynamic bind by analyst/executor hop |
| Write/destructive | `destructive` class → HITL before execute |
| Tenant MCP URL | `url_source: payload` + validated host allowlist |
| Schema drift | Pin server version; re-discover on deploy, not every message |
| Large JSON | `normalizeMcpToolResult` then `truncateToolOutput`; "fetch by id" tools |

## When NOT to use MCP

Thin wrapper over in-process library: local `StructuredTool` simpler. MCP when:

- Shared across agents/IDEs
- Another team's service
- Independent deploy + versioning

## Normalize before truncate

Always:

```
raw = await mcpClient.callTool(...)
text = normalizeMcpToolResult(raw)
safe = truncateToolOutput(text, CONTEXT_TOOL_OUTPUT_MAX_CHARS)
```

`context-window.ts.snippet`. Double-stringify `{content, structuredContent}` before extract corrupts totals.

## Structural and field-values cache (opt-in)

Agents rediscover same catalog shape every turn:

| Tier | Key shape | Caches |
| ---- | --------- | ------ |
| L1 structural | `tenantId` + resource + token fingerprint | `tools/list` or catalog tree |
| L2 field-values | L1 key + field id | Enum/list values for known fields |

Rules:

- Write-through on miss; cache hit replaces bulky ToolMessage with short note
- Flush on boot when remote catalog version may change
- **Never** cache confirmed absence of free-text search
- Opt-in — skip without catalog rediscovery pain

## Policy file

`mcp-policy.example.yaml` — declarative server/tool policy.

Snippet: `mcp-client-lifecycle.ts.snippet`.
