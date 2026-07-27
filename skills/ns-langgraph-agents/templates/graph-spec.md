# Graph specification — {{PRODUCT_NAME}}

> Canonical source for LangGraph runtime. Implementation must match this document.

## Locked header

| Field | Value |
| ----- | ----- |
| `framework` | langgraph |
| `tenant_model` | simple \| vertical |
| `architecture` | react \| plan_execute \| reflection \| supervisor \| rag_qa |
| `interaction_mode` | sync_json \| streaming_sse |

## Objective

{{One paragraph: what the agent does and for whom.}}

## State schema

```typescript
// AgentState fields beyond messages
{
  messages: BaseMessage[];
  // thread_id, tenant_id via configurable — not duplicated in state
  {{custom_fields}}
}
```

## Nodes

| Node id | Type | Inputs | Outputs | Tools bound |
| ------- | ---- | ------ | ------- | ----------- |
| {{node}} | {{llm\|tool\|router}} | | | |

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
| Context window | trim + optional summarize — see context-window reference |

## Capabilities

### Local tools

| Name | Class | Purpose |
| ---- | ----- | ------- |
| {{name}} | read/write/destructive | |

### MCP servers

| Server id | Transport | Allow tools | Default class |
| --------- | --------- | ----------- | ------------- |
| {{id}} | http | {{list}} | read |

### Skills

| Skill id | Trigger |
| -------- | ------- |
| {{id}} | {{when}} |

## HTTP routes

| Method | Path | Mode |
| ------ | ---- | ---- |
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

## Out of scope

- {{explicit exclusions}}
