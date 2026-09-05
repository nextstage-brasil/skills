# Adaptation ladder

Blocking order. Never skip earlier gate.

| Gate | When | Stop signal |
| ---- | ---- | ----------- |
| **Evaluation** | Always first | Metrics / rubrics / functional correctness locked |
| **Prompt** | Default start after Evaluation | In-context learning exhausted; failures remain |
| **RAG** | Failures **information-based** — missing private, recent, or corpus knowledge | Retrieval design enough for info gap |
| **Agent** | Must perceive environment, decide, act with tools beyond passive retrieval, learn from outcomes | Non-agent path insufficient |
| **Fine-Tune** | Failures **behavior-based** — format, instruction-following, domain style — after Prompt (+ RAG if needed) | Behavior gap closed or accepted |

Both info + behavior: **RAG first** (cheaper), then Fine-Tune. Combine when both remain.

## Decision matrix

| Failure type | Prefer | Avoid jumping to |
| ------------ | ------ | ---------------- |
| Missing facts / private docs / freshness | RAG (after Prompt) | Agent, Fine-Tune |
| Wrong format / tone / instruction follow; facts OK | Prompt then Fine-Tune | Agent |
| Multi-step decide + tool act + outcome feedback | Agent (after Eval + Prompt; RAG if info gap) | Fine-Tune-as-agent-substitute |
| Deterministic pipeline / single retrieval / one tool call | Prompt or RAG or single-shot tool | Agent |
| Neither info nor behavior (process / product / data) | Not FM adaptation — escalate product/process | Any FM technique as cover |

## When NOT to Agent

- FAQ / doc Q&A → Prompt + RAG
- Multi-hop facts across entities/docs (N≥2; no single doc holds chain) → RAG path; hand off `ns-postgres-rag` then `ns-graphrag` when mode is relational GraphRAG
- Fixed ETL / rule pipeline → rules, not Agent
- One API call after classify → Prompt + single tool
- Success needs high reliability on long chains — compound error risk unless HITL / validation / short plans

## Compounding error

Per-step accuracy multiplies. 10 steps at 90% ≈ 35% end-to-end. Write tools amplify blast radius. Prefer shorter plans, plan validation, Guardrails on writes.
