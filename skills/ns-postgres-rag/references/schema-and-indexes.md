# Schema and indexes

Target DDL for report. Snippets: `templates/snippets/`. Not shipped migration.

## Core tables

- **`document`** — natural key (file identity: source URI or file id), optional **`business_record_id`** (cadastre anchor when file ≠ record), source URI, content hash, mime, ingest version, timestamps.
- **`chunk`** (text unit) — `document_id`, ordinal, **`body`**, **char_start**, **char_end**, **text_quality_band**, `embedding vector(D)`, metadata `jsonb`, `tsv tsvector`, model/version.
- **`entity`** — surviving identity, type, canonical key, confidence, **`description`**, **`embedding vector(D)`**, embedding version (P5 anchor mapping).
- **`entity_alias`** — surface forms / source keys → surviving `entity_id`.
- **`edge`** — logical typed relation: `from_id`, `to_id`, `edge_type`, `confidence`, `provenance_class` (`EXPLICIT` | `INFERRED`), **`review_status`** (`fact` | `pending_review` | `proposal`; traversal uses **`fact` only**), **`valid_from`**, **`valid_to`** (nullable period for temporal filters), created_at. **Unique** on `(from_id, edge_type, to_id)`.
- **`evidence`** — `edge_id`, `document_id`, `unit_id` (chunk), `quoted_text`, `confidence`, created_at. Many rows per logical edge.
- **`mention`** — `unit_id`, `entity_id`, `role_in_context`, confidence. Substrate for set/count/synthesis — not an edge.
- **`document_relation`** — explicit file-to-file refs: `from_document_id`, `to_document_id`, `relation_type`, `provenance_class`, `source_unit_id`, `quoted_text`, confidence. **Unique** on `(from_document_id, to_document_id, relation_type)`.

Provenance detail lives on **`evidence`**, **`mention`**, and **`document_relation`** — not duplicated inline on every `edge` row beyond class and confidence.

GraphRAG baseline DDL: `templates/snippets/chunk-schema.sql.snippet` + `templates/snippets/entity-edge-schema.sql.snippet`. HNSW: `templates/snippets/hnsw-index.sql.snippet`.

## Logical edge key

```text
UNIQUE (from_id, edge_type, to_id)
```

Upsert on conflict: see `../../ns-postgres-rag/references/ingestion-pipeline.md` Graph persist — confidence, provenance class, and **`review_status`** (`fact` | `pending_review` | `proposal`).

## Vector type and distance

- Type: `vector(D)`. `D` locked to embedding model version.
- Default metric, normalized embeddings: cosine `<=>` (`vector_cosine_ops`).
- L2 `<->` or inner product `<#>` only if model card says so. Do not mix ops on one index.

## HNSW

```text
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
```

Tune `m` / `ef_construction` up for 1MM+ recall; build cost and RAM rise. Query: `hnsw.ef_search` (start 40–80; raise until recall@k gate passes).

Filtered ANN: **iterative scan** (`hnsw.iterative_scan`) so metadata predicates do not collapse to sequential. Combine btree/GIN on filter columns. Snippet: `templates/snippets/hnsw-index.sql.snippet` (chunk + entity description indexes).

## Indexes for graph retrieval

- `evidence(edge_id)`, `evidence(document_id)`, `evidence(unit_id)`
- `mention(unit_id)`, `mention(entity_id)`, composite for set filters
- `edge(from_id, edge_type)`, `edge(to_id, edge_type)` partial indexes **`WHERE review_status = 'fact'`** for hop expansion
- `document_relation(from_document_id)`, `document_relation(to_document_id)`, unique `(from, to, relation_type)`
- `entity(embedding)` HNSW for anchor mapping (P5)

## Metadata filter

`jsonb` GIN **or** promoted columns for hot filters (tenant, mime, corpus, import batch). Predicate + ANN: iterative scan. Selective filter + cold HNSW = recall cliff — `references/operations-and-scale.md`.

## Large-corpus partitioning

Partition `chunk` (HNSW per partition) by tenant, corpus, or time — match query predicate. Indexes **per partition**. Cross-partition search = explicit UNION, not one global index.

## Index build cost

- Build HNSW offline or on standby partition; `maintenance_work_mem` sized to build, not OLTP.
- Concurrent build if version supports; still budget wall-clock hours at 1MM+ chunks.
- After load: `ANALYZE`. After bulk ingest: refresh planner stats before eval gates.
