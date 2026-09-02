# Retrieval contract

Every hit — vector, hybrid, set filter, or multi-hop — same return shape.

## Required fields

| Field | Meaning |
| ----- | ------- |
| `ids` | document / chunk / entity ids in play |
| `score` | fused or path score used for rank |
| `path` | ordered node (and edge) ids; length 1 for single-chunk hits |
| `provenance` | why path exists (rules, keys, document ids) |
| `confidence` | 0–1 after merge/edge policy |
| `cut_reason` | why expansion stopped (depth, fanout, score, cycle, auth, none) |
| `error` | classified miss (not prose shrug) |

No path without provenance. No edge implied by score.

## Telemetry envelope

Attach on every graph or hybrid response:

| Field | Meaning |
| ----- | ------- |
| `hops_executed` | Depth steps completed |
| `nodes_examined` | Expanded node count |
| `nodes_returned` | Nodes in result after filters |
| `edges_examined` | Edge rows considered |
| `edges_returned` | Edges in result |
| `stage_latencies_ms` | Per-stage timing map |
| `cache_hit` | Boolean |

Aligns with `ns-graphrag` query contract.

## Evidence inclusion

Request flag `include_evidence` (default off for lean paths; on for cited answers):

- When true: attach `evidence[]` per edge — `document_id`, `unit_id`, `quoted_text`, `confidence`.
- Set/count hits: per-row `mention` or attribute provenance in the same shape.

## Classified errors

Codes, not free text as only signal:

- `not_found`
- `ambiguous_entity` (prefer returning `candidates[]` when product allows)
- `below_confidence`
- `cap_hit` (depth / fanout)
- `auth_pruned`
- `timeout`
- `index_unavailable`

## Illustrative return type

Application languages out of scope. One **illustrative** TypeScript shape: `templates/snippets/retrieval-result.ts.snippet` — copy fields, not a stack choice.
