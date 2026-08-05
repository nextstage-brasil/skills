# Agent Evolution Maker — harness lessons from the first production MCP agent

> **Scope:** evolution of the **NextStage harness** in this repository (`skills/ns-langgraph-agents`, `ns-multi-agent-architect`, related code/eval skills, catalog coupling).  
> **Empirical source:** `agents/decisionsuite/agent-api` (v1.0.0 → ~2.6.x) — first factory-born runtime that ran MCP end-to-end in production, then maintained under harness workflows.  
> **Mandatory evidence (this mission):**  
> 1. Product `docs/` (living specs, `_done` versions, action plans)  
> 2. **`git log` / commits** on the product (~74 commits on agent-api)  
> 3. Live `src/` tree after those commits  
> **Reading rule:** extract **concepts** (graph, memory, governance, tokens, tools, fidelity, audit, dev-chat). App names, domain skills, panel/vendor vocabulary in the source product are **illustration only** — not doctrine to copy into harness skills.  
> **Out of scope:** factory `.batschspec` templates as authority; product business vertical; copying domain prompts.

**Date:** 2026-08-05  
**Product root (read-only reference):** factory path `agents/decisionsuite/agent-api`  
**Harness baseline under review:** `skills/ns-langgraph-agents` (v1.1) + `skills/ns-multi-agent-architect` (v1.0)

---

## 0. Evidence from commits (conceptual map)

History read via `git log` on the product `agent-api`. Below: **problem solved → concept → commit anchors** (abbreviated messages; local SHAs). Late commits that only rewire product-local harness copies are ignored as harness doctrine.

| Order | Concept (harness) | Anchor commit(s) |
| ----- | ----------------- | ---------------- |
| 1 | Minimal agent + summarize context | `983dfe9` v1.0; `270c784` summarize context |
| 2 | User-facing response formatting | series `e8e8b26`…`983dc52` |
| 3 | Empty-reply retry | `599b6b0` |
| 4 | **Arg fingerprint + recursion limit** (anti tool-loop) | `f5b62f7` |
| 5 | Tool-use / enrich / breakdown enforcement | `cf2e41b`, `2b7f8f9`, `4e4652e` |
| 6 | **SSE sanitize** + XML tool recovery | `607fc19`, `e37e240` |
| 7 | Skills + gather/deliver prompt split (evolution) | `720464c`, `85ff409` (domain = illustration) |
| 8 | **Normalize MCP result + separate caps** | `e34aaee` |
| 9 | **Numeric fidelity** + locale formatters | `d004473`, `86f8045` |
| 10 | **Cost-by-thread** view (`unpriced_calls` later) | `d808f67` |
| 11 | **Dev-chat Playwright eval** | `5908310`, `397e98e` |
| 12 | TTFT latency + period fidelity | `d2297ad`, `d617b18` |
| 13 | **Overhaul:** intent + fact derivation + evidence bundle + context compaction + bounded gather | `ff97ef1` |
| 14 | SpeechAct / needsData / discovery-first | `c4cfcaf` |
| 15 | Structural catalog cache + fidelity refinements | `d387d23` |
| 16 | Catalog bypass + field-values cache + latency budget + fidelity alert | `1a755f9` |
| 17 | Cache flush on boot (stale catalog) | `97e6aa0` |
| 18 | Structured chart artifact + multi-month intent + gather nudge | `271d3a9` |
| 19 | Mock/schema aligned to live wire + golden `tools/list` | `69d1e47`, `82dfaa4`, `3629c08` |
| 20 | Partial payload handling + **bounded ReAct** topology | `82dfaa4` |
| 21 | `llm_logs.stage` + composer streaming/TTFT | `d6fe2cc` |
| 22 | **Turn decision audit** (state + Postgres) | `3c469fb` |
| 23 | Catalog-grounded clarification (no dead-end prose) | `9cbe307`, `698b50a`, `1bca010` |
| 24 | Chart encoding / evidence paint refinements | `7d94d31`, `696b5fa`, `4af3349` |

