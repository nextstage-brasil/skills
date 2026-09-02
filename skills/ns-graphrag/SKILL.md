---
name: ns-graphrag
description: "(NS) Build a complete GraphRAG process — ontology, semantic text units, schema-locked extraction with citations, entity resolution, typed edges with provenance, communities and reports, vector dual-index, local/global/vector query routing, ACL-before-search, cited answers. Use whenever the user wants GraphRAG, a knowledge graph over documents, multi-hop retrieval, entity/relationship extractors, community summaries, or grounded structured extraction from unstructured files — even if they only say RAG, NER, knowledge graph, or cited Q&A. Do NOT use for Postgres schema/mode choice alone (`ns-postgres-rag` first). Do NOT use for competing vector stores, free graph query languages, or co-occurrence-as-edge designs."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
  - ns-postgres-rag
---

# GraphRAG process

End-to-end **process knowledge** to construct GraphRAG on the retrieval layer designed by `ns-postgres-rag`.

**Analyze. Specify the pipeline. No application language or product names.**

Storage, indexes, hybrid rank, recursive hop caps, and the Retrieval Design Report live in `ns-postgres-rag`. This skill owns **how knowledge is extracted, assembled, queried, and cited**.

## Central rule

A hop is a **stored typed edge** with provenance. Similarity proposes **candidates**. Co-occurrence does not create edges. Every operator answer cites **verbatim source spans** (or refuses). Denied records are **omitted**, never explained as “no access.”

Canonical hop (English artifacts only): `company → contract → invoice → payment`.

## Split with ns-postgres-rag

| Question | Owner |
| -------- | ----- |
| Vector vs hybrid vs GraphRAG? DDL, HNSW, hop CTE, return fields | `ns-postgres-rag` |
| Ontology, extractor, document typing, communities, query routing, citations, ACL-before-search | **this skill** |

If Gate 2 is not relational GraphRAG, **stop**. Do not invent graph tables “for later.”

## Language ban

Instructions, reports, and extractor contracts name **concepts** (text unit, surviving identity, community report). Do **not** name programming languages, frameworks, UI kits, container runtimes, or vendor model SKUs. Model **roles** only: `extract`, `embed`, `classify`, `summarize`, `compose`.

SQL/DDL shapes stay in `ns-postgres-rag` snippets.

## Boot (mandatory)

1. `../../ns-harness/references/session-boot.md` — Session boot (blocking).
2. Read `../ns-postgres-rag/SKILL.md` routing + Gates 1–2. If no approved Retrieval Design Report and mode is GraphRAG, fill or demand that report first.
3. Scan corpus formats, existing cadastre keys, permission model, question archetypes.
4. Continue this skill.

**Success:** inventory + GraphRAG mode justified. **Failure:** extractor prompt before ontology, or graph without N≥2 split-chain need.

## Flow

boot → **P0** ontology lock → **P1** unstructured → text units → **P2** schema-locked extract → **P3** resolve + assemble graph → **P4** communities + reports → **P5** embed dual index → **P6** query routing + contract → **P7** GraphRAG Process Report → human approve → `ns-spec-driven`.

Interactive query **preempts** ingest jobs. Ingest is staged, idempotent, retry-per-stage.

## P0 — Ontology lock (blocking)

Fixed vocabularies. Extractor may not invent types. Detail: `references/ontology.md`.

Lock before any extract batch:

- Entity types (closed list).
- Relation types (closed list, directed meaning).
- Optional claim/covariate types (default **off** until prompts tuned).
- Surviving-identity keys (cadastre / registry) vs mention-only.

Open vocabularies fragment the graph and poison communities.

## P1 — Unstructured → text units

Deterministic extract from bytes. Each **text unit** (semantic chunk) keeps `document_id`, ordinal, page/span, content hash. Prefer paragraph / section boundaries over mid-sentence cuts. Overlap exists so relations that straddle units still extract. Giant whole-file units forbidden.

Detail: `references/unstructured-to-units.md`. Upsert identity: `../ns-postgres-rag/references/ingestion-pipeline.md`.

## P2 — Schema-locked extraction

Per text unit, one structured pass:

1. Entities: `name`, `type` (ontology), `description`.
2. Relations: `source`, `target`, `type` (ontology), `description`, **source span**.
3. Optional document-level fields (title, authors, dates) as **nested** `{ value, sources[], reasoning }` — refuse the field if context is insufficient.
4. Document class + confidence bands (classified / low / unclassified; tie margin demotes).

Cap triplets per unit. Validate types against ontology; drop illegal labels. Descriptions feed community reports — bare triples starve global search.

Detail: `references/structured-extraction.md`.

## P3 — Resolve and assemble

