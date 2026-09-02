# Process evaluation

Gates beyond `ns-postgres-rag` recall@k.

## Golden set

Include all answer shapes and persistence cases:

| Case | Assert |
| ---- | ------ |
| Vector / unit | Single-unit question with quote |
| Structured field extract | Nested value/sources/reasoning |
| Path | Multi-hop chain across documents |
| Filtered set + time window | Predicate + period filter; per-row citation |
| Count / group-by | Aggregate with per-row provenance |
| Anchor synthesis | Scoped summary with per-claim spans |
| Scope restriction | Collection or origin filter before rank |
| Unregistered mention | Labeled, not silently promoted |
| Repeated attestation | One logical edge, multiple evidence rows; `review_status` from confidence × provenance_class mapping; promote to `fact` only on conflict |
| Discovery (only if layer on) | Cited hypotheses; no write-back |
| Ambiguous type | Must ask or return candidates |
| Empty / insufficient | Must refuse |
| ACL | Two users, same question, different omission |

Questions from the stakeholder corpus beat synthetic trivia.

## Metric families

| Family | Measures |
| ------ | -------- |
| Resolution | Precision / recall on identity merge |
| Relation extract | Precision / recall on typed relations |
| Path accuracy | Correct hops vs ground truth |
| Evidence | Precision / recall on evidence spans |
| Faithfulness / groundedness | Answer supported by retrieved spans |
| Set completeness | Filtered population coverage |
| Latency | p95 per shape; multi-hop 2–5 |
| Cost / tokens | Extract and compose accounting |

A judge model may score support, path validity, and unsupported extrapolation — but does **not** replace deterministic metrics where ground truth exists.

## Staging

Function homologation on a **slice** of the corpus; performance homologation on **full** index. Do not claim p95 on the slice.

## Regression

Extractor, ontology, or embedding version change → re-run golden set before cutover. Dual-read until gates pass.
