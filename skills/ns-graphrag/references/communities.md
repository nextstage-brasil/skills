# Communities and reports

Communities turn a large entity graph into **thematic clusters** so global questions do not walk every node.

## When they matter

| Question shape | Communities |
| -------------- | ----------- |
| How does company X reach a payment? | Local hops; communities optional |
| What are the main themes in this corpus? | **Required** (global) |
| Tell me about entity X in context | Local + nearby community report |

If all production questions are local paths, still compute communities for ops (health of the graph) but do not force global map-reduce on every chat turn.

## Algorithm (conceptual)

Hierarchical **modularity** clustering (Leiden-class). Recurse while a community exceeds a leaf-size cap. Optionally cluster only the largest connected component so dust nodes do not spawn empty reports.

Quality depends on **graph density**, not the clustering knob:

- Too few relations → singletons (useless).
- Everything linked to everything → one giant community (useless).

Fix extraction / ontology / confidence floors before changing resolution. Weight edges by confidence so weak pending links (already excluded) never dominate.

## Community reports

For each community, generate a report:

- Executive overview
- Key entities and relations
- Pointers to supporting text-unit ids

These reports are **embedded** for global search. A report without citations is an anti-pattern.

Recompute from the clustering phase onward when ontology, extract, or leaf-size policy changes. Incremental document adds should refresh affected communities, not the whole hierarchy, when the graph is large.

## Operator visualization

Do not dump the full community graph into the chat surface. Show the **retrieved path** (local) or a small cited subgraph. Full-graph exploration is an ops/debug view.