**Arc across commits:**  
`1.0 skeleton` → tool/loop control → stream sanitize → **token economy + MCP fidelity** → **dev-chat eval** → **intent / bounded gather / composer** → caches / bypass / wall-clock budget → schema-derived MCP contract → **turn-decision audit**.

Harness takeaway: commits are the timeline of corrections to **internalize in skills/references/snippets**, not optional product folklore.

---

## 1. What the harness already teaches (baseline)

`ns-langgraph-agents` is strong on **structure and placement**; weak on **default topology and runtime controls** that made the reference agent answer economically under real MCP.

| Layer | Harness today (`ns-langgraph-agents`) | Typical agent after following harness only |
| ----- | ------------------------------------- | ------------------------------------------ |
| Graph | Architectures: ReAct / plan-execute / reflection / supervisor / RAG / guardrails | Open ReAct or HITL loop; **no** `react_bounded` + gather/composer split as default for MCP |
| MCP | Discovery, allowlist, wire `__`, lifecycle, complex multi-server | Binding possible; **normalize-before-truncate**, structural cache, golden `tools/list` not mandated |
| Skills | Bind vs auto-inject, separate skill-body cap (doctrine) | Registry guidance yes; **gather prompt ≠ deliver prompt** under-specified |
| Memory | Trim / summarize / persist compaction; snippet ~50 LOC | Checkpointer + basic trim; **no** dedicated `context_compact` node / prune+compress pipeline |
| Observability | Postgres audit outline, fingerprints on tool_executions | SoT ok; **stage**, **turn_decisions**, **costs-by-thread** thin or absent |
| HTTP/SSE | Envelope + HITL; **dev-chat marked optional** | Contract ok; human train/test UI not Definition of Done |
| Capability | Classify → allowlist → audit → rate limit; fingerprint mentioned | **No** mandatory `MAX_TOOL_CALLS_PER_TURN` / `MAX_MCP_CALLS_PER_TURN` / duplicate-skip loop doctrine |
| Evals | Architecture / tool-selection / memory suites | Unit/eval templates; **Playwright against `/dev-chat`** not a gate when `streaming_sse` + MCP |
| Snippets | `context-window`, MCP lifecycle, SSE, wire names, state | Missing: `normalizeMcpToolResult`, `tool-budget`, evidence channels, intent/composer skeleton |

**Verdict:** harness already knows how to **place and wire** an agent-api. The reference product paid production cost to learn **how the motor behaves under expensive tokens, open MCP catalogs, and fidelity**. That behavior must become harness doctrine so new agents do not rediscover 1.0→2.6.

---

## 2. Conceptual trajectory (business-agnostic)

Observed execution architecture evolution (abstracted):

```
Open ReAct (v1)
  → fixed deterministic query-shape pipeline          [coverage regression]
  → bounded ReAct LLM-native over real MCP catalog    [correct restoration]
  + intent router (speechAct / needsData)
  + deterministic bypass for cheap catalog/lookup classes
  + composer as sole user-facing writer
  + evidence channels in state (LLM prose is never SoT)
```

**Structural lesson for harness:** MCP exists to be **operated by a reasoning agent**, not fed by a script of N fixed query shapes. Fixed shapes save tokens on the happy path and **fail silently** outside the mold. Stable pattern:

1. **Deterministic islands** where the contract is closed (hydrate, artifacts, catalog lookup, numeric fidelity, budgets).  
2. **Bounded ReAct** where the query space is open (MCP call authoring).  
3. **One composition node** that narrates only what state already proves.

`ns-multi-agent-architect` must learn to **recommend this default** for LangGraph + MCP tool-heavy products, not leave “MVP chat + tools → open ReAct” as the only greenfield path.

---

## 3. Correction catalog — what harness must absorb

