# Interview transcript — refund decision agent

**Skill:** ns-agent-engineering  
**Language locked:** English (human opening message)  
**Date:** 2026-08-27  
**Eval:** iteration-1 / eval-2-refund-agent / with_skill

---

## Opening

Senior AI engineer here. Foundation-model adaptation only — no framework, no implementation language, no code. We lock a conceptual design into `docs/specs/agent-design.md`.

**Initial user context (unprompted):**

> We need something that looks up customer orders in SQL, decides whether a refund applies, then sends the customer an email. Multi-step. Must not send mail without approval.

---

## Step 1 — Objective + I/O

**Q1:** What is the overall objective of this system in one sentence — who is helped and what outcome counts as success?

**Recommended answer:** Automate support refund triage: given a customer refund request, look up the order, decide if a refund applies under policy, and only after human approval notify the customer by email — one-sentence rationale: that captures lookup → decide → gated write without over-scoping payment execution.

**Example (this use case):** Customer #4821 asks “refund order ORD-99102”; success = correct eligibility decision + email draft ready for approval, never auto-sent.

**User reply:** Agreed — automate refund triage with gated email.

**Locked:** Objective = automate refund eligibility triage for support; success = correct decision + approval-gated customer email. No payment/ledger mutation in scope.

---

**Q2:** Walk the end-to-end journey in one sentence: what enters the system and what leaves it?

**Recommended answer:** Input = customer id + order id (or ticket with those fields) + optional reason; output = eligibility decision with evidence + email draft that sends only after HITL approval — rationale: keeps I/O crisp and makes the write boundary explicit.

**Example (this use case):** In: `{customer_id: 4821, order_id: "ORD-99102", reason: "item never arrived"}` → Out: `{eligible: true, policy_basis: "…", email_draft: "…"}` pending approve/reject.

**User reply:** Yes — that I/O is correct.

**Locked:** Input = customer/order identifiers (+ optional reason). Output = eligibility decision + evidence + email draft; send only after approval.

---

## Step 2 — Evaluation criteria (blocking)

**Q3:** What does “done” mean — which functional checks and usefulness threshold must pass before we call a run successful?

**Recommended answer:** Pass if (1) SQL lookup returns the right order facts, (2) eligibility matches a gold policy rubric on that snapshot, (3) email content matches decision and never sends without approval, (4) usefulness ≥ 90% rubric pass on a held-out refund-ticket set — rationale: separates retrieval correctness, decision correctness, and write safety.

**Example (this use case):** Ticket where order is outside 30-day window → must classify ineligible, draft “cannot refund” email, zero send events without approve.

**User reply:** Lock that — 90% rubric + hard fail on unapproved send.

**Locked:** Evaluation = order-fact correctness + policy-rubric match + email consistency + unapproved send = hard fail; usefulness threshold ≥ 90% on gold tickets. Business link: reduce avg refund-ticket handle time without raising wrongful-refund rate.

---

## Step 3 — Failure diagnosis (blocking)

**Q4:** Are current/expected failures mainly missing information (private order/policy facts), wrong behavior (format/instruction), both, or neither (process/product only)?

**Recommended answer:** **Both**, dominated by information gap on live order state plus multi-step decide-and-act — rationale: private SQL order data is not in weights; eligibility needs judgment over tools; email is a side effect, not a formatting-only gap.

**Example (this use case):** Model invents “delivered 2026-08-01” without querying orders table → information failure; even with facts, skipping approval before send → behavior/control failure in the loop.

**User reply:** Both — info on orders + multi-step act. Lock it.

**Locked:** Failure type = **both** (information-primary on order/policy facts; behavior/control on gated write and instruction following across steps).

---

## Step 4 — Adaptation path (blocking)

**Q5:** Gate **Prompt** — can in-context policy + few-shot refund examples alone solve lookup, decide, and gated email without tools?

**Recommended answer:** **No — Prompt insufficient alone** — rationale: live order rows and send action are outside the context window; Prompt can encode policy wording but cannot perceive DB state or execute mail.

**Example (this use case):** Paste refund policy in the system prompt; still cannot know whether ORD-99102 shipped without a query.

**User reply:** Accepted — Prompt alone fails.

**Locked:** Prompt = required for policy/instructions, **not sufficient** as sole adaptation.

---

**Q6:** Gate **RAG** — if we retrieve order snippets and policy docs, is retrieval enough without an Agent that decides and acts?

**Recommended answer:** **RAG helps information gap but is not enough** — rationale: retrieval can feed order/policy text; the job still needs multi-step tool use (SQL capability + write email) and outcome-gated approval, which is Agent territory after Eval + Prompt.

**Example (this use case):** RAG returns policy “30-day window” and a stale order summary; still need fresh SQL read, eligibility decision, and HITL send.

**User reply:** Right — RAG for policy/history, not the whole path.

**Locked:** RAG = optional/partial for policy corpus & history; **does not replace Agent**.

---

**Q7:** Gate **Agent** — given perceive (SQL) → decide (eligibility) → act (email under HITL), do we lock Agent?

**Recommended answer:** **Yes — lock Agent** — rationale: environment perception, multi-step decisions, tools beyond passive retrieval, and learning from tool outcomes are required; deterministic single-shot cannot safely own the write.

**Example (this use case):** Step A query order → Step B apply policy → Step C draft email → Step D await approval → Step E send or abort.

**User reply:** Lock Agent.

**Locked:** Agent = **justified and locked**.

---

**Q8:** Gate **Fine-Tune** — after Prompt (+ RAG for info), is Fine-Tune required now for behavior/format?

