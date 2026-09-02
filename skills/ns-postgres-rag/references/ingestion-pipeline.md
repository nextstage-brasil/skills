# Ingestion pipeline

Shape: **extract → chunk → embed → idempotent upsert**; graph path adds **resolve → logical edge upsert → evidence append → mention write**. No application language names. SQL natural keys + hashes = contract.

## Extract

Deterministic text from bytes. Persist extract version. Score text quality band. Failure (unreadable, empty, timeout) → **failure queue**, not silent skip. Retry does not duplicate `document` rows.

## Chunk

Stable ordinals per `document_id`. Character offsets on each chunk. Chunk identity = document natural key + ordinal **or** content hash of chunk text. Overlap policy in report. Giant chunks forbidden.

## Embed

Batch with backpressure (bounded in-flight). Model id + dimension on every chunk. Partial batch failure: those rows to failure queue; committed batches stay.

## Idempotent upsert (document / chunk)

Natural key on `document` = **file identity** (source URI or file id). Optional **`business_record_id`** links the file to its cadastre anchor when file ≠ record. **Content hash** of extracted bytes.

| Hash vs stored | Action |
| -------------- | ------ |
| Same | no-op (skip embed) |
| Different | new chunk set; retire old chunks (delete or version flag) |
| New key | insert |

Upsert = only write path. Rebuild jobs same keys.

## Graph persist (logical edge + evidence + mention)

**Batch writes** — not per-entity single-row statements in a loop.

1. Resolve entities to surviving ids (identity ladder).
2. **Upsert logical edge** on `(from_id, edge_type, to_id)`:
   - Set **`review_status`** from relation confidence per `ns-graphrag` structured-extraction mapping (`fact` | `pending_review` | `proposal`); do not rely on column default.
   - On conflict: `confidence = GREATEST(existing, new)`; do not downgrade `provenance_class`; update `review_status` only when promoting to `fact`.
   - `RETURNING edge_id`.
3. **Append evidence** row: `edge_id`, document, unit, quoted span, confidence.
4. **Upsert mention**: unit, entity, `role_in_context`.

Repeated attestation → one edge row, N evidence rows.

Reprocess document: retire prior units, evidence, mentions for that `document_id`; supersede with new extract.

## Failure queue

Poison payloads isolated. Operator replay by key. Metrics: queue depth, age, reprocess success.

## Versioned re-embed

New model = new `embedding_version` (column or table). Backfill in partitions. Dual-read until eval gates pass; then cut over. In-place overwrite of only vector column = anti-pattern.

## Backfill without downtime

Load new partition or shadow table. Swap when `ANALYZE` + eval gates pass. Old partition readable until cutover. Do not lock live search for 1MM+ rebuild.