Each item was paid in production (real threads, `_done` plans, living `graph-spec.md`). Tool/app names omitted on purpose.

### 3.1 Graph and topology

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **Intent classify node (LLM light)** | Avoid expensive ReAct on chitchat/clarify; classify `speechAct` / `needsData` | Add architecture `react_bounded` to `architectures.md` + `graph-spec` template: `guard → context_compact → intent_classify → (gather \| bypass \| composer) → composer → respond` — node id `intent_classify` writes state channel `intent` (never same string for both) |
| **Bounded ReAct gather** | Unbounded ReAct blows tokens/latency; silent `break` on LLM failure | Doctrine: `MAX_ITERATIONS` + tool budgets; LLM invoke failure → `errorCode` on state, never silent exit |
| **Composer sole-writer** | SSE flicker / “finished” mid-gather; polluted history | Gather strips terminal `content`/`reasoning` without `tool_calls`; only composer emits user-facing Markdown |
| **Deterministic bypass** | Catalog/list-value questions do not need multi-round main model | Post-intent 3-way route; zero LLM on bypass; same brief contract gather would fill |
| **Single SystemMessage nudge** | Model ends without tools on `needsData` turn | Never fake HumanMessage; skip nudge when catalog absence already confirmed |
| **Per-turn bind filter** | Mutation/hygiene tools on read-only questions | Essential surface ≠ bind surface; filter by **generic** user vocabulary, not domain hardcoding in `src/` |
| **Gather vs deliver prompts** | Deliver skill in gather induces premature Markdown | Two prompts: gather (tools only) vs composer (skill + formatting) — extend `prompt-and-capability-injection.md` |

### 3.2 Evidence and fidelity (state > prose)

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **Evidence bundle in state** | Composer invents totals / mixes units | Deterministic hydrate from tool payload; reject `null→0` / empty-as-success shapes |
| **Discovery brief / catalog absence** | Hallucinated entities; nudge destroyed “does not exist” | Explicit positive and negative channels; composer branches on channels |
| **Derived facts in code** | LLM recomputes deltas and invents causes | Motor derives; composer narrates |
| **Numeric fidelity gate** | Numbers in prose outside the bundle | Post-LLM whitelist; non-destructive early-return for long series |
| **Fidelity alert (observability-only)** | Invented names without evidence | Heuristic → log; **never** blocks turn |
| **Pending external-error in state** | Credential/MCP failure became “send me the data?” | Classified error channel above generic clarify |
| **Structured artifact in state** | Markdown fence diverges from data | Artifact on `completed` envelope; Markdown is not chart SoT |
| **Incomplete / partial multi-dim payload** | Partial treated as empty or full success | Bundle flags + soft warning; surviving evidence beats generic clarify |

New harness reference candidate: `references/evidence-and-fidelity.md` (state-backed evidence doctrine).

### 3.3 Tokens, context, economy

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **`context_compact` pre-intent** | Fat ToolMessage history → cost + fidelity loss | Dedicated node/helper: prune → compress discovery → trim → summarize; SSE `thinking` only when summarize runs |
| **Normalize MCP result before truncate** | Double-stringify `{content, structuredContent}` cuts totals | Snippet + doctrine: extract LLM-visible text, **then** `truncateToolOutput` |
| **Separate caps** | Same cap truncated skill body and tool wire | Already doctrine — **enforce in snippets** (`skillBodyMaxChars` missing from current context-window snippet) |
| **Truncate catalog payload after cache** | ~20k+ chars resent every round of same turn | After structural cache write-through, ToolMessage becomes short note |
| **Compress intra-turn discovery tools** | Intermediate discovery pollutes prompt after analytical evidence | Prompt-only compaction post-evidence |
| **LLM stages by role** | One model/cost for intent, gather, composer, summarize | `observability.md` + llm config: stages `intent` / `analyst|gather` / `composer` / `summarize` |
| **Structural + field-values cache (L1/L2)** | Rediscovery costs LLM rounds, not just MCP ms | Opt-in pattern doc: key `tenantId` + resource + token fingerprint; never cache confirmed absence of free search |
| **Turn wall-clock budget** | Tool budget OK but turn >60s silent | `TURN_LATENCY_BUDGET_MS` + distinct error code vs client cancel |

