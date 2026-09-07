# Inter-agent transport

What **delivers** events between agents. Event name / emitter / payload / listeners / pattern alone ≠ contract. ADR locks transport + delivery when multi-agent.

Defense pack restates for stakeholders; ADR = source. Runtime idempotency: `ns-langgraph-agents` → `references/error-and-reliability.md` (Idempotency). Do not restate.

## Transport selector

| Choice | When |
| ------ | ---- |
| **In-process emitter** | Producers share one process; listener always up; no cross-crash replay |
| **Broker / queue** | Separate processes; listener may be down; replay or durability required |

Axes: shared process? replay needed? listener may miss emit?

## Per-event fields (beyond five)

| Field | Values / rule |
| ----- | ------------- |
| Delivery guarantee | `at-most-once` \| `at-least-once` |
| Ordering | required / not required |
| Durability | yes / no |
| Replay | yes / no |

**At-least-once** ⇒ listeners **idempotent**. See `ns-langgraph-agents` → `references/error-and-reliability.md` (Idempotency) — cross-link only.

## Ordering and scope

- **Subscribe before emit** — emit with no listener = silent drop
- Scope events **per flow** or **per module** — name the scope; no global anonymous bus without owner

## MCP vs A2A

| Boundary | Means |
| -------- | ----- |
| **MCP** | Request/response over a **tool contract** |
| **A2A** | Shared-state / peer protocol between agents |

State the boundary. Do not endorse a vendor SDK.

## Anti-patterns

| Anti-pattern | Fix |
| ------------ | --- |
| Event contract, no named transport | Lock in-process vs broker |
| At-least-once + non-idempotent listener | Idempotent listener or at-most-once |
| Emit before subscribe | Subscribe-first rule |
| Rich event where notify meant | Notify = signal; listeners fetch — defense template rich-vs-notify |
