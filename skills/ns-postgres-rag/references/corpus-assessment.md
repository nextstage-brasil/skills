# Corpus assessment

Gate 1 from **source tree + data sample**. Ask human only for gaps repo cannot show.

## Scan order

1. Migrations / SQL: tables, `vector`, `tsvector`, FTS configs, entity/edge.
2. Postgres version and `CREATE EXTENSION` (or equivalent) in repo.
3. Document stores: paths, MIME, parsers present.
4. Sample files: size distribution, language, structure (prose vs tables vs scans).
5. Question log or issue text: archetypes (topic, factoid, multi-hop).

## File type inventory

| Record | Source |
| ------ | ------ |
| Format mix (pdf, html, md, office, image-OCR) | glob + sample |
| Avg / p95 bytes per file | sample or object-store listing |
| Extractable text vs image-only | sample |
| Link density (explicit ids, filenames, citations) | sample |

1MM+ files: sample rate × expected growth. Toy fixture ≠ production volume.

## Chunks per document

Estimate from extractable text, not file count.

| Heuristic | Typical |
| --------- | ------- |
| Short memo / ticket | 1–3 chunks |
| Contract-length prose | 8–40 |
| Mixed tables + clauses | higher; table rows atomic |

Giant chunks kill recall, blow HNSW memory. Target token band in report. One document’s chunks via `document_id`.

## Embedding dimensionality

Read model card from project config if present. Else state assumption (example: 1536 or 3072). Index bytes ≈ `chunks × dims × 4` plus row overhead.

Model change = new versioned column or table. Never overwrite in place — `references/ingestion-pipeline.md`.

## Index and storage projection (1MM+ files)

Replace with inventory numbers:

- files `F`, chunks/file `C`, dims `D`
- vector heap ≈ `F × C × D × 4` bytes
- HNSW often **1.2–2×** heap
- `tsvector` + GIN: extra; budget separate
- entity/edge: row count from entity density, not file count

State p95 query RAM vs `maintenance_work_mem` / `hnsw.iterative_scan` in `references/operations-and-scale.md`.

## Reprocess rate

| Driver | Effect |
| ------ | ------ |
| Parser / chunker change | re-chunk + re-embed affected docs |
| Embedding model version | versioned backfill; dual-read until cutover |
| High mutability (edits, deletes) | idempotent upsert on natural key + content hash; tombstones |

Mutability high + F huge: partition, backfill by partition. Full rebuild as default = anti-pattern at 1MM+.
