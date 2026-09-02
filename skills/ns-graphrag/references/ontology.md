# Ontology

The ontology is the **closed schema** of the knowledge graph. It is the only vocabulary the extractor may emit.

## Why lock first

Without a lock, extractors invent near-duplicate types (`COMPANY` vs `FIRM` vs `ORGANIZATION`), inconsistent relation labels, and unmergeable name variants. Communities then cluster noise.

## What to lock

| Piece | Rule |
| ----- | ---- |
| Entity types | Closed list. Each type has a one-line definition and in/out examples. |
| Relation types | Closed list. Directed. Inverse named only if traversal needs it. |
| Identity keys | Which types have a cadastre/registry key vs mention-only. |
| Claims | Optional. Default off. Enable only after prompt eval on a labeled sample. |

Keep the list **small**. Prefer merging types over adding a type for every synonym.

## Domain mapping

Map product nouns onto types. Canonical English example remains `company`, `contract`, `invoice`, `payment` plus supporting types (person, document, organization) as the corpus requires.

Do not copy a tutorial ontology (legislation, lawsuits, …) into an unrelated corpus.

## Prompt embedding

Insert the **exact** type lists into the extractor instructions. Validation layer rejects any label not in the list — do not “fix” illegal labels with a second creative pass.

## Evolution

Adding a type = new extractor version + re-extract or targeted backfill. Silent ontology drift mixes versions in one graph. Record ontology version on every extract batch.
