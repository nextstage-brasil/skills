# Interview transcript — eval-3-behavior-finetune (with_skill)

**Skill:** ns-agent-engineering  
**Language locked:** English (user opening)  
**Mode:** Grill-me simulation (user accepts every recommended answer)

---

## Opening context (user)

> The model already has the right facts from our docs but keeps answering in the wrong JSON shape and ignores our tone guide. Should we build an agent?

---

## Intro

I'll treat this as foundation-model adaptation design only — no framework, no implementation. Agent is justified only after Evaluation, failure diagnosis, and the adaptation ladder. One question per turn; I'll give a recommended answer and a product example each time.

---

### Turn 1 — Objective

**Q1:** What is the overall objective for this system?

**Recommended answer:** Reliably emit answers that match a locked JSON schema and brand tone while preserving factually correct content already present in the docs — [rationale] format and tone are the failure surface, not knowledge gaps.

**Example (this use case):** User asks “What is the return window?”; model returns correct “30 days” fact but wraps it in free prose or wrong keys instead of `{"answer":"...","tone":"supportive"}`.

**User reply:** Accepted recommended answer.

**Locked:** Objective = schema-compliant, tone-compliant answers with correct doc facts retained.

---

### Turn 2 — End-to-end I/O

**Q2:** In one sentence, what is the end-to-end journey from input to output?

**Recommended answer:** A user question (plus optional session context) in → a single structured JSON response out that validates against our schema and follows the tone guide — [rationale] keeps the surface a single-shot generation problem, not a multi-act loop.

**Example (this use case):** Input: “Can I exchange a gift?” → Output: valid JSON with fields `answer`, `citations`, `tone_flags` matching the tone guide, no agent tool trail.

**User reply:** Accepted recommended answer.

**Locked:** Input = user question (+ optional context); Output = one schema-valid, tone-aligned JSON payload.

---

### Turn 3 — Evaluation criteria (blocking)

**Q3:** What does “done” mean — which rubrics or functional checks must pass before we call the system successful?

**Recommended answer:** Binary schema validation pass rate ≥ target (e.g. 95%+ on golden set), graded tone-rubric pass ≥ target, and factual agreement with source docs unchanged from current baseline — [rationale] separates behavior (shape/tone) from information (facts already OK).

**Example (this use case):** Golden item expects keys `answer` + `policy_id`; response with correct policy text but missing `policy_id` is a hard fail even though facts are right.

**User reply:** Accepted recommended answer.

**Locked:** Evaluation = (1) JSON schema functional correctness, (2) tone rubric, (3) factual parity with docs baseline. Usefulness threshold = schema + tone thresholds on golden set; business link = reduced human rewrite / support QA rework.

---

### Turn 4 — Failure diagnosis (blocking)

**Q4:** Are the remaining failures information-based (missing/private/recent facts), behavior-based (format, instruction-following, style), both, or neither?

**Recommended answer:** Behavior-based — [rationale] user states facts from docs are already correct; failures are wrong JSON shape and ignored tone guide.

**Example (this use case):** Model cites the right FAQ paragraph but outputs Markdown bullets instead of JSON and uses casual slang banned by the tone guide.

**User reply:** Accepted recommended answer.

**Locked:** Failure diagnosis = **behavior** (not information, not both, not neither).

---

### Turn 5 — Adaptation path: Prompt gate

**Q5:** Have we exhausted Prompt / in-context learning (schema + tone examples, few-shots, explicit constraints) before considering heavier adaptation?

**Recommended answer:** Treat Prompt as the next mandatory gate: ship stronger schema-in-prompt, few-shot shape/tone exemplars, and negative examples; only escalate if golden-set schema/tone still fail after Prompt exhaustion — [rationale] ladder forbids jumping past Prompt after Evaluation.

**Example (this use case):** Add 3 few-shots of valid JSON + tone-compliant phrasing for refunds/exchanges; re-measure schema and tone pass rates.

**User reply:** Accepted recommended answer.

**Locked:** Prompt = required next adaptation; not yet exhausted until measured retry fails.

---

### Turn 6 — Adaptation path: RAG gate

**Q6:** Given facts are already correct from docs, do we need RAG as a primary fix?

**Recommended answer:** No as primary path — [rationale] failures are not information-based; RAG does not fix schema or tone instruction-following.

