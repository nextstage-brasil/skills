# Interview transcript — Employee FAQ over wiki + HR PDFs

**Skill:** ns-agent-engineering  
**Mode:** grill-me (simulated; user accepts Recommended answer each turn)  
**Locked language:** English (first user message)  
**Date:** 2026-08-27

---

## Opening context (user, unprompted)

> Build an agent that answers employee FAQs from our internal wiki and HR PDFs. Just make it an agent so it can be smart.

---

## Intro

I'll lock a conceptual adaptation design (Evaluation → Prompt → RAG → Agent → Fine-Tune). Agent only if justified. No frameworks, no implementation. One question per turn.

---

### Step 1 — Objective + I/O

**Q1:** What is the overall objective of this system for employees?

**Recommended answer:** Deliver accurate, citation-backed answers to HR and policy FAQs grounded in the internal wiki and HR PDFs — not an autonomous multi-step agent. — Private-doc Q&A is an information problem; “smart” comes from grounded retrieval, not tool-acting loops.

**Example (this use case):** “How many PTO days do I get after 2 years?” answered from the benefits PDF with a page/section cite, not invented from general knowledge.

**User reply:** Agreed — citation-backed FAQ answers from wiki + HR PDFs is the goal.

**Locked:** Objective = grounded employee FAQ Q&A over internal wiki and HR PDFs with citations (or clear unsupported refusal).

---

**Q2:** In one sentence, what is the end-to-end journey (input → output)?

**Recommended answer:** Employee submits a natural-language HR/policy question → system retrieves relevant wiki/PDF passages → returns a grounded answer with source citations, or states that the corpus does not cover it. — Single retrieve-then-generate path; no multi-step environment acting.

**Example (this use case):** Input “What’s our remote-work stipend?” → retrieve wiki remote-work page + stipend PDF clause → output answer + links/anchors to those sources.

**User reply:** Yes — question in, grounded cited answer (or not-found) out.

**Locked:** I/O = NL question → retrieve → grounded cited answer or explicit coverage miss.

---

### Step 2 — Evaluation criteria (blocking)

**Q3:** What does “done” mean — rubric / functional correctness and usefulness threshold?

**Recommended answer:** Pass when (1) claims are supported by retrieved passages, (2) citations point to those passages, (3) refuse/“not in corpus” when retrieval is empty or irrelevant; usefulness = ≥85% of a golden FAQ set passes groundedness + citation rubric; optionally track HR ticket deflection. — Functional correctness before any adaptation choice.

**Example (this use case):** Golden “parental leave length” must quote/paraphrase only the parental-leave PDF section and cite it; hallucinated weeks = fail.

**User reply:** Lock that — groundedness + citations + refuse-if-unsupported; ≥85% golden set pass.

**Locked:** Evaluation = groundedness + citation correctness + refuse-when-unsupported; usefulness ≥85% golden FAQ pass; optional HR deflection as business link.

---

### Step 3 — Failure diagnosis (blocking)

**Q4:** Are remaining failures primarily information-based, behavior-based, both, or neither?

**Recommended answer:** Information — the base model lacks private wiki/PDF content and policy freshness; this is not primarily wrong format/tone. — Matches FAQ-over-private-docs pattern.

**Example (this use case):** Model can write a polished leave answer in HR tone but invents days because the leave PDF was never in context.

**User reply:** Correct — information gap on private/recent HR corpus.

**Locked:** Failure type = information (private/recent corpus knowledge).

---

### Step 4 — Adaptation path (blocking)

**Q5:** After Evaluation, should we exhaust Prompt (in-context grounded Q&A instructions) before heavier gates?

**Recommended answer:** Yes — lock a Prompt for grounded answers, citation format, and refuse-if-unsure before adding retrieval machinery complexity. — Ladder: Prompt first after Evaluation.

**Example (this use case):** System instructions: answer only from provided excerpts; always cite source title/section; if excerpts don’t support the claim, say so.

**User reply:** Accept — Prompt gate first for grounded FAQ behavior.

**Locked:** Prompt = required / start; in-context grounded Q&A + cite + refuse.

---

**Q6:** Given an information failure, do we lock RAG?

