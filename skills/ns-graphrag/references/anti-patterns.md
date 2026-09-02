# Anti-patterns

Review before the GraphRAG Process Report is marked done.

- **Ontology after extract** — types invented per document.
- **Bare triples** — no descriptions; anchor mapping and synthesis starve.
- **Co-occurrence edges** — two mentions in one unit become a fact.
- **Similarity as link** — neighbor rank stored on `edge`.
- **One edge row per attestation** — use logical edge + evidence append.
- **Normalized name as identity** — homonyms merge incorrectly.
- **Derived path persisted as edge** — `DERIVED` is query-only.
- **Filtered set / count via path walk** — use mention + attribute substrate.
- **Discovery findings as facts** — or write-back as edges.
- **Modularity grouping as pipeline stage** — without declared discovery archetype.
- **Scope restriction after ranking** — must apply with auth before rank.
- **Denied node as bridge** — reach permitted data through denied intermediate.
- **Model call per hop** — traversal must be deterministic.
- **Per-node reads during expansion** — batch one read per hop.
- **Degraded text indexed without quality band** — silent weak citations.
- **Proposed records committed** — without declared confirmation policy.
- **Cache key without auth context** — or without graph version.
- **Whole-file context** — no retrieval; model confused and uncited.
- **Answer without quotes** — structured columns with no `sources`.
- **Guess when empty** — violates grounded RAG.
- **ACL after ANN** — leak by ranking/timing; or error text “no access.”
- **Unbounded hops** — no depth/fanout/cycle/score cap.
- **pending_review as facts** — low-confidence edges in paths.
- **Free query language** — operator or model writes traversal scripts.
- **Full-graph UI in chat** — should be query path / cited subgraph only.
- **Competing vector store** — contradicts `ns-postgres-rag`.
- **Language/framework names in artifacts** — this skill is process knowledge.
- **Hand-maintained extractor type lists** — drift from P0 artifact; regenerate instructions instead.