**Example (this use case):** Retrieving the tone guide PDF into context may help Prompt slightly, but if the model already “knows” facts and still breaks JSON/tone, retrieval alone is not the diagnosis.

**User reply:** Accepted recommended answer.

**Locked:** RAG = skip as primary; optional light inclusion of tone/schema snippets only as Prompt material, not as info-gap RAG product.

---

### Turn 7 — Adaptation path: Agent gate

**Q7:** Should we build an Agent (perceive, decide, act with tools beyond passive retrieval, learn from outcomes) as the primary fix?

**Recommended answer:** No — reject Agent as primary fix — [rationale] problem is single-shot format/tone behavior with facts OK; Agent adds multi-step compounding error without addressing instruction-following/format.

**Example (this use case):** An agent that “checks schema with a validator tool then retries” still needs the model to emit valid JSON; that is Prompt/Fine-Tune territory, not tool orchestration.

**User reply:** Accepted recommended answer.

**Locked:** Agent = **rejected** as primary adaptation. Explicit non-agent path.

---

### Turn 8 — Adaptation path: Fine-Tune gate

**Q8:** After Prompt is exhausted, should we Fine-Tune for JSON shape and tone adherence?

**Recommended answer:** Yes — Fine-Tune after Prompt exhaustion for behavior-based gaps (format + domain style) — [rationale] adaptation ladder places Fine-Tune for instruction-following/format/style when facts are already present.

**Example (this use case):** Supervised pairs: question → golden schema JSON with approved tone; evaluate schema/tone lift vs Prompt-only baseline.

**User reply:** Accepted recommended answer.

**Locked:** Fine-Tune = yes after Prompt exhausted. Path = **Prompt → Fine-Tune**. Agent not on path.

---

### Turn 9 — Guardrails & observability (non-agent, light)

**Q9:** What input/output controls and logs do we need so schema/tone regressions are diagnosable quickly?

**Recommended answer:** Hard reject or repair-gate on schema-invalid outputs; log prompt version, model id, schema pass/fail, tone rubric scores, and golden-set deltas (MTTD/MTTR mindset) — [rationale] behavior failures need measurable output checks, not agent traces.

**Example (this use case):** If `policy_id` missing, do not ship to client; record failure class `schema_missing_key` with prompt/Fine-Tune artifact version.

**User reply:** Accepted recommended answer.

**Locked:** Guardrails = schema validation (hard); Observability = versioned prompt/FT artifacts + schema/tone metrics.

---

### Turn 10 — MVP scope

**Q10:** What is in vs out for the first MVP of this adaptation path?

**Recommended answer:** In: Prompt hardening + golden schema/tone eval harness + Fine-Tune if Prompt plateaus; Out: Agent loop, multi-tool planners, write actions — [rationale] keep scope on behavior fix only.

**Example (this use case):** MVP ships a single-shot JSON responder with CI golden checks; no “agent retries with tools” milestone.

**User reply:** Accepted recommended answer.

**Locked:** MVP = Prompt (+ Fine-Tune if needed); no Agent.

---

## Interview complete

Shared understanding locked: objective/I/O, Evaluation, behavior diagnosis, Prompt → Fine-Tune path, Agent rejected, Guardrails/Observability, MVP.

---

## Phase 1 — On-screen summary (~150–200 words)

**Adaptation path:** Evaluation locked on schema + tone + factual parity → **Prompt** first (schema/few-shots/tone constraints) → **Fine-Tune** only after Prompt is exhausted → **RAG** not primary (facts already OK) → **Agent rejected** as primary fix.

**Agent vs non-agent:** Explicit **non-agent**. Wrong JSON shape and ignored tone with correct doc facts are **behavior-based** failures. An Agent multi-step loop does not teach format/style and raises compounding error for a single-shot generation problem.

**Main trade-off:** Prompt is cheaper and reversible; Fine-Tune improves sticky instruction-following but needs labeled pairs and regression harness. Prefer measuring Prompt lift before training.

**Top risk:** Shipping an Agent “validator retry” loop that masks Prompt debt and inflates cost/latency without lifting schema/tone pass rates.

**MVP:** Golden-set Evaluation harness; harden Prompt; if thresholds miss, Fine-Tune on question→golden JSON+tone pairs; schema hard-gate on output. No tools/planner.

**Next handoff:** none from this skill for architecture — stay on Prompt/Fine-Tune ops. Framework/topology ADR not applicable while Agent is rejected.
