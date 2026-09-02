# Graph assembly

Turn extracts into **surviving identities** and **fact edges**. Similarity never writes `edge`.

## Resolution order

1. **Taxonomy / dictionary normalize** — map extracted terms onto maintained fields when present. Empty fields do not block go-live; they only skip this step.
2. **Deterministic block** — keys, normalized names, well-known identifiers.
3. **Vector block** — near-neighbors as **candidates only**.
4. **Confirm** — key/rule or dual-source. Else leave unmerged.

Full merge/split audit: `../../ns-postgres-rag/references/entity-resolution.md`.

## Edge write policy

An `edge` row requires:

- Surviving `from_id` / `to_id`
- Ontology `edge_type`
- Provenance: text-unit ids, document id, page, rule id, creator, timestamp
- `confidence`
- Period if the relation is time-bounded

**Co-occurrence is not an edge.** Two names in one paragraph are a candidate signal for the extractor, not a stored fact.

Cadastre / foreign-key / explicit-document links are first-class facts and skip review queues.

## pending_review vs facts

Low-confidence extractor edges persist with `pending_review`. **Local/global GraphRAG traversal ignores them.** Vector search over their text units remains allowed so the operator can still find the passage.

No human-in-the-loop **pause** on ingest. Flags are enough for a later review surface.

## Entity and relation summarization

The same entity appears in many units. Merge descriptions into one canonical description (extract-role model) **after** identity merge. Relation descriptions may be concatenated or re-summarized; keep unit ids in provenance.

## Optional claims

Positive, time-bounded statements (covariates) are a separate extract. Default **off**. They are not a substitute for typed edges.

## Idempotency

Re-OCR / re-extract of a document: delete or version prior units and derived edges for that `document_id`, then rewrite. Do not duplicate triplets.
