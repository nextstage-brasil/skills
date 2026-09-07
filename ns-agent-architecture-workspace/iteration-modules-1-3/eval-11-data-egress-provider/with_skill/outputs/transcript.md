# Interview transcript — VPC-bound patient notes agent

**Skill:** ns-agent-architecture  
**Language locked:** English (human opening message)  
**Date:** 2026-09-07  
**Eval:** iteration-modules-1-3 / eval-11-data-egress-provider / with_skill

---

## Opening

Senior AI engineer / solutions architect. We grill until every branch is locked, then write the living ADR to `docs/specs/agent-architecture.md`.

**Initial user context (unprompted):**

> Corpus of patient notes cannot leave our VPC. Pick provider and hosting for the Model block; we also care about cost.

---

## Step 1 — Objective + I/O

**Q1:** What is the overall objective in one sentence — who is helped and what outcome counts as success?

**Recommended answer:** Give clinical staff accurate, cited answers and summaries over the in-VPC patient-note corpus without exposing PHI outside the boundary — rationale: locks the compliance constraint as a first-class requirement, not an afterthought.

**Example (this use case):** A nurse asks “summarize last 72h progress notes for MRN-88421 with citations”; success = faithful summary with note IDs, zero external API calls carrying note text.

**User reply:** (preferred) Agreed — in-VPC clinical Q&A and summarization with citations.

**Locked:** Objective = in-VPC clinical note Q&A/summarization for staff; success = accurate cited answers, PHI never leaves VPC.

---

**Q2:** End-to-end journey in one sentence — what enters and what leaves?

**Recommended answer:** Input = authenticated staff query (+ optional patient/MRN scope); output = structured answer or summary with source note references, audit metadata — rationale: makes the Model block consume only VPC-resident retrieval context.

**Example (this use case):** In: `{query: "discharge blockers?", mrn: "88421"}` → Out: `{answer, citations: [{note_id, span}], confidence, run_id}`.

**User reply:** (preferred) Yes — that I/O.

**Locked:** Input = scoped clinical query; output = cited answer/summary + audit fields.

---

## Step 2 — Reference architecture (five blocks)

**Q3:** **Gateway** — how do requests enter; what auth/validation runs before orchestration?

**Recommended answer:** Internal HTTPS API behind SSO (OIDC) + RBAC on patient scope; reject requests missing role or out-of-scope MRN — rationale: PHI access must fail closed at the edge.

**Example (this use case):** Nurse role may read ward patients only; `mrn` outside ward list → 403 before any retrieval.

**User reply:** (preferred) Lock SSO + RBAC scope check at Gateway.

**Locked:** Gateway = internal API, OIDC SSO, patient-scope RBAC, rate limit.

---

**Q4:** **Orchestrator** — what decides the next step deterministically?

**Recommended answer:** LangGraph-style router: validate scope → retrieve from VPC vector index → compose context → invoke local Model → format response → optional HITL interrupt on low confidence — rationale: sequence is rule-driven; LLM only in Model block.

**Example (this use case):** Retrieval returns zero chunks → orchestrator short-circuits to “insufficient evidence” without calling the Model.

**User reply:** (preferred) Yes — deterministic graph with conditional edges.

**Locked:** Orchestrator = compiled graph: scope guard, retrieve, model invoke, respond, interrupt paths.

---

**Q5:** **Model + Tools/RAG** — where does non-deterministic reasoning and retrieval live?

**Recommended answer:** VPC-hosted vector store over note embeddings + local/vLLM inference on retrieved chunks only; tools = `search_notes`, `get_note_span` — rationale: corpus and inference stay inside the VPC boundary.

**Example (this use case):** Model sees top-k note spans from OpenSearch in the same VPC, never a public API payload.

**User reply:** (preferred) Lock VPC RAG + local inference.

**Locked:** Model + Tools/RAG = in-VPC retrieval + local LLM on retrieved context.

---

**Q6:** **Approval Gate** — where is human approval required, or none?

**Recommended answer:** Sync HITL when answer confidence below threshold or query tagged `high_risk` (medication change, legal) — rationale: P2 errors in clinical guidance are costly and hard to undo in workflow.

**Example (this use case):** “Can we stop warfarin?” → interrupt to attending physician even if retrieval looks complete.

**User reply:** (preferred) Sync gate on low confidence + high-risk categories.

**Locked:** Approval Gate = sync interrupt on confidence < 0.75 or high-risk intent category.

---

**Q7:** **Observability** — what must be logged across blocks?

**Recommended answer:** Immutable audit: user, role, mrn hash, query hash, retrieval ids, model_id, prompt_version, confidence, gate outcome, latency — rationale: HIPAA-style reconstructability without storing raw PHI in logs when avoidable.

