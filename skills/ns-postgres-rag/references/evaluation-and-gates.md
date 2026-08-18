# Evaluation and gates

Do not ship a mode without gates. Numbers in Retrieval Design Report.

## Golden questions

One set **per archetype** from inventory:

- topic / semantic
- keyword-heavy
- single-hop fact
- multi-hop (`company → contract → invoice → payment` class)

Each item: query, gold ids or gold path, archetype tag. Frozen before model or chunker changes.

## Metrics

| Metric | Use |
| ------ | --- |
| recall@k | vector / hybrid |
| multi-hop path precision | GraphRAG: gold path vs returned path |
| false-link rate | edges or paths that fail provenance audit |
| p95 latency | vs budget from Gate 1 |

False-link rate = **release blocker** for GraphRAG. High recall with invented edges = fail.

## EXPLAIN gate

Critical queries (hybrid fusion, recursive CTE, filtered HNSW) need `EXPLAIN (ANALYZE, BUFFERS)` on 1MM-representative sample or production snapshot. Reject sequential collapse on vector column, unbounded recursive work, or filter-after-ANN with no iterative scan.

## Regression after embedding change

New `embedding_version`: rerun full golden set before cutover. Dual-index until recall@k and path precision ≥ prior version (or accepted delta in report). No silent in-place replace.