Upgrade `context-window-and-tokens.md` and expand `context-window.ts.snippet` (~50 LOC → patterns for normalize + skill cap + compact helper).

### 3.4 Tool / MCP control

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **`MAX_TOOL_CALLS_PER_TURN` / `MAX_MCP_CALLS_PER_TURN`** | Infinite / expensive exploration | New snippet `tool-budget.ts.snippet` + capability-governance section; contracts already hint `max_tool_calls_per_turn` — promote to runtime MUST |
| **Arg fingerprint + duplicate skip** | Same tool+args N times per turn | Skip; break if entire round is duplicates **and** evidence already exists |
| **Allowlist ∩ discovery ∩ class** | Huge remote catalogs / dangerous tools | Keep; reinforce **slim essential surface** |
| **Schema from live `tools/list` (Zod)** | Hand-transcribed prompt diverges from wire | Golden fixture + mock must declare real `items`; permanent regression when MCP present |
| **Document contract in prompt only where Zod cannot** | Model invents string where object required | Align prose to schema; residual risk if remote schema drifts |
| **Connection / session cache** | Reconnect every turn | Already in mcp-complex-access — keep as MUST |
| **Deterministic auto-pagination** | LLM fails to page `totalRows > count` | Code pages under MCP budget before hydrate |
| **Acceptance metric: MCP time / total time** | “Inverted” latency (LLM ≫ tool) | Eval baseline script, not runtime gate |

### 3.5 Intent and safe determinism

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **LLM-first speechAct; zero domain vocabulary in code** | Regex heuristics become vertical debt | Post-process only calendar/locale + generic epistemic gates |
| **Parse failure → allow fetch** | Blind default clarify | Safe `needsData=true` on parse failure |
| **Challenge ≠ non-data** | Challenge-with-fetch was blocked | Only `clarify`/`chitchat` force `needsData=false` |
| **Slots = hints, not confirmed IDs** | False zero from case-sensitive names | Discovery-first before authoring |
| **Synthetic few-shots without demo-domain literals** | Follow-up loses slots | Placeholder few-shots; accept residual non-determinism |

### 3.6 Observability and audit

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **`llm_logs.stage`** | Intent/gather/composer indistinguishable | Observability reference + migration checklist |
| **`turn_decisions` JSONB on turn checkpoint** | Route/outcome only in code | Ephemeral state channel → UPDATE on checkpoint anchor |
| **`view_costs_by_thread` + `unpriced_calls`** | Unpriced model looked like cost 0 | NULL ≠ 0; specific ILIKE before generic |
| **Hide inputs on Postgres SoT** | Only tracer redacted | Central redaction in `logLlmCall` |
| **Composer `prompt_raw` = real payload** | Diagnose by token count | Log structured HumanMessage (truncated), not only user question |
| **`logLlmCall` on gather node** | Orphan `tool_executions` | Every LLM-calling node sets `llm_log_id` |

### 3.7 HTTP, human test UX, evals

| Concept | Problem solved | Harness implication |
| ------- | -------------- | ------------------- |
| **Dev-chat mandatory** | Without human UI, agent cannot be trained/iterated | Flip doctrine: `GET /dev-chat` + `DEV_CHAT_ENABLED` is **required** for new agent-api greenfield (local only); stop calling it optional in `runtime-layout.md` / `streaming-and-hitl.md` |
| **SSE sanitize user-facing** | Leak of tool XML / infra names | Stream filter; opacity of tool/MCP/provider names in final message |
| **Guards 403 thread×tenant / 409 busy** | Race and leak | Keep in build checklist |
| **Browser eval against dev-chat** | Unit green ≠ agent answers | Playwright conversational suite as regression gate when `streaming_sse` |
| **Golden `tools/list` + mock aligned to live** | Silent mock↔prod drift | Standard task when MCP is in scope (`ns-code-e2e-tests` / eval generators) |

