# Graph specification — {{PRODUCT_NAME}}

> Canonical source for LangGraph runtime. Implementation must match this document.
> When topology, state, capabilities, wire names, or `recursion_limit` change, update this file in the **same** delivery (Spec Sync Gate). Stale archive ≠ source of truth.

## Locked header

| Field | Value |
| ----- | ----- |
| `framework` | langgraph |
| `architecture` | react \| react_bounded \| plan_execute \| reflection \| supervisor \| rag_qa |
| `interaction_mode` | sync_json \| streaming_sse |
| `recursion_limit` | {{number}} |

## Objective

{{One paragraph: what the agent does and for whom.}}

## Domain ownership

| Concern | Owns | Must not live in |
| ------- | ---- | ---------------- |
| Control flow / nodes | `src/graph/` | — |
| System prompts | `src/conversation/prompts/` | `graph/`, `llm/`, `src/prompts/` |
| Locale / humanize | `src/conversation/locale/` (`resolveConversationLocale` + Intl formatters; conversation-observed, not bootstrap SoT) | `graph/` |
| Presentation | `src/conversation/presentation/` | `graph/`, `llm/` |
| Versioned tenant / domain config | `config/tenants/{id}/` (optional) | new `src/` modules for domain rules |
| Local tools | `src/tools/` | — |
| MCP client | `src/mcp/` (generic) | hardcoded vendor/domain policy |
| Skill procedures | `skills/*.md` | — |
| Skill runtime | `src/skills/` (loader only) | domain heuristics |

## Prompt composition

Ordered layers (see `references/prompt-and-capability-injection.md`):

1. Canonical body — path: `src/conversation/prompts/{{file}}`
2. Opacity / safety fixed rules — {{yes/no}}
3. Data-plane truth — {{how connected capabilities are stated}}
4. Session context overlay — `configurable.{{field}}` (overlay ≠ replace body; not in state)
5. Scope anchors — {{helpers}}
6. Skill auto-inject — {{skill ids or none}}
7. Ephemeral runtime nudge — system section only (never fake HumanMessage)

**Compose invariant:** each LLM turn rebuilds system text as `base_invariant` (motor: gather MUST NOT emit user-facing Markdown; composer sole-writer; tool discipline; format numbers/dates for the user's language this turn — conversation-observed locale) + `injected` (product persona/tone). Do **not** persist the composed system/persona string in graph state, checkpointer, or durable `messages`. A summary `SystemMessage` at index 0 is allowed and is **not** the full system prompt — see `references/message-content-blocks.md`. Reply locale/formatting is **not** the product `injected` string: resolve ephemeral `turnLocale` via `resolveConversationLocale` (see `references/evidence-and-fidelity.md`).

Compose helper: `{{module path}}` (outside god-node).

Motor (`base_invariant`) source: `{{path or constant}}`. Product (`injected`) source: `{{path}}` or mode resolver `{{module}}`.

Optional when modes vary per turn — mode table (`mode | injected source | output schema | precondition`); see `references/prompt-and-capability-injection.md`.

## State schema

```typescript
// AgentState fields beyond messages
{
  messages: BaseMessage[];
  // thread_id, tenant_id via configurable — not duplicated in state
  // react_bounded evidence channels (optional — declare when architecture is react_bounded):
  // dataBundle?: Record<string, unknown> | null;
  // discoveryBrief?: { found: string[]; absent: string[] } | null;
  // externalError?: { code: string; message: string } | null;
  // turnDecisions?: Record<string, unknown>[];
  // turnLocale?: string | null; // ephemeral — clear each turn; conversation-observed
  // currencyHint?: string | null;
  {{custom_fields}}
}
```

### Evidence channels (when `architecture: react_bounded`)

| Channel | Writer | Composer reads |
| ------- | ------ | -------------- |
| `dataBundle` | Deterministic hydrate from tool payloads | Narrate only whitelisted numbers/facts |
| `discoveryBrief` | Discovery tools | Branch on found/absent — no hallucinated entities |
| `externalError` | MCP/auth/classified failures | Prefer over generic clarify |
| `turnDecisions` | Router/gather audit | Observability + optional user transparency |

**Sole writer:** exactly one node (`composer`) emits user-facing Markdown. Gather may emit tool calls only.

### Node id vs state channel

LangGraph: **node id** (`addNode`) cannot equal a **state channel** key on `AgentState`. Diagrams and the Nodes table use node ids. State schema lists channel keys.

Wrong: `addNode("intent", …)` when `intent` is on `AgentState`. Same for any channel key — node id must differ.

Example `react_bounded` mapping (adjust if a channel key collides):

| Node id | Writes channel(s) | Notes |
| ------- | ----------------- | ----- |
| `intent_classify` | `intent` | `{ intent: { speechAct, needsData } }` |
| `context_compact` | `messages` | Node id OK only if state has no `context_compact` channel |
| `gather` | `messages`, `dataBundle`, … | Or `analyst_agent` if `gather` is a channel |
| `composer` | `messages` | Sole user-facing writer |

## Nodes

| Node id | Type | State channels written | Tools bound |
| ------- | ---- | ------------------------ | ----------- |
| {{node}} | {{llm\|tool\|router}} | {{channels}} | |

## Edges

```mermaid
flowchart TD
  START --> {{first_node}}
  {{edges}}
```

## Conditional routing

| From | Condition | To |
| ---- | --------- | -- |
| {{node}} | {{predicate}} | {{target}} |

## Interrupts (HITL)

| Node | Trigger | Payload | Resume |
| ---- | ------- | ------- | ------ |
| {{node}} | {{tool class / policy}} | {{json shape}} | user approval / edit |

## Memory

| Layer | Mechanism |
| ----- | --------- |
| Short | LangGraph checkpointer (`postgres` prod, `memory` tests) |
| Long | {{none \| store namespace \| RAG}} |
| Context window | trim + optional summarize — tool cap vs skill-body cap |

## Capabilities — bind / inject

| Primitive | Wire name | Bind? | Inject mode | Class |
| --------- | --------- | ----- | ----------- | ----- |
| {{local\|mcp\|skill}} | {{wire}} | yes/no | execute / ToolMessage / body-only / auto-inject | read/write/… |

### Local tools

| Name | Class | Purpose | Bound |
| ---- | ----- | ------- | ----- |
| {{name}} | read/write/destructive | | yes \| unbound+test |

### MCP servers

| Server id | Transport | Allow tools | Default class |
| --------- | --------- | ----------- | ------------- |
| {{id}} | http | {{list}} | read |

### Skills

| Skill id | Mode (bind XOR auto-inject) | Cap |
| -------- | --------------------------- | --- |
| {{id}} | use_skill \| auto-inject | CONTEXT_SKILL_BODY_MAX_CHARS |

**Bind parity:** every tool the tools node can dispatch appears in `bindTools`, or is listed here as intentional unbound with a test.

## HTTP routes

| Method | Path | Mode |
| ---- | ---- | ---- |
| POST | /threads | create |
| POST | /threads/:id/message | {{sync_json\|streaming_sse}} |
| POST | /threads/:id/resume | HITL |

## Error contract

| Failure | User sees | Checkpoint |
| ------- | --------- | ---------- |
| Tool error | Model retries or asks | Preserved |
| Fatal | `failed` envelope / 500 | Preserved |

## Eval scenarios

1. {{happy path}}
2. {{tool confusion case}}
3. {{HITL interrupt case}}
4. {{bind parity / inject exclusivity case}}

## Out of scope

- {{explicit exclusions}}
