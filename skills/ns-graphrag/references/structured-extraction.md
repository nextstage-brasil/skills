# Schema-locked extraction

Two jobs share one discipline: **(A)** graph primitives from each text unit, **(B)** document-level structured fields. Both use a **closed schema**, **verbatim citations**, and **refuse** when evidence is missing.

## Why structured generation

Free prose from the model is not a table. A locked schema (field names, types, nested citation objects) is the contract between extract and store. Invalid types never reach `entity` / `edge`.

## Graph primitives (per text unit)

For each unit, extract up to a **cap** of triplets (start ~20; lower if units are small).

**Entity:** `name`, `type` (ontology), `description` (role in this unit — not an encyclopedia article).

**Relation:** `source`, `target`, `type` (ontology), `description` (one sentence), `span` (verbatim quote from the unit).

Bare triplets without descriptions starve community reports. Descriptions are not optional garnish.

Invalid ontology labels → drop the object, count as extract error. Do not coerce.

## Document-level fields

When the operator wants a row (title, summary, year, authors, …), each field is nested:

```
value | sources[] (verbatim unit text) | reasoning
```

If the unit set cannot support `value`, the field is **unknown** — not guessed. Same rule as grounded Q&A: “If you don’t know, say you don’t know.”

## Grounded Q&A vs extract

Same retrieve → generate shape:

1. Retrieve top-k units for the question (vector / hybrid).
2. Instruct: answer **only** from context; never invent.
3. Return answer + sources + reasoning (schema-locked).

GraphRAG **adds** hops and community reports; it does not remove this cite-or-refuse core.

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

## Models by role

Use cheaper/faster models for high-volume extract and summaries; stronger models for composition and hard routing. Record **role**, not a vendor SKU, in the process report.

## Parallelism and cost

Extract is embarrassingly parallel per unit. Bound in-flight work. Partial failure → those units to failure queue; committed units stay.
