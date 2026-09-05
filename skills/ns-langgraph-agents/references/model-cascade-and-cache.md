# Model cascade and cache

Cost-sensitive high-volume turns. Not a substitute for topology choice (`architectures.md`).

## Cascade

Cheapest eligible tier answers first. Escalate only on **post-generation** confidence signals already in doctrine:

| Signal | Source |
| ------ | ------ |
| Retrieval / evidence quality | `evidence-and-fidelity.md` |
| Answer confidence + HITL bands | `capability-governance.md` |

| Rule | Meaning |
| ---- | ------- |
| Always-scale categories | Bypass cascade; strong tier first |
| Escalation | Deterministic after generation — **no** pre-generation LLM hop |
| Worst-case cost/latency | **Sum** of tiers tried — when cascade stops paying, lock strong-only |

### Reconciliation — not `intent_classify`

Dedicated `intent_classify` hop stays **FORBIDDEN** (`anti-patterns.md`). Cascade adds **no** pre-generation LLM router. Escalation = code on confidence signals after a tier produces output. Do not invent an intent node to pick the model.

`LLM_LIGHT_*` in `context-window-and-tokens.md` = fixed summarization role — not this cascade.

## Semantic cache

| Rule | Detail |
| ---- | ------ |
| Key | Embedding similarity + domain-calibrated threshold |
| Key must include | Tenant, authorization context, corpus version |
| Invalidate | Source document change — not only graph/catalog version bump |
| Forbidden | Always-scale categories; regulated outputs |

Hit = skip generation only when policy allows. Miss / forbidden: normal cascade or strong tier.

## Prompt cache

Stable prefix for provider reuse = **`base_invariant` (motor)** when unchanged — not the persona/`injected` body (layer 1 may mode-resolve). Keep the **seven-layer compose order** fixed (`prompt-and-capability-injection.md`). Measure via SSE `usage.cached_tokens` (provider cache_read maps there — not an envelope field named `cache_read`). Do not invent a second metric SoT.
