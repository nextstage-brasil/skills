# Capability governance

Unified policy: **local tools**, **MCP tools**, **skill procedures**.

## Three primitives

| Kind | LLM sees | Internal `CapabilityId` | I/O |
| ---- | -------- | ----------------------- | --- |
| Local | `search_catalog` | `local:search_catalog` | In-process |
| MCP | `mcp__gitlab__list_issues` | `mcp:gitlab:list_issues` | Remote MCP |
| Skill | `use_skill__deploy_checklist` | `skill:deploy_checklist` | Injects markdown; no external I/O |

## Wire name rules

- Match `^[a-zA-Z0-9_-]{1,128}$`
- `__` between MCP/skill segments
- **Never** colons in wire names (OpenAI restriction)

```typescript
export function mcpWireName(server: string, tool: string): string {
  return `mcp__${server}__${tool}`;
}
export function skillWireName(id: string): string {
  return `use_skill__${id}`;
}
```

## Classification

Assign locally — **never** trust MCP metadata alone.

Same input always same logic → **local tool**, not an LLM worker.

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

Filter **before** `bind_tools`. Denied tools invisible in manifest.

## Rate limiting

Sliding window per `tenantId:capabilityId`:

- Per-tool limits expensive MCP
- Per-turn budget (`max_tool_calls` / `max_mcp_calls` in rules contract)
- Structured error to model on exceed — not HTTP 500

## Per-turn budgets (MCP / tool-heavy)

**Greenfield** + intentional MCP redesign: **MUST** wire budgets. **Brownfield:** **RECOMMENDED** — not Critical on orphan recovery.

`templates/snippets/tool-budget.ts.snippet` in gather/agent loop:

| Limit | Default env | Purpose |
| ----- | ----------- | ------- |
| `max_tool_calls_per_turn` | `AGENT_MAX_TOOL_CALLS` (8) | All tool kinds |
| `max_mcp_calls_per_turn` | `AGENT_MAX_MCP_CALLS` (6) | MCP subset |
| `max_cost_per_turn` | `AGENT_MAX_COST_PER_TURN` (product-set) | Reserved spend before next LLM/tool — `rules-contract.md` / `error-and-reliability.md` (not tool-count) |

On exceed (tool/MCP **count** budgets): stop loop; structured message to model or composer — no silent hang.

On exceed (`max_cost_per_turn`): **reserve before** next LLM/tool invoke — stop new work; do not treat as the same loop-count path (`error-and-reliability.md`).

### Arg fingerprint duplicate-skip

Hash redacted `(toolName, args)` per turn. **Skip** identical repeat. Entire gather round duplicates **and** analytical evidence in state: **break** loop.

Discovery-only (list/search) ≠ analytical evidence — `references/evidence-and-fidelity.md`.

## Secrets

| Allowed | Forbidden |
| ------- | --------- |
| `process.env` server URLs | API keys in `state` |
| `configurable.bearer_token` per invoke | Tokens in checkpointer |
| Request `mcp_auth` (validated) | Secrets in skill markdown bodies |

Redact secrets in audit + fingerprints.

## Skills registry

- `agent-api/skills/*.md` YAML frontmatter (`name`, `description`)
- Loader on startup (`SKILLS_DIR`)
- New skill = new file — no code change
- Skill tool returns procedure text; external actions via MCP/local only

## Human-in-the-loop

Three bands (business sets numbers). **Always-escalate** (alias **always-scale** — official publish, irreversible write) skip high band — gate even at high score. Same list as ADR Gateway always-escalate.

**Recalibration:** re-measure HITL bands on model version change or audit category-distribution drift vs calibration set.

| Band | Behavior |
| ---- | -------- |
| High confidence, not always-scale | Run |
| Mid | `interrupt` |
| Low, **or** always-escalate (always-scale) / `destructive` / `sensitive_tools` | `interrupt` — **sync** if undo is impossible; async if reversible |

1. Agent proposes tool call or recommendation
2. `interrupt({ tool, args, reason })`
3. UI approves/edits/rejects
4. `Command({ resume: approval })`

## Audit

Every execution → `tool_executions`. Gateway rows: same canonical fields (`ns-agent-architecture` `gateway-calibration.md`):

- `intent_category`, `model_tier`, `model_id`, `prompt_version`
- `threshold_applied`, `score_obtained`, `decision_outcome`, `always_escalate`
- `capability_id`, `tenant_id`, `thread_id`
- `fingerprint` (redacted args hash)
- `duration_ms`, `status`, truncated `result`

Postgres = SoT; OTel/LangSmith optional.

Snippet: `capability-wire-names.ts.snippet`, `mcp-policy.example.yaml`.
