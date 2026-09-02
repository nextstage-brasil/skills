# Entity resolution

Goal: **stable surviving identity**. Edges attach to that identity, never raw string.

## Identity ladder (ordered per type)

Declare in Retrieval / GraphRAG reports:

1. Strong registry identifier
2. Secondary identifier
3. Composite attribute match
4. Approximate match → **candidate only** (return to caller; no silent merge)
5. Human decision

**Explicit ban:** uniqueness or auto-merge on **normalized name alone** for person-like (and similar homonym-prone) types. Homonyms stay separate until a stronger key confirms.

## Candidates

1. **Deterministic block** first: declared identifier fields, registry keys — not normalized name as sole key.
2. **Vector block** second: near-neighbors of entity or mention embeddings — **candidates only**.
3. Never write `edge` from step 2 alone.

## Merge rules

Record in design report:

- Required key match (e.g. registry id) = auto-merge, confidence high, provenance = key.
- Name-only near-duplicate = human or dual-source confirm; else leave unmerged or return candidates.
- Conflict (two strong keys disagree) = **no merge**; open split/review queue.

## Confidence

Store on `entity` and each logical `edge`. Retrieval contract exposes it. Do not hide low-confidence merges in path.

## Surviving identity

One `entity` row wins. Losers become `entity_alias`. Queries resolve aliases to survivor before traversal.

## Audit

- Merge: from_ids, to_id, rule, actor/system, timestamp.
- Split: reverse aliases, restore identities, **invalidate edges** that used wrong survivor.
- Re-run traversal eval after split/merge waves.

## No edge without evidence

Logical edge row requires surviving `from_id` / `to_id`, `edge_type`, confidence, provenance class, **`review_status`**.

Each attestation → **`evidence`** row with document, unit, quoted text.

Embedding distance is not provenance.
