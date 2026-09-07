# Interview transcript — multi-agent compliance filing

**Skill:** ns-agent-architecture  
**Language locked:** English (human opening message)  
**Date:** 2026-09-07  
**Eval:** iteration-modules-1-3 / eval-10-defense-decline-adr-locks / with_skill  
**Mode:** Auto-accept recommended answers until ADR complete; Step 9 = NO defense pack

---

## Opening

Senior AI Solutions Architect. We lock architecture into `docs/specs/agent-architecture.md` — one question per turn, recommended answer each time.

**Initial user context (unprompted):**

> Multi-agent compliance filing: researcher + filer + HITL. After ADR I decline the stakeholder defense pack — we only need the implementation handoff.

---

## Step 1 — Objective + journey

**Q1:** What is the overall objective in one sentence — who is helped and what outcome counts as success?

**Recommended answer:** Automate regulatory filing preparation with a researcher agent gathering requirements and a filer agent assembling the submission, with compliance officer approval before any irreversible portal submit — rationale: captures specialists + HITL without over-scoping withdrawal automation.

**Example (this use case):** Case FIN-2026-0142 (annual compliance report) → researched citations + assembled draft → officer approves → regulator receipt.

**User reply:** Agreed — automate filing prep with gated submit.

**Locked:** Objective = compliance filing automation with HITL before portal write.

---

**Q2:** End-to-end journey in one sentence — what enters and what leaves?

**Recommended answer:** Input = filing case id + filing type (+ auth); output = regulator submission receipt after officer approval — rationale: makes irreversible write boundary explicit.

**Example (this use case):** In: `{ case_id: "FIN-2026-0142", filing_type: "annual_compliance" }` → Out: `{ regulator_receipt_id: "REG-88421" }` only after approve.

**User reply:** Yes — that I/O is correct.

**Locked:** I/O as stated.

---

## Step 2 — Reference architecture (five blocks)

**Q3:** How do requests enter — Gateway role?

**Recommended answer:** REST `/filings` with JWT auth and JSON schema validation — rationale: single compliance pipeline, no anonymous intake.

**Example (this use case):** POST `/filings` with officer-issued token and `{ case_id, filing_type }`.

**User reply:** Agreed.

**Locked:** Gateway = REST intake + auth + schema.

---

**Q4:** Does Gateway classify intent into categories?

**Recommended answer:** No — filing type is an explicit input field; no embedding/router hop — rationale: one pipeline, avoids LLM intent_classify forbidden pattern.

**Example (this use case):** Client sends `filing_type: "annual_compliance"` directly; no classifier.

**User reply:** Agreed — no classification.

**Locked:** Gateway does not classify intent.

---

**Q5:** Orchestrator role?

**Recommended answer:** LangGraph deterministic router: validate → research → assemble → gate → submit — rationale: fixed compliance sequence.

**Example (this use case):** Edge `researcher → filer` fires only on `research_complete`.

**User reply:** Agreed.

**Locked:** Orchestrator = LangGraph sequential router.

---

**Q6:** Model + Tools/RAG — where does non-deterministic work live?

**Recommended answer:** Two LLM nodes — Researcher (RAG + registries) and Filer (draft + schema tools) — rationale: P3 rows need context-dependent reasoning.

**Example (this use case):** Researcher calls `search_corpus("GDPR Art. 30")`; Filer calls `validate_schema(draft)`.

**User reply:** Agreed.

**Locked:** Two specialist LLM nodes.

---

**Q7:** Approval Gate — where and why?

**Recommended answer:** Sync interrupt before portal submit; compliance officer reviews editable draft — rationale: P2 irreversible submit.

**Example (this use case):** Officer edits `executive_summary` field then clicks Approve.

**User reply:** Agreed.

**Locked:** Sync HITL at draft_ready.

---

**Q8:** Observability — what must be recorded?

**Recommended answer:** Postgres audit: run_id, node, tool calls, citations, approver_id, submit receipt — rationale: regulatory reconstruct.

**Example (this use case):** Audit row links `approver_id=officer-7` to `regulator_receipt_id=REG-88421`.

**User reply:** Agreed.

**Locked:** Postgres audit trail.

---

## Step 3 — Subtask decomposition

**Q9:** Confirm subtask grid (6 rows)?

**Recommended answer:** validate intake (rule), research (agent), assemble (agent), officer review (agent+gate), portal submit (rule+gate), audit (rule) — rationale: covers journey with gate on irreversible step.

**Example (this use case):** Research row produces citations before filer row runs.

**User reply:** Confirmed.

**Locked:** Grid as in ADR.

---

## Step 4 — Classify subtasks (sample turns)

**Q10–Q15:** Per-row P1/P2/P3 + component (auto-accepted recommended for all six rows).

**Locked:** 2 agents, 1 agent+gate, 1 rule+gate, 2 rules — see ADR grid.

---

## Step 5 — Trade-off budget

**Q16–Q20:** One canonical component per turn (auto-accepted).

**Locked:** Gateway latency; all others precision non-negotiable.

---

## Step 6 — Architecture change signal