**Recommended answer:** Yes — RAG is required to inject wiki and HR PDF passages at query time; Prompt alone cannot supply private corpus. — Information gate → RAG.

**Example (this use case):** Index wiki pages + PDF chunks; for “dental wait period,” retrieve the dental-benefits PDF chunk into context before generating.

**User reply:** Yes — RAG over wiki + HR PDFs is mandatory.

**Locked:** RAG = yes; retrieval over internal wiki + HR PDFs closes the information gap.

---

**Q7:** After Prompt + RAG, is Agent justified (perceive environment, decide, act with tools beyond passive retrieval, learn from outcomes)?

**Recommended answer:** No — explicit non-agent. FAQ over docs is passive Knowledge retrieval + generation; no write actions, no multi-step decide-and-act loop. — Adaptation ladder: do not jump to Agent when Prompt+RAG suffices.

**Example (this use case):** Answering PTO from a PDF does not need ticket creation, email, or iterative tool planning — one retrieval pass is enough.

**User reply:** Agreed — not an Agent; Prompt + RAG only.

**Locked:** Agent = rejected (explicit non-agent). Path = Prompt + RAG.

---

**Q8:** Is Fine-Tune justified now for behavior-based gaps?

**Recommended answer:** No for MVP — no evidence of format/instruction-following failure after Prompt (+ RAG); revisit Fine-Tune only if tone/format still fails with good retrieval. — Behavior gate not triggered.

**Example (this use case):** If answers already follow “cite then answer” via Prompt once chunks are present, Fine-Tune adds cost without fixing missing policy text.

**User reply:** Fine — skip Fine-Tune for now.

**Locked:** Fine-Tune = deferred; not in MVP.

---

### Steps 5–8 — Agent-only (skipped / lightly noted)

Agent rejected at Q7. Tool taxonomy, Planning contract, agent Memory tiers beyond RAG placement, and agent-specific metrics (valid plan %, tool failure split) do not apply. Baseline Evaluation from Step 2 remains the success definition for the Prompt+RAG system.

---

### Step 9 — Guardrails + Observability

**Q9:** What input/output Guardrails and Observability do we lock for MTTD/MTTR?

**Recommended answer:** Input: block off-policy jailbreaks and bulk PII dumps; Output: require citation presence when answering, block unsourced policy claims; Observability: log query, retrieved chunk ids, answer, refuse flag, groundedness failures for fast diagnosis. — Non-agent still needs Guardrails + logs.

**Example (this use case):** Log shows “remote stipend” retrieved wrong travel policy chunk → MTTD via chunk-id mismatch; fix ranking without guessing from user complaints alone.

**User reply:** Lock those Guardrails and logs.

**Locked:** Guardrails = input abuse/PII controls + output citation/groundedness; Observability = query/chunks/answer/refuse/failure logs for MTTD/MTTR.

---

### Step 10 — Close

Shared understanding locked: objective/I/O, Evaluation, information failure, Prompt + RAG path, explicit non-agent, Fine-Tune deferred, Guardrails/Observability. Interview complete.

---

## Phase 1 — Chat summary (~150–200 words)

This is an employee FAQ product over an internal wiki and HR PDFs, not a justified Agent. Locked Evaluation: answers must be grounded in retrieved passages, cite those sources, and refuse when the corpus does not support the claim, with ≥85% pass on a golden FAQ set (optional HR ticket deflection as a business link). Failure diagnosis is information-based: private and fresh policy text is missing from the model’s weights. Adaptation path: Evaluation → Prompt (grounded cite-and-refuse instructions) → RAG (wiki + HR PDF retrieval) → Agent rejected → Fine-Tune deferred. Explicit non-agent decision: passive retrieval plus generation meets the I/O journey; multi-step tool acting would add compounding error without improving FAQ correctness. Top risk is hallucinated HR policy when retrieval misses or ranks poorly — mitigated by refuse-if-unsupported, citation checks, and logging query/chunk/answer for MTTD. MVP: Prompt + RAG FAQ with golden-set Evaluation and Guardrails; no write tools, no planning loop. Next handoff: `ns-postgres-rag` if the corpus lands on Postgres retrieval; otherwise none until retrieval design is chosen — not `ns-multi-agent-architect`.

**(Word count: ~178)**
