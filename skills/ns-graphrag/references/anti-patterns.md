# Anti-patterns

Review before the GraphRAG Process Report is marked done.

- **Ontology after extract** — types invented per document.
- **Bare triples** — no entity/relation descriptions; global reports are hollow.
- **Co-occurrence edges** — two mentions in one unit become a fact.
- **Similarity as link** — neighbor rank stored on `edge`.
- **Whole-file context** — no retrieval; model confused and uncited.
- **Answer without quotes** — structured columns with no `sources`.
- **Guess when empty** — violates grounded RAG.
- **ACL after ANN** — leak by ranking/timing; or error text “no access.”
- **Global for every chat** — slow, vague; local facts drowned.
- **Local for themes** — neighborhood overfit, fake “main themes.”
- **Unbounded hops** — no depth/fanout/cycle/score cap.
- **pending_review as facts** — low-confidence edges in paths.
- **Free query language** — operator or model writes traversal scripts.
- **Full-graph UI in chat** — should be query path only.
- **Ingest blocking HITL in v1** — flags yes; review screens later.
- **Competing vector store** — contradicts `ns-postgres-rag`.
- **Language/framework names in artifacts** — this skill is process knowledge.
- **Second domain example** besides `company → contract → invoice → payment` in doctrine text.