**Q21:** Which element and what signal forces architecture change in ~6 months?

**Recommended answer:** Observability — if >15% runs need manual re-research after filer assembly for two sprints — rationale: indicates researcher/filer boundary failure.

**Example (this use case):** Logs show `rework_reason=missing_citation` on 18% of March filings.

**User reply:** Agreed.

**Locked:** Change signal as stated.

---

## Step 7 — The grill (multi-agent locked)

**Q22–Q31:** I/O shapes, integration errors, four pillars, specialist boundary, fixed pipeline, orchestration patterns — all auto-accepted recommended.

**Locked:** LangGraph; sequential research→filer; sync gate handoff.

---

**Q32:** Researcher failure — timeout, retries, exhaustion?

**Recommended answer:** 120s, 2 retries, availability (proceed with partial + flag) — rationale: research gaps can be officer-corrected; block stalls pipeline.

**Example (this use case):** Registry MCP down after 2 retries → filer gets partial citations + `confidence: low`.

**User reply:** Agreed.

**Locked:** Researcher failure row in Failure contract.

---

**Q33:** Filer failure policy?

**Recommended answer:** 90s, 1 retry, consistency (block) — rationale: no draft without complete research context.

**User reply:** Agreed.

**Locked:** Filer failure row.

---

**Q34:** Portal submit failure?

**Recommended answer:** 60s, 3 retries, consistency (block), idempotent key `filing_id + content_hash` — rationale: never double-submit.

**User reply:** Agreed.

**Locked:** Submit failure row.

---

**Q35:** Compensation chain for multi-write?

**Recommended answer:** Orchestrator clears draft on reject; HITL triggers withdrawal if submit succeeded — rationale: matches who can authorize undo.

**Example (this use case):** Officer rejects draft → orchestrator wipes `draft`, filer re-runs with notes.

**User reply:** Agreed.

**Locked:** Compensation table with who triggers.

---

**Q36:** Inter-agent events — names and payload?

**Recommended answer:** `filing:research_complete`, `filing:draft_ready`, `filing:approval_decided`, `filing:submit_complete` — rationale: per-flow scope, past-tense domain events.

**User reply:** Agreed.

**Locked:** Event table.

---

**Q37:** Transport per `references/inter-agent-transport.md`?

**Recommended answer:** In-process emitter for agent events (shared LangGraph process); Postgres NOTIFY broker for audit worker (separate process) — rationale: shared process + listener always up vs replay needed for audit.

**Example (this use case):** Researcher emits in-process; audit worker subscribes via NOTIFY before submit node runs.

**User reply:** Agreed.

**Locked:** Transport column filled.

---

**Q38:** Delivery guarantee?

**Recommended answer:** at-least-once for research/draft/submit (idempotent listeners); at-most-once for approval_decided — rationale: per inter-agent-transport.md, at-least-once requires idempotent listeners.

**User reply:** Agreed.

**Locked:** Delivery guarantee column filled.

---

**Q39–Q42:** Provider (Azure OpenAI), hosting (VPC private endpoint), success metric (≥95% first-pass approval) — auto-accepted.

---

## Step 8 — Final report

**Phase 1 (~200 words, on-screen summary):**

LangGraph sequential pipeline: REST Gateway → researcher (RAG + registries) → filer (schema draft) → sync compliance officer interrupt → idempotent portal submit. Two specialists because research vocab/tools diverge from filer portal schema; fixed orchestration, not emergent collaboration. Main trade-off: precision over latency — officer sync gate and block-on-exhaustion for filer/submit. Top risk: partial research flagged too late. MVP: single filing type, in-process events per `inter-agent-transport.md`, Postgres audit broker for submit receipt. Rejected CrewAI — weaker formal HITL/resume for compliance.

**Phase 2:** Wrote `docs/specs/agent-architecture.md` with Failure contract, Compensation (who triggers), Inter-agent events (Transport + Delivery guarantee).

**Interview complete.**

---

## Step 9 — Architecture defense pack (opt-in)

**Q43:** Generate architecture defense pack for stakeholder / contractor presentation (boundary, orchestration, failure/saga, events, A-vs-B)?

**Recommended answer:** No — implement-only handoff; ADR is sufficient for dev team — rationale: user explicitly declined defense pack.

**Example (this use case):** Internal eng team starts from ADR; no client architect review scheduled.

**User reply:** No.

**Locked:** No `docs/specs/agent-architecture-defense.md`. Multi-agent locks remain in ADR only.

---

## Deliverables

| File | Path | Status |
| ---- | ---- | ------ |
| ADR | `docs/specs/agent-architecture.md` | written |
| Defense pack | `docs/specs/agent-architecture-defense.md` | **not created** (Step 9 = No) |

## Assertion checklist

- [x] ADR includes **Failure contract** (timeout / max retries / on exhaustion / idempotent on duplicate)
- [x] ADR includes **Compensation** with **who triggers**
- [x] ADR includes **Inter-agent events** with **Transport** and **Delivery guarantee**
- [x] Cites/applies `references/inter-agent-transport.md` doctrine
- [x] **No** `agent-architecture-defense.md`
