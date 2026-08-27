# Eval baseline (without_skill) — behavior / format failure

## User question

> The model already has the right facts from our docs but keeps answering in the wrong JSON shape and ignores our tone guide. Should we build an agent?

## Verdict

**No. Do not build an agent.**

This is a **behavior / format compliance** problem, not a **capability / reasoning / tool-use** problem. The model already retrieves the right facts. An agent loop (planner, tools, multi-step control flow) does not fix schema shape or voice. It adds latency, cost, and failure modes without addressing the root cause.

---

## Why an agent is the wrong lever

| Symptom | What it usually means | Agent helps? |
|---------|----------------------|--------------|
| Wrong facts / missing context | Retrieval, grounding, tool access | Sometimes |
| Multi-step workflows, side effects, decisions over time | Orchestration, tools, state | Yes |
| Correct facts, wrong JSON shape | Schema / constrained decoding / examples | No |
| Correct facts, wrong tone | Style instructions, exemplars, or SFT | No |

Agents shine when the model must **act** (call APIs, branch on results, persist state). They do not reliably teach a model to emit a fixed JSON contract or match a brand voice.

---

## Recommended path (cheapest effective first)

### 1. Constrain the output (JSON shape) — do this first

- Supply an explicit **JSON Schema** (or OpenAPI-style response model) and use the provider’s **structured output / `response_format` / constrained decoding** path when available.
- Put the exact field names, types, required keys, and enums in the system prompt *and* in the schema — do not rely on prose alone (“return JSON”).
- Add **2–3 few-shot examples** that show the exact shape *and* the desired tone in the string fields.
- Add a cheap **validator** after the call: if schema fails, retry once with the validation errors fed back (“missing `status`; `tone` must be one of …”). That is a repair loop, not an agent product.

### 2. Enforce tone without fine-tuning first

- Move the tone guide into the **system** message as short, testable rules (do / don’t), not a long essay.
- Include **positive and negative exemplars** (good reply vs. the style you reject).
- If tone lives in free-text fields inside JSON, score those fields in evals separately from schema validity so you can see which failure dominates.

### 3. Only escalate if prompts + schema still fail

If after structured outputs + exemplars + one repair retry you still see systematic violations:

- **Supervised fine-tune (SFT)** or preference tuning on (prompt → correctly shaped, correctly toned) pairs. This is the right tool when the model “knows” content but will not reliably obey format/style under distribution shift.
- Keep the same JSON Schema at inference time even after fine-tuning — SFT reduces drift; schema still catches regressions.

### 4. Build an agent only if a different problem appears

Reconsider an agent when you need, for example:

- Tool calls to fetch live data (not static docs already in context)
- Multi-step policies (approve → mutate → confirm)
- Routing across systems with durable state

None of that is implied by “wrong JSON + wrong tone with correct facts.”

---

## Minimal design sketch

```
User query
    → System: facts policy + tone rules (short) + JSON Schema
    → Model (structured / constrained output)
    → Schema validator
         ├─ ok  → return
         └─ fail → one repair pass with validator errors
    → (optional later) SFT model if repair rate stays high
```

No planner. No tool registry. No multi-agent debate.

---

## Eval checklist (so you know you’re done)

1. **Schema pass rate** ≥ target (e.g. 95%+) on a held-out set of prompts.
2. **Tone rubric** (human or LLM-as-judge against the guide) on the string fields — separate metric from schema.
3. **Factual accuracy** stays flat or improves (regression guard — format fixes must not break content).
4. Measure **cost/latency** of schema+repair vs. any agent prototype; agent should lose on both for this failure mode.

---

## Bottom line

Keep the current non-agent (or thin LLM) path. Fix **schema enforcement** and **tone exemplars**; escalate to **fine-tuning** if compliance is still soft. Build an agent only when you need tools or multi-step action — not for JSON shape and tone.
