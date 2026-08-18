# Schema and indexes

Target DDL for report. Snippets: `templates/snippets/`. Not shipped migration.

## Core tables

- **`document`** — natural key, source URI, content hash, mime, ingest version, timestamps.
- **`chunk`** — `document_id`, ordinal, text, `embedding vector(D)`, metadata `jsonb`, `tsv tsvector`, model/version.
- **`entity`** — surviving identity, type, canonical key, confidence.
- **`entity_alias`** — surface forms / source keys → surviving `entity_id`.
- **`edge`** — typed relation, `from_id`, `to_id`, **provenance** (rule id, source keys, document ids), `confidence`, created_at.

`chunk` + `document`: `templates/snippets/chunk-schema.sql.snippet`. Entity/edge: `templates/snippets/entity-edge-schema.sql.snippet`.

## Vector type and distance

- Type: `vector(D)`. `D` locked to embedding model version.
- Default metric, normalized embeddings: cosine `<=>` (`vector_cosine_ops`).
- L2 `<->` or inner product `<#>` only if model card says so. Do not mix ops on one index.

## HNSW

```text
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
```

Tune `m` / `ef_construction` up for 1MM+ recall; build cost and RAM rise. Query: `hnsw.ef_search` (start 40–80; raise until recall@k gate passes).

Filtered ANN: **iterative scan** (`hnsw.iterative_scan`) so metadata predicates do not collapse to sequential. Combine btree/GIN on filter columns. Snippet: `templates/snippets/hnsw-index.sql.snippet`.

## Metadata filter

`jsonb` GIN **or** promoted columns for hot filters (tenant, mime, corpus). Predicate + ANN: iterative scan. Selective filter + cold HNSW = recall cliff — `references/operations-and-scale.md`.

## Large-corpus partitioning

Partition `chunk` (HNSW per partition) by tenant, corpus, or time — match query predicate. Indexes **per partition**. Cross-partition search = explicit UNION, not one global index.

## Index build cost

- Build HNSW offline or on standby partition; `maintenance_work_mem` sized to build, not OLTP.
- Concurrent build if version supports; still budget wall-clock hours at 1MM+ chunks.
- After load: `ANALYZE`. After bulk ingest: refresh planner stats before eval gates.
