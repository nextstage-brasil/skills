# Query modes — six answer shapes

Route by **answer shape**. Wrong shape: path walk for a count; synthesis without mention substrate; global theme language when the question is a filtered set.

Default scope = everything the caller may see. **Scope restriction** (collection, import origin, document type) applies **with authorization before ranking** — never after rank fusion.

## Shapes

### 1 — Unit / vector

One or few text units answer. Hybrid rank when keywords matter (`ns-postgres-rag`). No hop.

**Citation:** verbatim unit span + document/page.

### 2 — Path

Named anchors; “how does A reach B”; N≥2 hops.

1. Map question to anchor entities (description embeddings + aliases). Unresolved anchor → **candidate return** (ranked list) — no silent guess.
2. If file vs business record (or two types) ambiguous, **ask** before restricting.
3. Walk typed fact edges with per-hop caps: depth (default ≤ 5), fanout, cycle set, score floor, **authorization inside each step**.
4. **Batch expansion:** one read per hop over the current anchor set — never one read per node.
5. **No model call per hop** — traversal is deterministic; model only at extract and compose.
6. Pack context: path, edges with evidence, supporting text units.
7. Compose with citations.

**Citation:** edge chain + evidence rows (document, unit, quoted span, confidence).

Executor **and** store refuse `max_depth` above the cap. Canonical tool: `query_knowledge_graph` (SKILL.md).

### 3 — Filtered set

Entity set with attribute predicates and optional **temporal window** (edge period, record time).

Resolves via mentions + entity attributes — **not** by walking paths until the set appears.

**Citation:** per-row provenance (mention or attribute source unit).

### 4 — Count / aggregate

Group-by or totals over a filtered population. Each result row still carries its own citation substrate — aggregate number without row-level evidence is not done.

**Citation:** per-row unit span or edge evidence supporting membership in the bucket.

### 5 — Anchor synthesis

Scoped summary when a single record is opened (pre-computed or on-demand). Uses mentions and local fact edges around the anchor — not corpus-wide map-reduce.

**Citation:** per-claim verbatim spans from retrieved units.

### 6 — Document correlation

Fresh upload compared to existing registry: explicit edges, resolved entities, and **unregistered mentions** (labeled, not silently promoted).

**Citation:** spans from the new document units + matched registry evidence.

## Temporal predicates

Edge `period` and record timestamps are first-class filters in set, count, and path shapes — not post-hoc trimming.

## Per-hop discipline

At **each** expansion step apply: authorization predicate, allowed edge types, confidence floor, top-N, visited set. A **denied node is not a bridge** to reach permitted data.

## Telemetry envelope

Every answer returns: hops executed, nodes/edges examined vs returned, `cut_reason`, stage latencies, cache hit flag. Aligns with `../../ns-postgres-rag/references/retrieval-contract.md`.

## Discovery (opt-in)

When the discovery gate is on, indirect-link enumeration and grouping run under the same hop caps and cite-or-refuse rules. Output = **hypotheses** — see `discovery-layer.md`. Not a seventh default shape.

## Streaming and latency

First operator-visible progress quickly; generation **streams** from the composer only. Ingest must not starve interactive query.

Target families (lock in report): single-shape p95; multi-hop 2–5 p95.

## Operator visualization

Show the **retrieved path or cited subgraph** — not the whole graph. Full-graph views are ops/debug only.
