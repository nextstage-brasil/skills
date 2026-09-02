# Ontology

The ontology is the **closed schema** of the knowledge graph. It is the only vocabulary the extractor may emit.

## Why lock first

Without a lock, extractors invent near-duplicate types, inconsistent relation labels, and unmergeable name variants. That breaks **identity merge**, **traversal correctness**, and **citation integrity** — not merely downstream summaries.

## Illustration vs corpus chain

`company → contract → invoice → payment` is **one illustration**. Derive the corpus’s own chain, identity keys, and mention-only types in P0. A second illustration may be added when a different corpus shape is approved.

## Derivation procedure (blocking)

Do not “lock a list” from a tutorial or by interrogating the human for what the schema already shows.

1. **Read host registry schema and taxonomy fields first.** Graph entity types align to record types answers must join. Do not ask the human for types the schema already defines.
2. **Derive relation types from declared question archetypes.** Each archetype decomposes to a hop chain; the chain names required relation types. Types with no question and no intermediate hop do not earn a slot.
3. **Propose from a corpus sample** — not a canned verb list. Vocabulary copied from reference material is the same bias class as opt-in analytics promoted to mandatory ingest.
4. **Human approves the proposal** as the P0 artifact. Record **ontology version id** on every extract batch.

## What to lock

| Piece | Rule |
| ----- | ---- |
| Entity types | Closed list. One-line definition + in/out examples each. |
| Relation types | Closed list. Directed. Inverse only if traversal needs it. |
| Identity keys | Per-type ladder: registry key vs mention-only. |
| Identifier fields | Per-type extract fields — explicit “do not invent identifiers.” |
| Claims | Optional. Default off. |

Keep the list **small**. Merge types over adding synonyms.

## Role is not type

The part an entity plays **in a document** belongs on the **mention** (`role-in-context`), never as a new entity or edge type. Otherwise vocabulary explodes per document.

## Unmapped-candidate queue

Out-of-vocabulary findings are **counted**, not coerced to the nearest type, not admitted mid-run. Recurring candidates trigger a governed ontology version — human decides. Model infers **instances** from content; it never widens the type set at runtime.

## Prompt / extractor embedding

Insert the **exact** closed enumerations into extractor instructions assembled from the approved artifact — `structured-extraction.md`, `templates/extractor-instruction.template.md`. Validation rejects labels not in the list — no creative relabel pass.

## Evolution

Adding a type = new ontology version + re-extract or targeted backfill. Silent drift mixes versions in one graph. Record version on every extract batch.