**Example (this use case):** Auditor replays run_id and sees which note_ids were retrieved and who approved an interrupt.

**User reply:** (preferred) Lock structured audit trail.

**Locked:** Observability = append-only audit store with retrieval + model + gate fields.

---

## Step 3 — Subtask decomposition (grid once)

**Q8:** Confirm this subtask grid (4–8 rows) for the journey input → output:

| Subtask | Type |
| ------- | ---- |
| Authenticate and scope patient access | business decision |
| Retrieve relevant note spans from VPC index | extraction/interpretation |
| Compose grounded answer or summary | extraction/interpretation |
| Route low-confidence / high-risk to physician | business decision |

**Recommended answer:** Accept as-is — rationale: four verbs cover Gateway scope, RAG, Model, and Gate without over-splitting.

**Example (this use case):** Scope failure never reaches retrieval; retrieval failure never reaches Model.

**User reply:** (preferred) Confirm grid.

**Locked:** Four subtasks as proposed.

---

## Step 4 — Classify each subtask

**Q9:** Row **Authenticate and scope patient access** — P1: finite rule covers >90% of real cases?

**Recommended answer:** **Yes** — RBAC + allow-list is enumerable — component: **rule**.

**User reply:** (preferred) Yes — rule.

**Locked:** Scope check = rule (Orchestrator).

---

**Q10:** Row **Retrieve relevant note spans** — P3: behavior changes with input context?

**Recommended answer:** **Yes** — query wording shifts recall — component: **agent** (retrieval agent node).

**User reply:** (preferred) Agent for retrieval ranking/rewrites.

**Locked:** Retrieve = agent row.

---

**Q11:** Row **Compose grounded answer or summary** — P2: error costly and irreversible?

**Recommended answer:** **Yes** — wrong clinical summary affects care — component: **agent + gate (sync)**.

**User reply:** (preferred) Agent + sync gate.

**Locked:** Compose = agent + sync gate on low confidence / high-risk.

---

**Q12:** Row **Route low-confidence / high-risk to physician** — P1?

**Recommended answer:** **Yes** — threshold + category list is finite — component: **rule + conditional gate**.

**User reply:** (preferred) Rule + conditional gate.

**Locked:** Routing to HITL = rule + conditional gate (Orchestrator + Approval Gate).

---

## Step 5 — Trade-off budget

**Q13:** **Gateway** — non-negotiable axis?

**Recommended answer:** **Precision** (authz correctness) — latency/cost flex — rationale: wrong patient access is unacceptable.

**User reply:** (preferred) Precision non-negotiable.

**Locked:** Gateway non-negotiable = precision.

---

**Q14:** **Orchestrator** — non-negotiable axis?

**Recommended answer:** **Precision** (correct branch / fail-closed) — rationale: deterministic safety paths beat speed.

**User reply:** (preferred) Precision.

**Locked:** Orchestrator non-negotiable = precision.

---

**Q15:** **Model + Tools/RAG (interactive)** — non-negotiable axis?

**Recommended answer:** **Precision** over cost — rationale: compliance already forbids cheap external APIs; within VPC, accuracy beats token savings.

**User reply:** (preferred) Precision first; cost second within VPC.

**Locked:** Model interactive non-negotiable = precision; cost optimized only after egress lock.

---

**Q16:** **Observability** — non-negotiable axis?

**Recommended answer:** **Precision** (audit completeness) — rationale: reconstructability for compliance reviews.

**User reply:** (preferred) Precision.

**Locked:** Observability non-negotiable = precision.

---

## Step 6 — Architecture change signal

**Q17:** Which block and what observable signal would force an architecture change within ~6 months?

**Recommended answer:** **Model + Tools/RAG** — p95 interactive latency > 8s for 14 consecutive days while GPU utilization < 40% — rationale: signals wrong model tier or hosting sizing, not a compliance waiver.

**Example (this use case):** Staff abandon tool because summaries are too slow despite idle GPUs → revisit quant model or replica count.

**User reply:** (preferred) Lock that signal.

**Locked:** Change signal = Model block latency/GPU mismatch threshold above.

---

## Step 7 — The grill (Model block — provider doctrine)

**Q18:** **Model block — data egress:** Can any patient note text, embedding, or retrieval payload leave the VPC boundary during inference or indexing?

**Recommended answer:** **No — zero egress** — per `references/provider-selection.md` hard rule #2: *“Data egress = compliance lock, not preference. Corpus cannot leave boundary → decide provider/hosting before cost.”* — rationale: compliance lock precedes any cost comparison with public APIs.

**Example (this use case):** Even “just summarizing” note spans cannot be POSTed to OpenAI or Anthropic — that would violate the stated boundary.

**User reply:** (preferred) No egress — lock zero leave-VPC.

