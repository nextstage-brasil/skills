---
name: ns-postgres-rag
description: "(NS) PostgreSQL retrieval layer — pgvector RAG, hybrid FTS+vector, GraphRAG entity/edge tables, entity resolution, multi-hop traversal, million-document scale. Use whenever the user wants RAG or GraphRAG on Postgres, pgvector indexes, hybrid search, document links, entity merge, multi-hop paths, or a retrieval design for 1MM+ files — even if they say search, embeddings, or knowledge graph in SQL. Do NOT use to implement application code (hand off to ns-spec-driven after the Retrieval Design Report is approved). Do NOT use for competing vector databases, CrewAI, or generic web apps."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.1"
depends:
  - ns-harness
---

# PostgreSQL retrieval (RAG / GraphRAG)

Postgres retrieval doctrine: `pgvector`, FTS, entity/edge, multi-hop.

**Analyze. Recommend. No app code.** Report approved: `ns-spec-driven` (Specify / Tasks).

## Central rule

Link = **query result**, never text inference. Vector = **candidate**. **Edge** only after key/rule confirm + stored provenance. Path always `path` + `provenance` + `confidence`.

Canonical hop (English artifacts only): `company → contract → invoice → payment`. No other domain.

Required: `pgvector`. Timescale: optional — temporal volume, retention, or time partition. Scale: 1MM+ files, document links.

## Applicability

| Context | Strength |
| ------- | -------- |
| Greenfield retrieval on Postgres | **MUST** Gates 1–3 before DDL counts as approved |
| Brownfield schema / indexes | **MUST** inventory DDL first; diagnose similarity-as-link |
| Approved report, human wants code | **Stop.** `ns-spec-driven` owns Specify / Tasks |

Read **repo** (DDL, migrations, Postgres version, extensions, source formats). Do not ask human for facts tree already shows.

## Routing (read first)

| Signal | Action |
| ------ | ------ |
| Wants app implementation now | Fill report if missing; else `ns-spec-driven`. **No** app code |
| Similarity used as stored link | `references/anti-patterns.md` + `references/entity-resolution.md` |
| Answer needs N≥2 hops; no single document holds chain | GraphRAG — `references/retrieval-decision.md` |
| Topic search, small corpus, no hop chain | Vector-only — refuse graph tables |
| GitLab `ISSUE_URL` or SDD version scope | Defer `../../ns-harness/references/code-skill-routing.md` |

## Boot (mandatory)

See `../../ns-harness/references/session-boot.md` — **complete Session boot (blocking)**. Then scan:

1. DDL / migrations (tables, indexes, `vector`, `tsvector`, entity/edge)
2. Postgres version; extensions (`pgvector` required; Timescale if present or Gate 2 trigger)
3. Source formats, corpus paths, counts if inferable
4. Continue this skill

**Success:** inventory from tree + project rules. **Failure:** invented schema or asking human for facts in repo.

## Flow

boot. Gate 1 Corpus Inventory. Gate 2 Retrieval Decision. Vector **or** hybrid RRF **or** GraphRAG in Postgres. Gate 3 Retrieval Design Report. Human approve. `ns-spec-driven` (or loop inventory).

## Gate 1 — Corpus Inventory (blocking)

Fill from repo + data sample. Human only for gaps tree cannot show. Fields: `templates/retrieval-design-report.md`. Method: `references/corpus-assessment.md`.

| Field | Why |
| ----- | --- |
| Volume (files, bytes, chunk estimate) | Index + storage at 1MM+ |
| Growth / mutability | Re-embed rate, upsert vs rebuild |
| Entity density | Graph tables vs vector-only |
| Question archetypes | Mode |
| Latency budget (p95) | HNSW / filter / hop caps |

No skip. Missing inventory = no Gate 2.

## Gate 2 — Retrieval Decision (blocking)

Pick **exactly one** mode. Matrix: `references/retrieval-decision.md`.

| Mode | When |
| ---- | ---- |
| Vector-only | Topic / similarity; no hop chain |
| Hybrid (`tsvector` + vector, rank fusion) | Keyword + semantic; one document often answers |
| Relational GraphRAG | N≥2 hops **and** no single document contains chain |

Extensions: `pgvector` always. Timescale only `references/operations-and-scale.md` — not default.

Post decision + one-paragraph why **before** full report. Wrong mode = rewrite Gate 2, not paper over in DDL.

## Gate 3 — Retrieval Design Report

Copy `templates/retrieval-design-report.md`. Fill every section. **No application code.** SQL = target DDL / query shape, not shipped migration.

Human approve before `ns-spec-driven`. Reject: loop Gate 1 or Gate 2.

## Reference map

Load on demand.

| Reference | Read when |
| --------- | --------- |
| `references/corpus-assessment.md` | Gate 1; 1MM+ projection |
| `references/retrieval-decision.md` | Gate 2 mode + partition / Timescale |
| `references/schema-and-indexes.md` | Target DDL, HNSW, filters, partition |
| `references/entity-resolution.md` | Merge, aliases, no edge without evidence |
| `references/ingestion-pipeline.md` | Extract, chunk, embed, idempotent upsert |
| `references/multi-hop-traversal.md` | Recursive SQL caps; company/contract/invoice/payment |
| `references/retrieval-contract.md` | Return shape; `path` / `provenance` / `confidence` |
| `references/evaluation-and-gates.md` | Golden questions, recall, false-link, EXPLAIN |
| `references/operations-and-scale.md` | 1MM+ build, storage, retention, Timescale |
| `references/anti-patterns.md` | Before marking report done |

Snippets (illustrative SQL / one return type): `templates/snippets/`.

## Handoff to ns-spec-driven

After **human approval** of Retrieval Design Report:

```markdown
## Retrieval implementation planning
- Report: path/to/retrieval-design-report.md (approved)
- Mode: vector-only | hybrid | relational GraphRAG
- Target DDL: [tables]
- Indexes: [HNSW / GIN / partition]
- Ingestion: [idempotent key + hash]
- Eval gates: [recall@k, path precision, false-link, p95]
- Out of scope for this skill: application code
```

`ns-spec-driven` owns Specify / Tasks. This skill writes **no** application code.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| Human asks for app implementation | Report first; then `ns-spec-driven` only |
| Similarity proposed as stored edge | Refuse; candidate + confirm + provenance |
| Graph mode without N≥2 hop need | Refuse graph; vector or hybrid |
| Competing vector store as default | Stay Postgres + `pgvector` |
| Unbounded recursive walk | Cap depth, fanout, cycles, score prune |
| Timescale with no temporal trigger | Do not recommend |
| Inventory skipped | Block Gate 2 |

## Forbidden

- Implement retrieval layer (consumer migrations, workers, HTTP)
- Embedding distance as link
- External graph store as default
- Second domain example besides `company → contract → invoice → payment`
- Name application languages or frameworks (SQL/DDL allowed; one illustrative return-type snippet)
