# Retrieval decision

Gate 2: pick **one** mode. `pgvector` required all modes.

## Modes

- **Vector-only** — topic / semantic search. One document (or chunk set) answers. No hop chain. Small or medium corpus OK. Do **not** add `entity` / `edge` “for later.”
- **Hybrid** — `tsvector` + vector, **rank fusion** (RRF or equivalent). Keyword precision + semantic recall. Same document usually holds answer. GIN on `tsvector`; HNSW on embedding; fuse at query. Snippet: `templates/snippets/hybrid-search.sql.snippet`.
- **Relational GraphRAG** — **N≥2 hops** **and** no single document contains full chain. Typed `edge` rows confirmed by key/rule + provenance. Traverse capped recursive SQL. Canonical chain: `company → contract → invoice → payment`. Vector similarity **never** inserts edge; proposes entity-resolution **candidates** only.

## GraphRAG criterion (strict)

Graph tables only if **both**:

1. Archetypes need path across ≥2 record types.
2. Inventory: chain split across documents (or rows), not collocated.

Else refuse graph. Topic search, small base = vector-only.

## Partitioning triggers

- File or chunk count near 1MM+ **or** HNSW build / vacuum cost dominates ops.
- Query filters always hit partition key (tenant, corpus, time window).
- Retention: drop old partitions, not mass `DELETE`.

Declarative partition aligned to filter + retention. One giant HNSW for whole corpus = `references/anti-patterns.md`.

## Timescale (optional)

Recommend **only** when **all** hold:

- Primary access time-bounded (ingest clock or event time).
- Retention / compression = ops requirement.
- Volume time-series shaped, not static document lake.

Document RAG, no time predicate: plain partitioned Postgres. Timescale not GraphRAG prerequisite.
