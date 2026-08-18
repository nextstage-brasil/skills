# Entity resolution

Goal: **stable surviving identity**. Edges attach to that identity, never raw string.

## Candidates

1. **Deterministic block** first: normalized key (trim, case, punctuation, well-known id formats).
2. **Vector block** second: near-neighbors of entity or mention embeddings — **candidates only**.
3. Never write `edge` from step 2 alone.

## Merge rules

Record in design report:

- Required key match (e.g. registry id) = auto-merge, confidence high, provenance = key.
- Name-only near-duplicate = human or dual-source confirm; else leave unmerged.
- Conflict (two strong keys disagree) = **no merge**; open split/review queue.

## Confidence

Store on `entity` cluster and each `edge`. Retrieval contract exposes it. Do not hide low-confidence merges in path.

## Surviving identity

One `entity` row wins. Losers become `entity_alias`. Queries resolve aliases to survivor before traversal.

## Audit

- Merge: from_ids, to_id, rule, actor/system, timestamp.
- Split: reverse aliases, restore identities, **invalidate edges** that used wrong survivor.
- Re-run traversal eval after split/merge waves.

## No edge without evidence

Edge row requires:

- `from_id` / `to_id` as surviving entities (or typed document-backed records)
- `edge_type`
- provenance: rule id **and** supporting keys or document ids
- confidence

Embedding distance is not provenance.
