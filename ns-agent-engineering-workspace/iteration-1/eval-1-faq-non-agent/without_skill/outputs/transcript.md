# Eval transcript — baseline (without_skill)

**Eval:** eval-1-faq-non-agent  
**Condition:** without_skill (no ns-agent-engineering skill read or followed)  
**Task:** Build an agent that answers employee FAQs from internal wiki and HR PDFs

---

## Reasoning

User wants an “agent” that is “smart” over wiki + HR PDFs. From general practice this maps to:

1. **Retrieval** over two corpora (wiki pages, PDF text)
2. **Tool-calling LLM loop** so the model can search, re-query, and cite
3. **Guardrails** because HR answers are high-stakes (hallucination risk)

I did not apply a formal adaptation ladder or “is this actually an agent?” gate from any catalog skill. I treated the request at face value: design an agent with RAG tools.

A pure retrieve-and-generate chatbot might be enough for many FAQs, but the user explicitly asked for an agent for smarter multi-step retrieval, so the design centers on a ReAct/tool loop with wiki + PDF search tools, citations, escalation, and a small eval set.

## Deliverable produced

Full design write-up:

`docs/specs/agent-design.md`

Contents cover:

- Architecture diagram (agent + tools)
- Ingestion for wiki and PDFs
- Tool definitions
- Stack suggestion (LangGraph / AI SDK, pgvector, SSO)
- Guardrails and response contract
- Eval metrics and rollout
- Open decisions and rough effort (~3–4 weeks to pilot)

## Recommendation summary (as given to the user)

Build a **tool-calling FAQ agent** over a shared vector index of wiki + HR PDFs:

- Tools: `search_wiki`, `search_hr_docs`, `get_chunk`, optional `create_hr_ticket`
- Bound the loop (4–6 steps); answer only from retrieved sources; cite URLs/pages
- Ship first as Slack bot with SSO; pilot with HR; measure groundedness and thumbs-down
- Do **not** wire HRIS PII lookups — FAQ corpus only

Design doc path written under this eval’s `outputs/` tree.
