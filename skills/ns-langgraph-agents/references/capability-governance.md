# Capability governance

Unified policy for **local tools**, **MCP tools**, and **skill procedures**.

## Three primitives

| Kind | LLM sees | Internal `CapabilityId` | I/O |
| ---- | -------- | ----------------------- | --- |
| Local | `search_catalog` | `local:search_catalog` | In-process |
| MCP | `mcp__gitlab__list_issues` | `mcp:gitlab:list_issues` | Remote MCP |
| Skill | `use_skill__deploy_checklist` | `skill:deploy_checklist` | Injects markdown; no external I/O |

## Wire name rules

- Match `^[a-zA-Z0-9_-]{1,128}$`
- Use `__` between segments for MCP and skills
- **Never** use colons in wire names (OpenAI tool name restrictions)

Helper:

```typescript
export function mcpWireName(server: string, tool: string): string {
  return `mcp__${server}__${tool}`;
}
export function skillWireName(id: string): string {
  return `use_skill__${id}`;
}
```

## Classification

Assign locally — **never** trust MCP server metadata alone.

| Class | Typical ops | Default policy |
| ----- | ----------- | -------------- |
| `read` | list, get, search | Allow |
| `write` | create, update | Allow with audit |
| `destructive` | delete, drop, send | HITL interrupt |
| `admin` | privilege, token, config | Deny by default |

## Allowlist

```typescript
const policy: AllowlistPolicy = {
  allow: new Set([
    "mcp:gitlab:list_issues",
    "mcp:gitlab:read_issue",
    "local:format_reply",
  ]),
  denyClasses: ["admin"],
};
const bound = filterCapabilities(discovered, policy);
```

Filter **before** `bind_tools`. Agent must not see denied tools in the manifest.

## Rate limiting

Sliding window per `tenantId:capabilityId`:

- Per-tool limits for expensive MCP calls
- Per-agent turn budget (`max_tool_calls` / `max_mcp_calls` in rules contract)
- Return structured error to model when exceeded — not HTTP 500

## Per-turn budgets (MCP / tool-heavy)

**Greenfield** and intentional MCP redesign: **MUST** wire budgets. **Brownfield:** **RECOMMENDED** — not a Critical blocker on orphan recovery.

Wire `templates/snippets/tool-budget.ts.snippet` in gather/agent loop:

| Limit | Default env | Purpose |
| ----- | ----------- | ------- |
| `max_tool_calls_per_turn` | `AGENT_MAX_TOOL_CALLS` (8) | All tool kinds combined |
| `max_mcp_calls_per_turn` | `AGENT_MAX_MCP_CALLS` (6) | MCP subset of above |

On exceed: stop tool loop; surface structured message to model or composer — never silent hang.

### Arg fingerprint duplicate-skip

Hash redacted `(toolName, args)` per turn. **Skip** repeat identical calls. If an entire gather round is duplicates **and** analytical evidence already sits in state, **break** loop — do not burn budget re-polling.

Discovery-only calls (list/search) do **not** count as analytical evidence — see `references/evidence-and-fidelity.md`.

## Secrets

| Allowed | Forbidden |
| ------- | --------- |
| `process.env` server URLs | API keys in `state` |
| `configurable.bearer_token` per invoke | Tokens in checkpointer |
| Request payload `mcp_auth` (validated) | Secrets in skill markdown bodies |

Redact secrets in audit logs and fingerprints.

## Skills registry

- Files: `agent-api/skills/*.md` with YAML frontmatter (`name`, `description`).
- Loader scans on startup (`SKILLS_DIR` env).
- New skill = new file — no code change.
- Skill tool returns procedure text into the conversation; external actions still go through MCP/local tools.

## Human-in-the-loop

Tools with `classification: destructive` or listed in `sensitive_tools`:

1. Agent proposes tool call
2. Graph hits `interrupt({ tool, args, reason })`
3. UI approves/edits/rejects
4. Resume with `Command({ resume: approval })`

## Audit

Every execution → `tool_executions` row:

- `capability_id`, `tenant_id`, `thread_id`
- `fingerprint` (hash of redacted args)
- `duration_ms`, `status`, truncated `result`

Postgres is source of truth; OTel/LangSmith are optional overlays.

Snippet: `templates/snippets/capability-wire-names.ts.snippet`, `templates/snippets/mcp-policy.example.yaml`.
