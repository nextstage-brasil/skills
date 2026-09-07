# Retrieval augmentations

Gate 2 locks **one base mode** (vector-only | hybrid RRF | relational GraphRAG). Augmentations are **additive** — enable only when measured symptom exists. See `retrieval-decision.md` for base mode.

## Multi-Index

| When | Symptom |
| ---- | ------- |
| Enable | Distinct vocabularies or document domains contaminate one index (recall collapse, wrong-domain neighbors) |
| Mechanism | One index per domain; **deterministic** index-routing key on every query |
| Cross-index fan-out | Explicit fallback tier only — not default path |
| vs partition | Partition = tenant/time/retention physical split (`retrieval-decision.md`). Multi-Index = Gateway category logical split. Distinct keys — do not double-apply |

**Routing key lock:** same intent category locked in ADR Gateway (`ns-agent-architecture` `gateway-calibration.md`). Not a second taxonomy. Classifier or rule at Gateway picks category; retrieval uses that key to select index. Fan-out all indexes every query = forbidden.

## Agentic retrieval

| When | Symptom |
| ---- | ------- |
| Enable | Single search pass misses answer often; corpus needs query reformulation or staged widening |
| Mechanism | Bounded iteration budget — explicit max iterations; widening strategy per iteration documented |
| Budget exhausted | Return best hit so far; **escalate** (human or orchestrator) — never self-decide next action |

Iteration = retrieval loop only. Not an LLM planner replacing Gateway intent routing.

## Augmentation lock (Gate 2)

| Augmentation | Value | Justifying symptom (required if not `none`) |
| ------------ | ----- | ------------------------------------------- |
| Multi-Index | yes / no | |
| Agentic | yes / no | |
| Combined label | `none` \| `multi-index` \| `agentic` \| `both` | |

`none` = default. Stacking without symptom = refuse.

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Stack `both` or either augmentation without measured symptom | Token cost, ops debt, wrong-domain recall | Base mode only until symptom measured |
| Unbounded agentic loop | Latency blow-up; silent wrong answer | Explicit max iterations + escalate on exhaust |
| Multi-Index without routing key | Fan-out every query; cost scales with index count | Deterministic key from Gateway intent category |
| Second taxonomy for index routing | Drift from ADR; dual maintenance | Reuse Gateway locked categories |

## Cross-links

| Topic | Reference |
| ----- | --------- |
| Base mode matrix | `retrieval-decision.md` |
| Partition trigger (domain contamination) | `retrieval-decision.md` Partitioning triggers |
| Gateway intent categories | `ns-agent-architecture` `gateway-calibration.md` |
| Eval gates | `evaluation-and-gates.md` |
