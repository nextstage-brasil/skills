# GraphRAG Process Report

Approvable deliverable for `ns-graphrag`. Fill every section. No application languages or vendor SKUs. Model **roles** only.

**Status:** draft | awaiting approval | approved  
**Date:**  
**Retrieval Design Report (ns-postgres-rag):** path / status

## 1. Mode confirmation

- Relational GraphRAG justified (N≥2 hops, chain split across records):
- Question archetypes mapped to answer shapes (unit / path / filtered set / count / synthesis / document correlation):

## 2. Ontology (P0)

- Derivation sources (registry schema, question hop chains, corpus sample):
- Entity types (closed list + one-line each):
- Relation types (closed list + direction):
- Identity ladder per type; mention-only types:
- Per-type identifier fields; role-on-mention rule:
- Unmapped-candidate policy:
- Claims/covariates: off / on — eval evidence:
- Ontology version id:

## 3. Text units (P1)

- Extract version / formats:
- Text-layer quality bands and routing (good / degraded / unusable):
- Normalize-before-split policy:
- Character-offset traceability:
- Semantic split policy (boundaries, target size, overlap):
- Unit identity (document key + ordinal or hash):
- Page/span provenance:
- Legacy lexical index reuse (if any):
- Idempotent re-extract on source id:
- Failure queue:

## 4. Extraction (P2)

- Extractor instruction build artifact (ontology version, regeneration policy):
- Graph primitive schema (entity + relation + role-in-context + identifiers + span + relation **confidence**):
- Relation confidence → review_status mapping (lock cutoffs; cite structured-extraction):
- Triplet cap per unit:
- Document-level nested fields (`value` / `sources` / `reasoning`) if any:
- Document class bands and thresholds:
- Extract vs summarize vs compose **roles**:
- Parallelism / backpressure:

## 5. Identity resolution (P3)

- Taxonomy normalize (fields; empty OK at go-live):
- Identity ladder per type (ordered steps):
- Candidate return policy for unresolved anchors:
- Ban on normalized-name identity (person-like types):

## 6. Persistence (P4)

- Logical edge unique key (`source + type + target`):
- Upsert policy (confidence strongest wins; provenance class no downgrade; **`review_status`** from locked relation-confidence mapping; promote to `fact` only on conflict):
- Evidence cardinality and append policy:
- Mention table (unit, entity, role-in-context):
- File vs business record anchors:
- Doc-to-doc explicit relations vs discovered shared-entity paths:
- Provenance classes (`EXPLICIT`, `INFERRED`, `DERIVED` never persisted):
- **`review_status`** from locked relation-confidence mapping (§4); traversal uses `fact` only:
- Proposal / confirmation policy (auto / operator / queue):
- Co-occurrence explicitly refused:
- Reprocessing supersedes prior knowledge per file:

## 7. Embeddings (P5)

- Objects embedded: text units / entity descriptions (discovery layer off = no third embed target):
- Dimension + versioning (pointer to retrieval report):

## 8. Query (P6)

- Router rules per answer shape:
- Scope restriction predicates (applied before ranking):
- Temporal model (edge period, record time):
- `query_knowledge_graph` contract and `max_depth` cap (≤ 5 unless lower):
- Candidate return for ambiguous anchors:
- Per-hop authorization; no-bridge rule; batch expansion:
- No model call per hop:
- Telemetry envelope fields:
- ACL-before-search (same predicates as document search):
- Cite-or-refuse; path visualization = query path / cited subgraph only:
- Cache key includes auth context + graph version:
- Streaming / first-visible latency:
- Interactive query preempts ingest:

## 9. Discovery (optional)

Leave empty unless discovery gate is met.

- Declared archetype outside six answer shapes:
- Indirect-link / grouping policy under hop caps:
- Hypothesis presentation (no write-back):

## 10. Eval gates

- Golden archetypes (see process-eval.md):
- Resolution / relation / evidence precision-recall:
- Path accuracy; set completeness:
- Citation faithfulness / refuse-when-empty:
- p95 per shape; multi-hop 2–5:
- Slice vs full-corpus homologation:

## 11. Out of scope

- Review/validation UI, saved prompts, tags, free query language, competing stores:

## 12. Next steps (`ns-spec-driven`)

Specify / Tasks only after **human approval** of this report **and** the Retrieval Design Report.
