# GraphRAG Process Report

Approvable deliverable for `ns-graphrag`. Fill every section. No application languages or vendor SKUs. Model **roles** only.

**Status:** draft | awaiting approval | approved  
**Date:**  
**Retrieval Design Report (ns-postgres-rag):** path / status

## 1. Mode confirmation

- Relational GraphRAG justified (N≥2 hops, chain split across records):
- Question archetypes (vector / local / global / explore):

## 2. Ontology (P0)

- Entity types (closed list + one-line each):
- Relation types (closed list + direction):
- Identity keys vs mention-only:
- Claims/covariates: off / on — eval evidence:
- Ontology version id:

## 3. Text units (P1)

- Extract version / formats:
- Semantic split policy (boundaries, target size, overlap):
- Unit identity (document key + ordinal or hash):
- Page/span provenance:
- Idempotent re-extract on source id:
- Failure queue:

## 4. Extraction (P2)

- Graph primitive schema (entity + relation + description + span):
- Triplet cap per unit:
- Document-level nested fields (`value` / `sources` / `reasoning`) if any:
- Document class bands and thresholds:
- Extract vs summarize vs compose **roles**:
- Parallelism / backpressure:

## 5. Assembly (P3)

- Taxonomy normalize (fields; empty OK at go-live):
- Resolution: deterministic then vector candidates then confirm:
- Edge provenance fields:
- pending_review policy (not facts; vector still on):
- Cadastre/key edges skip review:
- Co-occurrence explicitly refused:

## 6. Communities (P4)

- Leaf size / hierarchy:
- Fact-edge-only clustering:
- Report contents (overview, entities, unit ids):
- Incremental refresh plan:

## 7. Embeddings (P5)

- Objects embedded: units / entity descriptions / community reports:
- Dimension + versioning (pointer to retrieval report):

## 8. Query (P6)

- Router rules (vector / local / global / explore):
- `query_knowledge_graph` contract and `max_depth` cap (≤ 5 unless report sets lower):
- Ambiguity: ask before restricting type:
- ACL-before-search (same predicates as document search):
- Cite-or-refuse; path visualization = query path only:
- Streaming / first-visible latency:
- Interactive query preempts ingest:

## 9. Eval gates

- Golden archetypes:
- Citation faithfulness / refuse-when-empty:
- Path precision / false-link:
- Ontology compliance sample:
- p95 single-tool and 2–5 hop:
- Slice vs full-corpus homologation:

## 10. Out of scope

- Review/validation UI, saved prompts, tags, free query language, competing stores:

## 11. Next steps (`ns-spec-driven`)

Specify / Tasks only after **human approval** of this report **and** the Retrieval Design Report.
