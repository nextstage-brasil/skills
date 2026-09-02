# Graph assembly

Turn extracts into **surviving identities**, **logical edges**, **evidence rows**, and **mentions**. Similarity never writes `edge`.

## Fact / evidence split

| Layer | Rule |
| ----- | ---- |
| Logical edge | Unique by `source_id + edge_type + target_id`. Upsert on repeat attestation. **`review_status`** from relation confidence mapping — `structured-extraction.md` § Relation confidence → review_status. |
| Confidence on upsert | Strongest wins. Provenance class does **not** downgrade on merge. Promote to `fact` on conflict only. |
| Evidence | Append row per attestation: `edge_id`, document, unit, quoted span, confidence. |

One edge, many evidences — **not** one edge row per file mention.

DDL: `../../ns-postgres-rag/references/schema-and-indexes.md`. Write shape: `../../ns-postgres-rag/references/ingestion-pipeline.md`.

## Provenance classes

| Class | Meaning |
| ----- | ------- |
| `EXPLICIT` | Stated in source content |
| `INFERRED` | Processing output — mapped to `review_status` via relation confidence table (not a separate threshold rule) |
| `DERIVED` | Traversal result — **never persisted** as an edge |

Below-threshold relations map to `pending_review` or `proposal` per the locked mapping table — not admitted as traversable `fact` edges.

## Identity ladder

Ordered per entity type (declare in P0 / process report):

1. Strong registry identifier
2. Secondary identifier
3. Composite attribute match
4. Approximate match → **candidate only**
5. Human decision

**Ban:** normalized name as identity for person-like types — homonyms stay separate until resolved.

Model **extracts identifiers**; deterministic layer **resolves**. Unresolved anchor → ranked **candidates** to caller.

Full merge/split audit: `../../ns-postgres-rag/references/entity-resolution.md`.

## Mentions

Persist unit-to-entity **mention** with **role-in-context** (from extract). Substrate for filtered sets, counts, anchor synthesis — **not** an edge.

## File vs business record

Indexed **file** and **business record** are distinct anchors. One record may own many files.

| Case | Storage |
| ---- | ------- |
| Explicit file-to-file reference in content | Stored doc-to-doc relation |
| Two files share an entity | **Discovered path** at query time — never a stored file-to-file edge |

Same rule as co-occurrence: shared context is not a fact edge.

## Resolution order (pre-persist)

1. Taxonomy / dictionary normalize when fields exist.
2. Deterministic block — keys, declared identifiers (not normalized name alone).
3. Vector block — near-neighbors as **candidates only**.
4. Confirm — key/rule or dual-source. Else leave unmerged or return candidates.

## Proposals

Extraction may emit **proposed** records, attributes, or links. Proposals are not facts, not traversable. Product declares policy: auto-commit, operator confirm, or review queue. Replaces blanket “no HITL on ingest” — flags and proposals coexist.

## Non-fact edge rows

Persist **`review_status`** from the relation-confidence mapping (`structured-extraction.md`). Only **`fact`** rows are traversable; `pending_review` and `proposal` are not. Vector search on text units remains allowed regardless.

## Entity description merge

Same entity in many units → one canonical description after identity merge. Keep unit ids in provenance.

## Optional claims

Time-bounded covariates — separate extract, default **off**. Not a substitute for typed edges.

## Reprocessing

Always permitted. Content hash is operational state, not a gate. New extraction **supersedes** prior knowledge for that file (retire old units, evidence, mentions for that document).

## Role decomposition (implementation)

| Responsibility | Owns |
| -------------- | ---- |
| Identity resolver | Ladder, candidates, merge audit |
| Traversal executor | Per-hop caps, batch expansion, no-bridge |
| Repositories | Entity, logical edge, evidence, mention CRUD |
| Authorization | Predicate every expansion step |
| Cache | Auth context + graph version in key |
| Telemetry | Envelope on every query response |

Class/module layout = `ns-spec-driven`.