---

## 4. Gap analysis — harness skills × reference agent

Legend: ✅ doctrine/snippet adequate · ⚠️ partial · ❌ missing or product-only

| Area | Harness (`ns-langgraph-agents` et al.) | Reference production | Action |
| ---- | -------------------------------------- | -------------------- | ------ |
| Capability primitives + wire `__` | ✅ | ✅ | Keep |
| MCP client/governance outline | ✅ skeleton | ✅ mature (cache, normalize, catalog) | **Elevate** normalize/budget/cache patterns into refs + snippets |
| Skills registry / inject | ✅ + separate skill cap doctrine | ✅ + selective auto-inject | Document gather vs deliver skill bind |
| Dev-chat | ⚠️ **optional** in layout/streaming refs | ✅ required human loop + rich fork | **Mandate** for greenfield agent-api |
| SSE envelope | ✅ | ✅ + additive chart/data extras | Keep; document additive extras |
| Context window | ⚠️ thin snippet + trim/summarize docs | ✅ compact node + prune/compress (~400+ LOC context module) | Port patterns into refs + snippets |
| Tool budget + duplicate fingerprint skip | ⚠️ contract mention only | ✅ `capability/tool-budget.ts` + loop | Add snippet + governance MUST |
| Intent + bounded gather + composer | ❌ architectures stop at open ReAct | ✅ living topology | Add `react_bounded` to architectures + graph-spec template |
| Evidence channels / fidelity | ❌ | ✅ | New reference + anti-patterns |
| Turn latency budget | ❌ | ✅ | Streaming/error-reliability + HTTP checklist |
| Turn decisions audit | ❌ | ✅ | Observability reference + migration note |
| Cost view by thread | ⚠️ tenant views outline | ✅ thread + unpriced | Align observability ref |
| Playwright / golden MCP | ⚠️ generic evals | ✅ | Wire into `evals-and-gates.md` + e2e skill hooks |
| Vertical-agnostic layout | ✅ | Product is single-vertical MCP | Do not force vertical layer for simple MCP agents |
| Multi-agent architect default | ⚠️ “MVP → ReAct” | Production needed bounded gather/composer | Update selection guide for MCP tool-heavy |

---

## 5. Proposed harness doctrine — “agent that answers” (new default)

Every LangGraph `agent-api` with **MCP and/or external tools** that this harness guides MUST leave Phase 0–6 of `ns-langgraph-agents` with the following Definition of Done (skills language — not factory bootstrap code).

### 5.1 Definition of Done (harness build workflow)

1. **Dev-chat** present and documented (`DEV_CHAT_ENABLED` local-only); same SSE contract as production.  
2. **Postgres observability** with capability columns; `DATABASE_URL` hard-fail in non-test.  
3. **MCP path** wired: registry + governance + `normalizeMcpToolResult` + truncate-after-normalize + audit `tool_kind` / `arg_fingerprint`.  
4. **Skills path** wired: `skills/*.md` discovery; skill-body cap **independent** of tool-output cap (snippet must include both).  
5. **Budgets:** `MAX_TOOL_CALLS_PER_TURN`, `MAX_MCP_CALLS_PER_TURN`, `recursion_limit`, `TURN_LATENCY_BUDGET_MS`.  
6. **Context compact** (node or single helper) before expensive reasoning.  
7. **Tool-heavy topology** (or generated task for it): intent → bounded gather → composer → respond; HITL only if RF requires.  
8. **Secrets** only in `configurable`; opacity on user-facing messages.  
9. **Postman** + smoke eval dataset; if MCP: golden `tools/list` in mock.  
10. If `streaming_sse`: at least one **browser eval path against `/dev-chat`** (Playwright or equivalent) in the project’s eval story.

