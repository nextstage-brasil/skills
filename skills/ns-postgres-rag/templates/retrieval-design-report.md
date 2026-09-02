# Retrieval Design Report

Approvable deliverable for `ns-postgres-rag`. Fill every section. No application code. SQL = target shape only.

**Status:** draft | awaiting approval | approved  
**Date:**  
**Corpus / repo evidence:** (paths scanned)

## 1. Inventory (Gate 1)

- Volume (files, bytes, estimated chunks):
- Growth / mutability:
- Entity density:
- Question archetypes:
- Latency budget (p95):
- Postgres version / extensions found:
- Existing DDL (document, chunk, vector, tsvector, entity, edge):
- Source file formats:
- 1MM+ storage / index projection:

## 2. Chosen mode (Gate 2)

- Mode: vector-only | hybrid (`tsvector` + vector, rank fusion) | relational GraphRAG
- Justification (one paragraph; GraphRAG only if N≥2 hops and no single document contains chain):
- Extensions: `pgvector` (required). Timescale: yes/no — trigger evidence:

## 3. Target DDL

- `document`:
- `chunk` (embedding, metadata, tsvector):
- `entity` / `entity_alias` (if GraphRAG):
- `edge` with provenance (if GraphRAG):
- Snippets consulted:

## 4. Index plan

- HNSW (ops, `m`, `ef_construction`, `ef_search`, iterative scan):
- GIN / btree / jsonb:
- Partition key:
- Build / `ANALYZE` notes:

## 5. Ingestion plan

- Extract → chunk → embed → idempotent upsert:
- Natural key + content hash:
- Batch / backpressure / failure queue:
- Versioned re-embed / backfill without downtime:

## 6. Entity-resolution policy

- Blocking (deterministic then vector candidates):
- Merge / split rules and audit:
- No edge without evidence:

## 7. Traversal policy

- Depth cap / fanout cap / cycle guard / score prune:
- Canonical chain: `company → contract → invoice → payment` (or N/A if not GraphRAG):
- Property-graph extension: not justified / justified because:

## 8. Return contract

- `ids`, `score`, `path`, `provenance`, `confidence`, `cut_reason`, classified `error`:
- Vector similarity is candidate-only:

## 9. Eval gates

- Golden questions per archetype:
- recall@k:
- Multi-hop path precision:
- False-link rate:
- p95 vs budget:
- EXPLAIN gate on critical queries:
- Regression after embedding model change:

## 10. Risks

-

## 11. Next steps

If mode is **relational GraphRAG** and `ns-graphrag` is installed: fill/approve the GraphRAG Process Report next; then Specify / Tasks via `ns-spec-driven` after **both** reports are approved.

If GraphRAG but `ns-graphrag` absent: note process gaps open; retrieval-only handoff to `ns-spec-driven` (or install `ns-graphrag` first).

If vector-only or hybrid: Specify / Tasks via `ns-spec-driven` after **human approval** of this report. N/A for Process Report.

This report = planning input. `ns-postgres-rag` does not implement application code.

**Human approval:** name / date
