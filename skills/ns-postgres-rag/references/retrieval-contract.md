# Retrieval contract

Every hit — vector, hybrid, or multi-hop — same return shape.

## Required fields

| Field | Meaning |
| ----- | ------- |
| `ids` | document / chunk / entity ids in play |
| `score` | fused or path score used for rank |
| `path` | ordered node (and edge) ids; length 1 for single-chunk hits |
| `provenance` | why path exists (rules, keys, document ids) |
| `confidence` | 0–1 after merge/edge policy |
| `cut_reason` | why expansion stopped (depth, fanout, score, cycle, none) |
| `error` | classified miss (not prose shrug) |

No path without provenance. No edge implied by score.

## Classified errors

Codes, not free text as only signal:

- `not_found`
- `ambiguous_entity`
- `below_confidence`
- `cap_hit` (depth / fanout)
- `timeout`
- `index_unavailable`

## Illustrative return type

Application languages out of scope. One **illustrative** TypeScript shape: `templates/snippets/retrieval-result.ts.snippet` — copy fields, not a stack choice.