### 5.2 Graph-spec requirements (when MCP)

Update `templates/graph-spec.md` architecture enum to include `react_bounded` (name TBD in implementation PR):

- Prefer `architecture: react_bounded` for open MCP query spaces (not open ReAct; not fixed N-shape pipeline as sole analytical path).  
- Declare **evidence channels** in state (`bundle` / `discoveryBrief` / `externalError` / `turnDecisions`).  
- Declare **who writes to the user** (exactly one node).  
- Declare **deterministic bypass** if catalog/lookup question classes exist.  
- Declare LLM stages and budgets in `graph-spec.md`.

### 5.3 Anti-patterns to add (FORBIDDEN for harness-guided agents)

Extend `references/anti-patterns.md`:

1. Truncate skill procedure with the same cap as MCP wire.  
2. Treat numeric `null` from tools as `0` without `rowCount`/shape.  
3. Count discovery-only tool calls as “has evidence”.  
4. Let gather emit the final user-facing answer.  
5. Domain vocabulary heuristics in the intent router inside `src/` (vertical/config only).  
6. Fixed query-shape pipeline as **only** analytical path over open MCP.  
7. Ship agent-api without `/dev-chat`.  
8. Log secrets / full system prompt into checkpointer.  
9. Silent `break` on LLM failure in gather.  
10. Generic clarify when classified MCP/external error already sits in state.

---

## 6. Harness evolution backlog (prioritized)

Order to materialize this doc into skills/refs/snippets — **not executed by this file**:

| Prio | Delivery | Target artifacts |
| ---- | -------- | ---------------- |
| P0 | Dev-chat mandatory in build workflow + layout/streaming refs | `SKILL.md` Phase 6, `runtime-layout.md`, `streaming-and-hitl.md` |
| P0 | `tool-budget` snippet + duplicate-skip doctrine | `templates/snippets/tool-budget.ts.snippet`, `capability-governance.md` |
| P0 | `normalizeMcpToolResult` + skill cap in context snippet | `context-window.ts.snippet`, `context-window-and-tokens.md`, `mcp-complex-access.md` |
| P1 | `context_compact` / `prepare-llm-messages` pattern | `context-window-and-tokens.md`, optional snippet |
| P1 | Architecture `react_bounded` + topology in graph-spec template | `architectures.md`, `templates/graph-spec.md`, `ns-multi-agent-architect` selection guide |
| P1 | State channels: evidence / discovery / externalError / turnDecisions | `templates/snippets/state.ts.snippet`, graph-spec template |
| P1 | Turn latency budget + error code | `error-and-reliability.md`, `streaming-and-hitl.md` |
| P2 | LLM stages + `llm_logs.stage` | `observability.md` |
| P2 | Costs-by-thread + unpriced_calls | `observability.md` |
| P2 | State-backed evidence & fidelity doctrine | **new** `references/evidence-and-fidelity.md` + anti-patterns |
| P2 | Evals: golden MCP `tools/list` + Playwright/dev-chat gate | `evals-and-gates.md`, hooks from `ns-code-e2e-tests` / PM e2e generators |
| P3 | Structural/field cache pattern (opt-in) | `mcp-complex-access.md` subsection |
| P3 | Fidelity-alert observability helper | `observability.md` or evidence ref |

### Suggested skill ownership

| Change class | Owning skill |
| ------------ | ------------ |
| Runtime doctrine, snippets, graph-spec, anti-patterns | `ns-langgraph-agents` |
| Default architecture recommendation for MCP tool-heavy | `ns-multi-agent-architect` |
| Browser / conversational eval tasks | `ns-code-e2e-tests` (+ PM e2e generator when issuing work) |
| Implementation of product diffs after doctrine lands | `ns-code-coder` / `ns-code-autonomous` |
| Catalog / install discoverability of new refs | `ns-harness` + `packages/harness/templates/catalog.json` if new skill files are added |

