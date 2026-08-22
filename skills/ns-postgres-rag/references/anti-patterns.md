# Anti-patterns

Review before Retrieval Design Report marked done.

- **Similarity treated as a link** — `<=>` / neighbor rank stored as `edge`. Distance = candidate signal only.
- **Single HNSW for whole corpus** — no partition at 1MM+ **or** mixed vocabularies; filters fight index; rebuilds lock world.
- **Giant chunks** — whole-file embeddings; recall and RAM collapse.
- **Re-embed without version** — overwrite only vector column; no rollback; mixed models in one index.
- **Unbounded traversal** — recursive CTE, no depth, fanout, cycle, or score cap.
- **Answers without provenance** — ids and score only; no `path` / rule / source keys.
- **External graph without need** — property-graph extension or separate graph store when CTE + typed edges suffice.
- **Timescale by default** — hypertable for static document lake.
- **Graph tables for topic search** — small corpus, no hop chain, still adding `entity`/`edge`.
- **Asking human for DDL repo already has** — skip inventory scan.
