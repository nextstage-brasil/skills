# Query modes

Route by **intent**. Wrong route: global over-abstracts a fact lookup; local hallucinates themes from a tiny neighborhood.

## Modes

### Vector / hybrid

One or few text units answer. Rank fusion when keywords matter (`ns-postgres-rag` hybrid). No hop. Still cite-or-refuse.

### Local (entity + path)

1. Map question to anchor entities (description embeddings + aliases).
2. If file vs process (or two types) is ambiguous, **ask** before restricting.
3. Walk typed edges with caps: depth (default ≤ 5), fanout, cycle set, score floor.
4. Pack context: path, neighboring fact edges, supporting text units, optional nearby community snippet.
5. Compose with citations. Unresolved mentions stay marked as not-on-cadastre when that is product policy.

Executor **and** store refuse `max_depth` above the cap. No free query language.

Canonical tool: `query_knowledge_graph` (see SKILL.md). Paths in the payload are the evidence.

### Global (community map-reduce)

1. Rank community reports by relevance to the question (report embeddings).
2. Map: partial answers per report batch, with scores.
3. Reduce: synthesize, still citing unit ids carried in reports.

Use for corpus-wide themes, “main risks”, “what is this collection about.” Not for “who signed invoice 12.”

### Explore

Low-confidence intent: start global (or community of mapped entities), then local drill. Costlier; not the default.

## Context mix (local)

Budget tokens across text units vs community text. Prefer **whole** reports over truncated reports. Too much community prose buries the path; too little loses theme.

## Streaming and latency

First operator-visible “thinking” should appear quickly; later hops may show the current user-facing intent. Generation **streams** from the composer only. Ingest must not starve this path.

Target families (lock in report): single-tool p95; multi-hop 2–5 p95. Silent waits fail accept.

## Return contract

Every hit: `ids`, `score`, `path`, `provenance`, `confidence`, `cut_reason`, classified `error` — `../../ns-postgres-rag/references/retrieval-contract.md`.
