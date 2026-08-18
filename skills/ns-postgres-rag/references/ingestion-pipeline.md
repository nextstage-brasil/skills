# Ingestion pipeline

Shape: **extract → chunk → embed → idempotent upsert**. No application language names. SQL natural keys + hashes = contract.

## Extract

Deterministic text from bytes. Persist extract version. Failure (unreadable, empty, timeout) → **failure queue**, not silent skip. Retry does not duplicate `document` rows.

## Chunk

Stable ordinals per `document_id`. Chunk identity = document natural key + ordinal **or** content hash of chunk text. Overlap policy in report. Giant chunks forbidden.

## Embed

Batch with backpressure (bounded in-flight). Model id + dimension on every chunk. Partial batch failure: those rows to failure queue; committed batches stay.

## Idempotent upsert

Natural key on `document` (source URI or business id). **Content hash** of extracted bytes.

| Hash vs stored | Action |
| -------------- | ------ |
| Same | no-op (skip embed) |
| Different | new chunk set; retire old chunks (delete or version flag) |
| New key | insert |

Upsert = only write path. Rebuild jobs same keys.

## Failure queue

Poison payloads isolated. Operator replay by key. Metrics: queue depth, age, reprocess success.

## Versioned re-embed

New model = new `embedding_version` (column or table). Backfill in partitions. Dual-read until eval gates pass; then cut over. In-place overwrite of only vector column = anti-pattern.

## Backfill without downtime

Load new partition or shadow table. Swap when `ANALYZE` + eval gates pass. Old partition readable until cutover. Do not lock live search for 1MM+ rebuild.