**Recommended answer:** **Defer Fine-Tune** — rationale: behavior gaps (tone, rubric adherence) should be attacked with Prompt (+ RAG) and Agent Guardrails first; Fine-Tune only if gold-set instruction-following stays weak after that.

**Example (this use case):** Email drafts too casual → fix with Prompt templates/rubric before training a custom model.

**User reply:** Defer Fine-Tune — agreed.

**Locked:** Fine-Tune = **out of MVP**; revisit only if Prompt+Agent eval plateaus on behavior metrics.

**Adaptation path locked:** Evaluation → Prompt (support) → RAG (partial info) → **Agent (core)** → Fine-Tune deferred.

---

## Step 5 — Tool taxonomy

**Q9:** For MVP, which tools exist and how do we tag each — especially email as Write + HITL?

**Recommended answer:** Three tools — (1) `lookup_order_sql` Capability extension (read SQL), (2) `fetch_refund_policy` Knowledge augmentation, (3) `send_customer_email` Write actions with mandatory HITL approval + confirm params — rationale: fewest tools that cover perceive / know / write; write never auto-fires.

**Example (this use case):** Agent proposes `send_customer_email(to=user@ex.com, body=…)` → UI shows params → human Approves → only then execute.

**User reply:** Those three tools + HITL on email. Locked.

**Locked tool inventory:**

| Tool | Category | Safety |
| ---- | -------- | ------ |
| `lookup_order_sql` | Capability extension | Read-only DB creds; no writes |
| `fetch_refund_policy` | Knowledge augmentation | Read-only corpus |
| `send_customer_email` | Write actions | HITL approval + confirm params before send |

---

## Step 6 — Planning

**Q10:** How should Planning relate to execution for this refund flow?

**Recommended answer:** **Plan ≠ execute** — emit a short plan (lookup → decide → draft → await approval → send/abort), validate against allowed tools/budget/policy, surface email parameters, execute only after validation and HITL on the Write step — rationale: cuts compounding error and blocks silent sends.

**Example (this use case):** Illegal plan “send email then query order” fails validation before any tool runs.

**User reply:** Plan≠execute + validate before run. Lock.

**Locked:** Planning contract = propose short plan → validate → run reads → draft → HITL → Write or abort; report Write params always.

---

## Step 7 — Memory

**Q11:** What lives in weights vs context window vs external store?

**Recommended answer:** Weights = general language/reasoning only (no customer PII); context window = this ticket’s plan, SQL results, decision scratch; external = order DB (via tool), policy corpus / ticket history (RAG) — rationale: durable facts must not rely on model memory.

**Example (this use case):** Yesterday’s ORD-99102 status is re-fetched via SQL each run, not “remembered” from a prior chat.

**User reply:** That memory split is fine. Lock.

**Locked:** Memory tiers as recommended; no Fine-Tune weights for customer facts.

---

## Step 8 — Agent evaluation

**Q12:** Which agent-specific metrics separate planning failures from tool failures?

**Recommended answer:** Track valid plan %, steps/success, cost & latency vs Prompt+RAG baseline, task rubric pass from Step 2, and write-safety (unapproved send = hard fail); score planning vs tool modes separately — rationale: “agent bad” alone hides whether schema validation or SQL args failed.

**Example (this use case):** Plan valid but `lookup_order_sql` wrong `order_id` → tool failure, not planning failure.

**User reply:** Lock those metrics + separate failure modes.

**Locked:** Agent eval metrics as recommended; baseline = Prompt+policy RAG without Agent tools where comparable.

---

## Step 9 — Guardrails + Observability

**Q13:** What input/output Guardrails and Observability do we lock for MTTD/MTTR on bad refunds or leaked sends?

**Recommended answer:** Input: allow only known ticket/order ids, strip prompt-injection in reason text; Output: block send tool without approval token, redact PII in logs where required; Observability: log plan, tool name/args (redacted), decision rubric scores, approval actor, send/abort — rationale: diagnose planning vs tool vs policy fast.

**Example (this use case):** Alert if any `send_customer_email` invocation lacks prior approval event in the trace.

**User reply:** Lock those guardrails and logs.

**Locked:** Guardrails + Observability as recommended; unapproved Write = page-level alert.

---

## Step 10 — Close

Interview complete. Shared understanding locked: objective/I/O, Evaluation, failure diagnosis (**both**), adaptation path (**Agent** after Eval/Prompt; RAG partial; Fine-Tune deferred), Tools (email = Write + HITL), Planning (plan≠execute), Memory, agent eval, Guardrails/Observability.

### Phase 1 — On-screen summary (~180 words)

**Adaptation path:** Evaluation locked first (≥90% gold-ticket rubric; unapproved email send = hard fail). Prompt encodes refund policy and draft style but cannot see live orders or send mail. RAG covers policy corpus and optional history — information help only. **Agent is justified:** multi-step perceive (SQL) → decide eligibility → act (email). Fine-Tune deferred until Prompt+Agent plateau on behavior metrics.

**Agent vs non-agent:** Explicit **Agent** decision. Prompt/RAG/single-shot insufficient for gated write + tool loop.

**Top risk:** Compounding errors across lookup → decide → write; wrongful refund messaging or accidental send. Mitigate with short validated plans, read-only SQL, **HITL + param confirm** on `send_customer_email`, and write-safety metrics.

**MVP:** Three tools (`lookup_order_sql`, `fetch_refund_policy`, `send_customer_email` + HITL); no payment/ledger writes; no Fine-Tune.

**Handoff:** Conceptual design → `ns-multi-agent-architect` for framework/topology ADR (`docs/specs/agent-architecture.md`). No implementation from this skill.

Phase 2 file written to `docs/specs/agent-design.md`.
