# Schema-locked extraction

Two jobs share one discipline: **(A)** graph primitives from each text unit, **(B)** document-level structured fields. Both use a **closed schema**, **verbatim citations**, and **refuse** when evidence is missing.

## Why structured generation

Free prose from the model is not a table. A locked schema (field names, types, nested citation objects) is the contract between extract and store. Invalid types never reach `entity` / logical `edge` / `evidence` / `mention`.

Descriptions justify **anchor mapping**, **resolution**, and **composition** — not thematic summaries.

## Graph primitives (per text unit)

For each unit, extract up to a **cap** of triplets (start ~20; lower if units are small).

**Entity:** `name`, `type` (ontology), `description` (role in this unit), **`role-in-context`** (drives set filters and synthesis), **identifier fields** (per-type declared set).

**Relation:** `source`, `target`, `type` (ontology), `description` (one sentence), `span` (verbatim quote), provenance class `EXPLICIT` | `INFERRED`, **`confidence`** (0–1).

Invalid ontology labels → drop the object, count as extract error. Do not coerce. Out-of-vocabulary → **unmapped-candidate** queue.

## Relation confidence → review_status

Persist maps relation **`confidence`** × **`provenance_class`** to exactly one **`review_status`** (distinct from document-class bands). Lock numeric cutoffs in the process report; examples below are placeholders:

| Condition | `review_status` |
| --------- | --------------- |
| `EXPLICIT` and confidence ≥ high cutoff (e.g. 0.80) | `fact` |
| `EXPLICIT` and confidence in mid band (e.g. 0.50–0.79) | `pending_review` |
| `INFERRED` and confidence ≥ infer cutoff (e.g. 0.70) | `pending_review` |
| `INFERRED` below infer cutoff, or explicit below mid band | `proposal` |

On upsert conflict: promote to `fact` only when the new attestation satisfies the `fact` row. Cite this table from P4 persist — do not duplicate numbers in `ns-postgres-rag`.

## Identifier capture

Per entity type, declare which identifier fields the extractor may emit. Rule: **do not invent identifiers** — emit only what appears in the unit text. Resolution is not the extractor’s job.

Taxonomy normalization (map surface terms onto dictionary fields) happens at extract time when fields exist.

## Document-level fields

When the operator wants a row (title, summary, year, authors, …), each field is nested:

```
value | sources[] (verbatim unit text) | reasoning
```

If the unit set cannot support `value`, the field is **unknown** — not guessed.

## Grounded Q&A vs extract

Same retrieve → generate shape:

1. Retrieve top-k units for the question (vector / hybrid).
2. Instruct: answer **only** from context; never invent.
3. Return answer + sources + reasoning (schema-locked).

GraphRAG **adds** hops, mentions, and evidence; it does not remove cite-or-refuse.

## Document class and confidence

When the corpus mixes document kinds, classify each document (not each unit) with a score.

Suggested bands (lock numbers in the process report):

| Band | Meaning |
| ---- | ------- |
| ≥ high threshold (e.g. 0.80) | Classified |
| mid band (e.g. 0.50–0.79) | Low confidence; `pending_review`; still embed |
| below ask threshold | `unclassified` |
| top-two scores within tie margin | Demote one band |

All classes are processed equally unless product policy says otherwise. Class is a **filter after ACL**, not a substitute for ACL.

## Extractor instruction contract

Instructions are **assembled from the approved ontology artifact** — never hand-maintained in parallel.

| Requirement | Detail |
| ----------- | ------ |
| Source of truth | P0 ontology artifact |
| Version | Ontology version id in instruction header |
| Regeneration | Re-build when ontology changes |
| Output schema | Closed enums for types and relation types; per-type identifier fields; evidence + **`confidence`** + **`provenance_class`** on every relation |

Mandatory constraints in the instruction body:

- Use only the supplied unit text — no external knowledge
- No invented identifiers
- No identity resolution or record ids in output
- No relation from mere co-occurrence — emit stated/inferable links with **`confidence`** and **`provenance_class`**; **no extract-time cutoff** (persist maps to `review_status` via § Relation confidence → review_status)
- Verbatim evidence span for every relation
- Capture entity **role-in-context** for this text
- Out-of-vocabulary → unmapped candidate, not nearest type
- Refuse a field instead of guessing

Template: `templates/extractor-instruction.template.md`. Rendering and calling code = `ns-spec-driven`.

## Models by role

Use cheaper/faster models for high-volume extract; stronger models for composition and hard routing. Record **role**, not vendor SKU, in the process report.

## Parallelism and cost

Extract is embarrassingly parallel per unit. Bound in-flight work. Partial failure → those units to failure queue; committed units stay.
