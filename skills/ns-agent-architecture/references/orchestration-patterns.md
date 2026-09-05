# Orchestration patterns

Map each multi-agent **segment** by dependency type it resolves. Patterns **coexist** — pick per segment, not one global. All six sit in the Orchestrator block (`reference-architecture.md`). Runtime wiring: `ns-langgraph-agents`.

## Rules

| Rule | Meaning |
| ---- | ------- |
| Coexist | One architecture may mix patterns by segment |
| Handoff ≠ consult | Handoff = control transfer; originator leaves; context follows. Consult = ask then return |

## Catalog

| Pattern | Dependency resolved | Coordination cost | Select when (observable) |
| ------- | ------------------- | ----------------- | ------------------------ |
| **Sequential** | B needs A's output | Low | Real data dependence between steps |
| **Parallel** | None (calendar order only) | Low + aggregator | Independent tasks; merge after |
| **Supervisor** | Routing / assignment among specialists | Medium | One controller picks workers; workers report back |
| **Hierarchical** | Nested authority / sub-crews | Medium–high | Manager owns sub-managers or nested process |
| **Group chat** | Shared dialogue / peer consensus | High | Peers negotiate; no fixed next-step owner |
| **Handoff** | Domain / skill change mid-flow | Medium (context pack) | Control moves; originator exits |

## Selector

1. Next step needs prior **output**? Use sequential (or handoff if domain changes).
2. Calendar order only, no data dependence? Use parallel + aggregator.
3. One router assigns specialists who return? Use supervisor.
4. Nested crews / managers of managers? Use hierarchical.
5. Peers negotiate, no fixed owner? Use group chat.
6. Domain / tools / risk change mid-execution and prior agent must leave? Use **handoff** — not supervisor round-trip.

Lock pattern per segment in ADR **Orchestration pattern**. Rejected alternative: one clause.

Calendar-only ≠ sequential. Handoff ≠ "ask specialist then continue as same owner."
