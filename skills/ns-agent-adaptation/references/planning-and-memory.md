# Planning and memory

## Planning

**Plan ≠ execute.** Separate propose from act.

| Practice | Why |
| -------- | --- |
| Emit plan first | Human or validator catch bad path before side effects |
| Validate plan before run | Schema, allowed tools, budget, policy |
| Optional parallel plans + judge | Compare candidates; pick or merge |
| Report parameter values | Wrong args = common tool failure; surface before Write |

Agent invents steps without locked objective/Evaluation: stop; return Step 1–2.

Long plans raise compounding error. Prefer short plans + checkpoints.

## Memory tiers

| Tier | What | Use for |
| ---- | ---- | ------- |
| **Internal weights** | Model parameters | General skill; domain style only after Fine-Tune justified |
| **Context window (short-term)** | Current thread, plan, recent tool results | Working state this turn/session |
| **Episodic (external)** | Event log / turn history outside window | Reconstruct what happened; audit trail |
| **Semantic (external)** | Durable profile, preferences, facts | Stable attributes across sessions |

External long-term = episodic **and/or** semantic — not one blob. RAG corpora sit under semantic when facts are durable retrieval targets.

## Placement rules

- Durable product facts: semantic external / RAG, not hope model "remembers"
- Events / what ran: episodic store; truncate window with care
- Ephemeral plan + scratch: context window
- Behavior/style locked via Fine-Tune only after Prompt (+ RAG) exhausted
- Do not dump entire corpus into context — retrieval gate first

### Retention and liability

Persistent memory = **compliance liability**. Deletion must be **executable** (tenant purge, user erasure). Absence of long-term memory = **valid design outcome** — prefer when retention risk outweighs benefit. Document the choice.

Document per design: what lives in weights vs window vs episodic vs semantic vs none.

## Reflection

Critique in a **separate** call after draft — ideally different model family. Cost = one extra invoke. Skip unless a quality gate pays for it. Runtime shape: see `ns-langgraph-agents` `references/architectures.md` (Reflection).

## Reality-test gate

Before design locks (Agent path). All five:

| Check | Ask |
| ----- | --- |
| Long-term memory off | What breaks? |
| Planning halved | What breaks? |
| Every tool | Frequent real use case? |
| Final action | Reversible? |
| Whole design | Fits locked latency + cost budget? |

Fail any → cut before lock. Anti-over-engineering gate.