---

## 7. What NOT to port (product ≠ harness)

- Domain vocabulary, domain skills, domain prompts (BI/CRM/etc.).  
- Essential catalogs of one specific MCP server (port only **mechanism**: essential surface + slim bind).  
- Product-specific chart encodings (port only: artifact in state + render hook in dev-chat).  
- Business heuristics in intent.  
- Coupling to a concrete app/panel id.  
- Factory `.batschspec` file layout as authority — harness evolves its own skills; factory may converge later independently.

---

## 8. Mission confirmation

This document records that:

1. Evidence required **docs + commits + src** of the reference agent; commits are the timeline (§0).  
2. The agent started **basic** (bootstrap) and became functional/economical through **dozens of conceptual commits** (tokens, tools, fidelity, graph, audit) — not “more business prompt”.  
3. Harness **already has** pieces (capability kinds, MCP skeleton, SSE, Postgres outline, separate skill caps, optional dev-chat) but **does not yet default** the topology and controls that made the agent answer well under MCP.  
4. Going forward, harness goal: **new agents guided here ship with tools/MCP/skills + budgets + compaction + gather/composer + mandatory dev-chat**, without rediscovering 1.0→2.6.  
5. Analysis is **business-agnostic**; factory evolution doc is a sibling narrative, not the source of harness truth.

---

## 9. Internal harness references (to evolve)

- `skills/ns-langgraph-agents/SKILL.md`  
- `skills/ns-langgraph-agents/references/architectures.md`  
- `skills/ns-langgraph-agents/references/context-window-and-tokens.md`  
- `skills/ns-langgraph-agents/references/capability-governance.md`  
- `skills/ns-langgraph-agents/references/mcp-complex-access.md`  
- `skills/ns-langgraph-agents/references/prompt-and-capability-injection.md`  
- `skills/ns-langgraph-agents/references/streaming-and-hitl.md`  
- `skills/ns-langgraph-agents/references/observability.md`  
- `skills/ns-langgraph-agents/references/evals-and-gates.md`  
- `skills/ns-langgraph-agents/references/anti-patterns.md`  
- `skills/ns-langgraph-agents/references/runtime-layout.md`  
- `skills/ns-langgraph-agents/templates/graph-spec.md`  
- `skills/ns-langgraph-agents/templates/snippets/*`  
- `skills/ns-multi-agent-architect/SKILL.md` + `references/decision-pillars.md`

## 10. Empirical references (read; do not copy domain)

Under the product `agent-api/docs/`:

- `specs/graph-spec.md`, `specs/agent.md`, `specs/observability.md`, `specs/integrations.md`  
- `versions/_done/1.0.0/` … `2.6.2/`  
- `versions/_done/plano-acao-inversao-latencia-fidelidade.md`  
- `versions/_done/2.1.0-llm_native_mcp/plan.md`

Live `src/` anchors (concept → path):

| Concept | Path |
| ------- | ---- |
| Tool budgets | `src/capability/tool-budget.ts` |
| Arg fingerprint | `src/capability/governance.ts` |
| Context compact | `src/graph/nodes/context-compact.node.ts`, `src/memory/prepare-llm-messages.ts` |
| Normalize MCP | `src/memory/context-window.ts` (`normalizeMcpToolResult`) |
| Bounded gather | `src/graph/nodes/analyst-agent.node.ts` |
| Intent / route | `src/graph/nodes/intent.node.ts`, `src/graph/intent/intent-route.ts` |
| Composer / fidelity | `src/graph/nodes/composer.node.ts`, `src/graph/composer/` |
| Evidence | `src/graph/evidence/` |
| Dev-chat | `src/http/dev-chat.ts` |
| Turn latency | `src/http/server.ts` (`TURN_LATENCY_BUDGET_MS`) |
| Turn decisions | `src/state.ts` (`turnDecisions`), `src/observability/postgres.ts` |
