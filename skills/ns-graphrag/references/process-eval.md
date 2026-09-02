# Process evaluation

Gates beyond `ns-postgres-rag` recall@k.

## Golden set

Include all archetypes:

- Vector “what does this paper conclude”
- Structured field extract with known quotes
- Local `company → contract → invoice → payment`
- Global theme question
- Ambiguous type (must ask)
- Empty / insufficient context (must refuse)
- ACL: two users, same question, different omission

Questions from the stakeholder corpus beat synthetic trivia.

## Metrics

| Gate | Fail if |
| ---- | ------- |
| Citation faithfulness | Answer span not in retrieved units |
| Refuse-when-empty | Model invents on empty retrieve |
| Path precision | Hop uses pending_review or similarity edge |
| False-link rate | Co-occurrence or distance stored as fact |
| Ontology compliance | Illegal types in extract sample |
| Depth cap | Walk exceeds max_depth |
| p95 | Single-tool / multi-hop budgets missed |
| First token | Operator silent beyond accept SLA |

## Staging

Function homologation on a **slice** of the corpus; performance homologation on **full** index. Do not claim p95 on the slice.

## Regression

Extractor or embedding version change → re-run golden set before cutover. Dual-read until gates pass.
