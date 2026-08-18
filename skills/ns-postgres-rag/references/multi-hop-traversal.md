# Multi-hop traversal

Recursive SQL over typed `edge` rows. Similarity is not a hop.

**Sole example:** `company → contract → invoice → payment`.

## Caps (mandatory)

| Cap | Role |
| --- | ---- |
| Depth | `N` max hops (report sets N; company…payment is 3 hops) |
| Fanout | max children expanded per node |
| Cycle guard | visited node set in CTE; no re-expand |
| Score prune | drop paths below confidence / fused score floor |

Unbounded `WITH RECURSIVE` = anti-pattern.

## Path as evidence

Each result row: **node id sequence** and **edge ids**. That is `path`. Attach per-edge `provenance` and path-level `confidence` (min or product — pick one in report, keep it).

Snippet: `templates/snippets/multi-hop-cte.sql.snippet`.

## Ranking

Rank complete paths that reach asked type (e.g. payment) by path confidence, then supporting document recency if needed. Do not rank by embedding distance of last node alone.

## Property-graph extension

Optional SQL/property-graph extension = **alternative**, not default.

**Does not justify itself** when:

- Edge types few and stable (company/contract/invoice/payment class).
- Recursive CTE with caps meets p95.
- Team already operates plain Postgres + `pgvector`.

Justify only if mixed labels/properties dominate and CTE fanout cannot cap without dropping recall. Still provenance on every edge. Still never infer edges from vectors.
