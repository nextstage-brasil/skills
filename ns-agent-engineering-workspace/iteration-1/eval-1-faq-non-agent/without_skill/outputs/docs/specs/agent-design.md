# Employee FAQ Agent — Design

## Goal

Build an intelligent agent that answers employee questions using the internal wiki and HR PDF documents as knowledge sources. The agent should retrieve relevant content, reason over it, and respond in natural language with citations when possible.

## Recommended architecture

```
User question
    ↓
FAQ Agent (LLM + tool loop)
    ├── search_wiki(query)      → Confluence / Notion / internal wiki API
    ├── search_hr_docs(query)   → vector index over HR PDFs
    ├── get_document(id)        → fetch full page/PDF chunk context
    └── escalate_to_hr()        → ticket / Slack / email handoff
    ↓
Answer + source links
```

### Why an agent

A single-shot RAG pipeline (retrieve → stuff context → answer) often fails when:

- The question is ambiguous and needs clarification
- Relevant info is split across wiki + PDFs
- The first retrieval miss needs a reformulated query
- Policy answers need careful citation and refusal on speculation

An agent with a tool-calling loop can retry retrieval, combine sources, and escalate when confidence is low.

## Components

### 1. Knowledge ingestion

| Source | Approach |
|--------|----------|
| Internal wiki | Sync pages via API (or webhook on update). Chunk by heading. Store page URL + title + section. |
| HR PDFs | Extract text (pdfplumber / Unstructured). Chunk ~500–800 tokens with overlap. Tag by handbook section / effective date. |

Index both in a vector store (pgvector, OpenSearch, or Pinecone) with metadata filters (`source_type`, `doc_id`, `updated_at`).

Optional hybrid search: BM25 + embeddings for policy numbers, acronyms, and exact benefit names.

### 2. Agent runtime

- **Model**: GPT-4o / Claude Sonnet (tool-capable)
- **Orchestration**: LangGraph or equivalent ReAct loop (plan → tool → observe → answer)
- **Max steps**: 4–6 tool calls to bound cost/latency
- **System prompt**: Role = HR/IT FAQ assistant; answer only from tools; never invent policy; cite sources; if unsure, say so and offer escalation

### 3. Tools

```text
search_wiki(query: str, limit?: int) → [{title, url, snippet, score}]
search_hr_docs(query: str, limit?: int) → [{doc_name, page, snippet, score}]
get_chunk(chunk_id: str) → full text of a retrieved chunk
create_hr_ticket(summary: str, urgency?: str) → ticket id (optional)
```

Keep the tool set small. Too many tools increase misrouting.

### 4. Response contract

Every answer should include:

1. Direct answer in plain language
2. Source citations (wiki URL and/or PDF name + page)
3. Disclaimer when policy may vary by region/role
4. Escalation path when retrieval confidence is low or question is sensitive (compensation, termination, legal)

### 5. Guardrails

- Refuse medical/legal advice beyond published policy text
- Redact or refuse PII lookup (salaries of others, personal records) — this agent is FAQ-only, not HRIS
- Log all Q&A for audit (question, tools used, sources, answer)
- Rate-limit and auth via SSO (employees only)

## Suggested stack

| Layer | Choice |
|-------|--------|
| API | FastAPI / Next.js route |
| Agent | LangGraph (Python) or Vercel AI SDK + tools |
| Embeddings | `text-embedding-3-small` or equivalent |
| Vector DB | pgvector (if Postgres already exists) |
| Auth | Company SSO (OIDC) |
| Observability | LangSmith / Helicone + structured logs |

## UX

- Slack bot or Teams bot as primary surface (where employees already ask)
- Optional web chat for longer handbook browsing
- Show “Sources” accordion under each reply
- Feedback buttons: 👍 / 👎 → feeds eval set

## Evaluation plan

Start with 30–50 golden Q&A pairs from real HR tickets:

| Metric | Target |
|--------|--------|
| Answer grounded in retrieved docs | ≥ 90% |
| Citation present when factual | ≥ 95% |
| Hallucinated policy claims | 0 on eval set |
| p95 latency | < 8s (Slack) |
| Escalation when no source | correct behavior |

Run offline eval (retrieve + answer) before launch; sample live traffic weekly.

## Rollout

1. Ingest wiki + top 10 HR PDFs; ship Slack bot to HR pilot group
2. Measure thumbs-down and missed retrievals; expand corpus
3. Add ticket escalation + region/role metadata filters
4. Full company rollout with #faq-agent channel announcement

## Open decisions (need stakeholders)

- Exact wiki product and API access
- Which PDFs are canonical vs draft
- Who owns policy updates / re-indexing SLA
- Whether answers may quote salary bands / equity docs
- Human review required for certain label categories (e.g. “leave of absence”)

## Rough effort

| Phase | Estimate |
|-------|----------|
| Ingestion + vector index | 3–5 days |
| Agent + tools + Slack | 5–8 days |
| Guardrails + eval harness | 3–4 days |
| Pilot + iteration | 1–2 weeks |

**Total to pilot**: ~3–4 weeks for one engineer familiar with the stack.