**Locked:** Data egress = **never leaves VPC** (compliance lock recorded before cost).

---

**Q19:** **Model block — hosting mode:** Given zero egress, is hosting **VPC-local inference** (self-hosted vLLM/TGI on GPU in the same VPC) or a **public paid API**?

**Recommended answer:** **VPC-local inference (production)** — public API is disqualified because paid API implies data to provider (`provider-selection.md` axis table) — rationale: prefer local/VPC-bound hosting when corpus cannot leave.

**Example (this use case):** vLLM on EKS/G6e in the clinical VPC serves Llama-3.x; no outbound note text to vendor endpoints.

**User reply:** (preferred) VPC-local production inference.

**Locked:** Hosting mode = **VPC-local (production)** — not public API.

---

**Q20:** **Model block — provider:** Which vendor/model family runs inside that VPC host?

**Recommended answer:** **Meta Llama 3.x (70B AWQ or 8B for dev) via vLLM** — open weights deployable entirely inside the VPC; no third-party inference SaaS — rationale: provider lock is the in-VPC runtime + weight artifact, not a remote API key.

**Example (this use case):** `model_id=llama-3-70b-awq` on internal model registry; prompts contain retrieved spans only.

**User reply:** (preferred) Llama via vLLM in VPC.

**Locked:** Provider = Meta Llama (self-hosted via vLLM in VPC).

---

**Q21:** **Model block — cost:** Within the egress lock, what is the acceptable cost strategy?

**Recommended answer:** **Minimize GPU cost after compliance** — use AWQ/GPTQ, scale-to-zero on dev, single replica + queue for MVP, batch re-embedding off-peak — rationale: cost is optimized *inside* the no-egress boundary; external cheap APIs are not on the table (`provider-selection.md` anti-pattern: ignore data egress for savings).

**Example (this use case):** Reject “use GPT-4o-mini for summaries to save money” because it violates Q18; accept “70B AWQ on one L4 instead of full-precision A100.”

**User reply:** (preferred) Cost via quant + sizing inside VPC only.

**Locked:** Cost strategy = quantized local model, right-sized GPU, batch indexing — **after** egress/hosting lock.

---

**Q22:** **Model block — failover provider:** Is there a second provider, and does the tool surface survive a switch?

**Recommended answer:** **Failover = secondary in-VPC vLLM replica with smaller quant model (e.g., Llama-3-8B AWQ)** — tool schemas unchanged; history ownership stays in orchestrator state — per `provider-selection.md` hard rule #4 — rationale: provider swap is not a config-only change but tool surface survives because MCP/tools are provider-agnostic.

**Example (this use case):** Primary 70B timeout → retry once on 8B replica in same VPC; log degraded tier in audit.

**User reply:** (preferred) In-VPC secondary quant model failover.

**Locked:** Failover provider = secondary vLLM endpoint (smaller Llama quant), same VPC, tools survive switch.

---

**Q23:** **Four pillars — control vs autonomy:** Rigid deterministic graph or emergent multi-agent collaboration?

**Recommended answer:** **Rigid graph** — clinical paths need explicit gates — LangGraph signal.

**User reply:** (preferred) Rigid graph.

**Locked:** Control = rigid deterministic orchestration.

---

**Q24:** **Four pillars — HITL:** Formal interrupt/resume on gate?

**Recommended answer:** **Yes** — sync interrupt with editable draft fields — LangGraph `interrupt()`.

**User reply:** (preferred) Formal sync interrupt.

**Locked:** HITL = formal sync interrupt on low confidence / high-risk.

---

## Step 8 — Close

**Announcement:** Shared understanding complete. Interview complete.

**Phase 1 (~200 words, chat summary):**

LangGraph orchestrates an in-VPC clinical note assistant: SSO Gateway, deterministic retrieve→compose graph, local vLLM on retrieved spans only. Compliance locked first — zero note egress; hosting is VPC-local Llama via vLLM, not public API. Cost is second: AWQ and GPU sizing inside the boundary. Main trade-off: local model quality ceiling vs compliance (accepted). Top risk: under-sized GPU causing slow p95 and staff bypass. MVP: single-tenant ward pilot, sync gate on high-risk categories, audit trail. Rejected alternative: CrewAI emergent crew — insufficient formal HITL/resilience for clinical governance.

**Phase 2:** ADR written to `docs/specs/agent-architecture.md`.

---

## Step 9 — Defense pack (opt-in)

**Q25:** Generate architecture defense pack for stakeholders?

**Recommended answer:** **No** — implement-only handoff; ADR is sufficient — rationale: user asked only for Model provider/hosting lock.

**User reply:** (preferred) No defense pack.

**Locked:** No `agent-architecture-defense.md`.