1. Normalize mentions against taxonomy / dictionary fields when present; empty taxonomy does not block go-live.
2. Deterministic block, then vector **candidates**, then confirm — `../ns-postgres-rag/references/entity-resolution.md`.
3. Write `edge` only with provenance (unit ids, page, rule, actor, time, confidence). **No co-occurrence edge.**
4. Persist `pending_review` on low-confidence extracts. Those rows are **not GraphRAG facts**. Vector search on their text units remains allowed.
5. Cadastre/key-backed edges skip review; they are facts.

Detail: `references/graph-assembly.md`.

## P4 — Communities and reports

Hierarchical modularity clustering on **fact** edges only (exclude pending_review). Recurse until leaf size is operable. Generate a **community report** per cluster (overview + key entities + relations + cited unit ids). Sparse graphs yield singleton junk — fix extraction density before tuning resolution.

Detail: `references/communities.md`.

## P5 — Dual (triple) embeddings

Embed, with model id + dimension on every row:

| Object | Use |
| ------ | --- |
| Text unit | Vector / hybrid lookup; local evidence |
| Entity description | Anchor mapping for local search |
| Community report | Global / thematic search |

Versioned re-embed: `../ns-postgres-rag/references/ingestion-pipeline.md`.

## P6 — Query routing

Classify intent; do not send every question through community map-reduce.

| Mode | When |
| ---- | ---- |
| **Vector / hybrid** | Topic in one unit; no hop chain |
| **Local** | Named anchors, “how does A reach B”, N≥2 hops |
| **Global** | Themes, corpus-wide “what are the main…” |
| **Explore** | Ambiguous; community then local drill |

Local traversal: capped recursive walk (`../ns-postgres-rag/references/multi-hop-traversal.md`). Default **depth ≤ 5**; executor refuses above cap. Return `path` + provenance + confidence.

**ACL applies before retrieval**, not after. Filtered-out rows look like absence.

Compose answers only from retrieved units/paths. If evidence missing: refuse. Every field that claims a fact carries citations.

Canonical graph query (English wire names):

```
query_knowledge_graph
{ anchor_ids[], anchor_type, edge_types[], max_depth (≤ 5), period?, limit? }
→ { nodes[], edges[] (origin, type, dest, period, source_document_id, page, confidence, created_by), paths[] }
```

Forbidden: free SQL/Cypher-style tools; unbounded depth; treating pending_review as facts.

Operator visualization shows the **query path**, not the whole graph.

Detail: `references/query-modes.md`, `references/access-and-citation.md`.

## P7 — GraphRAG Process Report

Copy `templates/graphrag-process-report.md`. Fill every section. Human approve before `ns-spec-driven`.

## Reference map

| Reference | Read when |
| --------- | --------- |
| `references/ontology.md` | P0; type drift |
| `references/unstructured-to-units.md` | P1; PDFs, OCR, overlap |
| `references/structured-extraction.md` | P2; citations nested in fields |
| `references/graph-assembly.md` | P3; no co-occurrence |
| `references/communities.md` | P4; global search |
| `references/query-modes.md` | P6; local vs global vs vector |
| `references/access-and-citation.md` | ACL, omit-denied, cite-or-refuse |
| `references/process-eval.md` | Golden set, false-link, p95 |
| `references/anti-patterns.md` | Before marking report done |
| `../ns-postgres-rag/references/*` | Schema, resolution, hops, scale |

## Handoff to ns-spec-driven

After **human approval** of Retrieval Design Report **and** GraphRAG Process Report:

```markdown
## GraphRAG implementation planning
- Retrieval report: path (approved)
- Process report: path (approved)
- Ontology: entity types / relation types
- Extract stages: units → extract → resolve → edges → communities → embed
- Query modes: vector | local | global | explore
- Graph query: query_knowledge_graph; max_depth cap
- Eval: citation faithfulness, path precision, false-link, refuse-when-empty
- Out of scope for this skill: application source code
```

## Stop conditions

| Condition | Action |
| --------- | ------ |
| Mode is not GraphRAG | Stay on `ns-postgres-rag`; no extractor graph |
| Similarity or co-occurrence proposed as stored edge | Refuse |
| Ontology not locked | Block P2 |
| Free graph query language | Refuse |
| Competing vector store as default | Stay on `ns-postgres-rag` store |
| Human wants app code now | Reports first; then `ns-spec-driven` only |

## Forbidden

- Application languages, frameworks, vendors, model SKUs
- Co-occurrence or embedding distance as `edge`
- Ingest HITL screens as a v1 requirement (flags yes; review UI later)
- Dumping whole documents into generation
- Answering without citations when a fact is asserted
- Revealing authorization failures to the caller
