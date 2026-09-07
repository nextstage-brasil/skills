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
| Always-escalate categories (HITL: always-scale) | Bypass cascade; strong tier first |
| Escalation | Deterministic after generation — **no** pre-generation LLM hop |
| Worst-case cost/latency | **Sum** of tiers tried — when cascade stops paying, lock strong-only |

### Reconciliation — not `intent_classify`

Dedicated **LLM** `intent_classify` hop **FORBIDDEN** (`anti-patterns.md`). Cascade = **no** pre-generation LLM router. Escalate = code on post-generation confidence. No intent node to pick model.

**Allowed:** deterministic Gateway routing from ADR categories — rule / cheap non-LLM / embedding (`ns-agent-architecture` `gateway-calibration.md`). Same category may set model tier + Multi-Index key. Still not LLM hop before generation.

`LLM_LIGHT_*` in `context-window-and-tokens.md` = fixed summarization role — not this cascade.

## Semantic cache

| Rule | Detail |
| ---- | ------ |
| Key | Embedding similarity + **measured** threshold on real query pairs for this embedding model + language |
| Key must include | Tenant, authorization context, corpus version |
| Threshold | Calibrate margin between near-paraphrase and unrelated-topic on project data — **forbidden** to copy course or demo constants |
| Invalidate | Source document change; corpus version bump; prompt version change |
| Forbidden | Always-escalate (always-scale) categories; regulated outputs |

Hit = skip generation only when policy allows. Miss / forbidden: normal cascade or strong tier.

## Prompt cache

Stable prefix for provider reuse = **`base_invariant` (motor)** when unchanged — not the persona/`injected` body (layer 1 may mode-resolve). Keep the **seven-layer compose order** fixed (`prompt-and-capability-injection.md`). Measure via SSE `usage.cached_tokens` (provider cache_read maps there — not an envelope field named `cache_read`). Do not invent a second metric SoT.
