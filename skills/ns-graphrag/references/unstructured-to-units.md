# Unstructured to text units

Goal: stable, provenance-rich **text units** that generation and extraction both cite.

## Process documents first

1. Bytes → deterministic text (layout-aware where the format needs it). Persist extract version.
2. Failure (empty, unreadable, timeout) → **failure queue**, not silent skip.
3. Attach source identity, page or byte span, mime, ingest time.

Re-extract of the same source id is **idempotent**: same content hash → skip; new hash → new unit set, retire old.

## Why not the whole file

Generation context has a budget. Irrelevant pages dilute attention and raise hallucination. Retrieval must return **likely-answer units**, then generation reads only those.

## Semantic units, not arbitrary cuts

Prefer splitting on section / paragraph / page boundaries. Character windows are a fallback when structure is missing.

| Parameter | Role |
| --------- | ---- |
| Target size | Fit several sentences; not a whole chapter |
| Overlap | Preserve relations that cross a boundary |
| Separators | Breaks, then lines, then spaces — never mid-token when avoidable |

Tutorial-scale starting point (tune on corpus): ~1000–1500 tokens equivalent, overlap ~15–20%. Homologation requires **semantic** units, not fixed-width shreds.

Each unit identity = `document` natural key + ordinal **or** content hash of unit text.

## Page metadata

Keep page (or span) on the unit. Citations and graph provenance need it. Dropping page to “simplify” the index breaks trust.

## Historical load vs incremental

Same pipeline. Incremental path = new/changed source events. Historical walker uses the same stages and keys. Interactive query jobs **preempt** bulk ingest.

## Embed later

This stage does **not** write edges. It writes units (and later embeddings). Graph facts wait for P2–P3.
