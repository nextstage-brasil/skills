# Operations and scale

Reference: **1MM+ files**.

## Index build memory

HNSW build memory-heavy. Size `maintenance_work_mem` for build window; not OLTP defaults. Build per partition. Monitor wall-clock; 1MM+ chunks can be hours.

## Maintenance and stats

After bulk ingest: `ANALYZE` (per partition). Watch bloat on `chunk` / `edge`. Autovacuum scale with tuple churn. Stale stats = bad join order on recursive CTE.

## Storage growth and cost

Project heap + HNSW + GIN + WAL. Embedding heap dominates. Versioned dual-embed doubles vector storage until cutover — budget it. Entity/edge small vs vectors unless alias explosion.

## Recall vs selective filters

Tight metadata predicates + HNSW without iterative scan = missing neighbors. Promote hot filters; enable iterative scan; partition so index already matches predicate.

## Retention and partitioning

Drop or detach partitions for expired corpus. Partition detach over row-by-row delete at this scale.

## Timescale adoption (objective)

Adopt Timescale **only** if ingest/query is time-partitioned, retention/compression required, and hypertable matches access path. Document lake, semantic search, no time window: **do not** add Timescale. Optional, never required for `pgvector` RAG.
