# Multi-hop traversal

Recursive SQL over typed **fact** `edge` rows. Similarity is not a hop. Exclude `pending_review` and proposals.

**Illustration:** `company → contract → invoice → payment` — derive corpus chain in GraphRAG Process Report.

## Caps (mandatory)

| Cap | Role |
| --- | ---- |
| Depth | `N` max hops (report sets N; illustration chain is 3 hops) |
| Fanout | max children expanded per node |
| Cycle guard | visited node set in CTE; no re-expand |
| Score prune | drop paths below confidence / fused score floor |

Unbounded `WITH RECURSIVE` = anti-pattern.

## Per-hop authorization

Apply the same permission predicates **inside each recursive step** — not only on the seed anchor set. Prune denied nodes before expanding children.

**No-bridge rule:** a denied node cannot appear on a path to reach permitted data, even as an intermediate hop.

## Set-based expansion

One SQL read per hop over the **current frontier set** of node ids. Never N separate queries for N nodes at the same depth.

## Path as evidence

Each result row: **node id sequence** and **edge ids**. That is `path`. Attach per-edge `provenance` via `evidence` rows and path-level `confidence` (min or product — pick one in report, keep it).

Optional request flag: `include_evidence` → join evidence spans for cited answers.

Snippet: `templates/snippets/multi-hop-cte.sql.snippet` — illustrative CTE with per-hop auth predicate and no-bridge rule.

## Ranking

Rank complete paths that reach asked type (e.g. payment) by path confidence, then supporting document recency if needed. Do not rank by embedding distance of last node alone.

## Property-graph extension

Optional SQL/property-graph extension = **alternative**, not default.

**Does not justify itself** when:

- Edge types few and stable.
- Recursive CTE with caps meets p95.
- Team already operates plain Postgres + `pgvector`.

Justify only if mixed labels/properties dominate and CTE fanout cannot cap without dropping recall. Still provenance on every edge via evidence. Still never infer edges from vectors.

## No model per hop

Traversal is deterministic SQL. Model roles belong at extract and answer composition only.
