# Planning and memory

## Planning

**Plan ≠ execute.** Separate propose from act.

| Practice | Why |
| -------- | --- |
| Emit plan first | Human or validator catch bad path before side effects |
| Validate plan before run | Schema, allowed tools, budget, policy |
| Optional parallel plans + judge | Compare candidates; pick or merge |
| Report parameter values | Wrong args = common tool failure; surface before Write |

Agent invents steps without locked objective/Evaluation → stop; return Step 1–2.

Long plans raise compounding error. Prefer short plans + checkpoints.

## Memory tiers

| Tier | What | Use for |
| ---- | ---- | ------- |
| **Internal weights** | Model parameters | General skill; domain style only after Fine-Tune justified |
| **Context window (short-term)** | Current thread, plan, recent tool results | Working state this turn/session |
| **External (long-term / RAG)** | Store outside window | Durable facts, history, large corpora |

## Placement rules

- Durable product facts → external / RAG, not hope model "remembers"
- Ephemeral plan + scratch → context window; truncate with care
- Behavior/style locked via Fine-Tune only after Prompt (+ RAG) exhausted
- Do not dump entire corpus into context — retrieval gate first

Document per design: what lives in weights vs window vs external store.
