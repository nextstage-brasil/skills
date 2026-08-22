# Cognitive architectures (LangGraph)

Lock architecture in `graph-spec.md` before code. Runtime follows **signals**, not enum names.

## Node id vs state channel

`AgentState` key = state channel. `addNode` string = node id. Same string forbidden — compile/runtime error (*state attribute cannot also be used as a node name*).

| Rule | Example |
| ---- | ------- |
| Node id ≠ channel when both exist | `analyst` writes `analysis` / `executionPlan` — never `addNode("analysis")` |
| Diagrams use node ids | `analyst`, `executor`, `mcp_catalog` |
| `graph-spec.md` Nodes table = node ids | State schema = channel keys; map writer in Outputs |

`messages` = reducer channel — still no node named `messages`. State has `plan` — node is not `plan`. Any channel key: different node id.

`context_manager` as node id only when state has **no** `context_manager` channel (typical: node rewrites `messages` / `summary` only).

## ReAct (default loop)

```
agent → tools? → agent → … → END
```

**Signals:** tool loop; optional planner `raciocínio` / reasoning for audit.

**When:** exploratory tasks, dynamic tool choice, moderate autonomy.

**Graph:** `agent` + `ToolNode` + conditional on `tool_calls`.

## Analyst–executor (`plan_execute`) — suggested start for most MCP agents

Starting suggestion, not a rule. Lock the real topology in `graph-spec.md` (architect interview may pick ReAct, HITL-heavy, supervisor, etc.).

**No `intent` / `intent_classify` hop** on this suggestion. Retired names (`intent_node`, `context_compact`, `gather` as the greenfield default) stay retired unless `graph-spec.md` explicitly restores a different compile.

```
START → guard → context_manager → mcp_catalog → analyst
analyst → executor | composer | analyst
executor → analyst
composer → respond → END
```

`routeAfterGuard`: `agent` → `context_manager`; block → `respond`.

`routeAfterAnalyst`: `need_more_data` + non-empty `executionPlan.actions` → `executor`; `need_more_data` + empty actions → `analyst` (directive hop, cap iterations); else → `composer`.

**HITL:** optional `interrupt()` **inside** executor (or analyst) when `graph-spec.md` locks HITL / destructive tools. Resume → continue executor or composer. Default greenfield graph **does not** compile an `interrupt` node.

**Signals:** JSON analyst (no `bindTools`); deterministic executor; composer sole-writer; persisted `mcpCatalog` (name+description only); durable `summary` off `messages`.

**When:** typical MCP / open query space — **suggested start**. Not mandatory. Simple local-tool MVP may stay open ReAct; HITL-heavy or specialist graphs may differ.

**Graph rules:**

- Analyst emits `executionPlan` + `userFacingIntent` (operator language = current user message) — SSE `thinking`, not Markdown — `planner-contract.md`
- Executor runs tools/MCP; hydrate `dataBundle` / `discoveryBrief`; never user Markdown
- Composer only node with final user text (`response_streaming`)
- `mcp_catalog` no-op when `catalogVersion` matches; never checkpoint bound tools or secrets
- `context_manager` compact + durable `summary` — `context-window-and-tokens.md`
- Locale: `guard` clears ephemeral fields then `resolveConversationLocale` same hop
- Budgets: `tool-budget.ts.snippet`; evidence: `templates/graph-spec.md`
- Cap analyst↔executor loops (`MAX_ANALYST_ITERATIONS`)

**State channels:** `analysis`, `executionPlan`, `executionResults`, `analystStatus`, `mcpCatalog`, `summary`, `dataBundle`, `discoveryBrief`, `externalError`, `turnDecisions`, ephemeral `turnLocale` — `templates/snippets/state.ts.snippet`.

`react_bounded` in old specs = this motor. Do not implement speechAct `intent_classify` as a node.

## Plan-Execute (generic)

Non-MCP fixed workflows may use `plan_node` → `execute_step`* → `synthesize`. Same operator-progress contract when `streaming_sse`. MCP agent-api often starts from **Analyst–executor** above, unless `graph-spec.md` locks another architecture.

## Reflection

```
agent → tools → critic → (retry | END)
```

**Signals:** `critic.md` — `aprovado`, `nota`, `max_reflexoes`. Named error categories, not “revise this.” If none found, say so — no generic praise. High-stakes facts: flag + HITL, do not auto-correct. Optional critic on a different model family.

**Cost:** one extra LLM invoke per turn. Skip unless the quality gate pays for it.

**When:** quality-sensitive outputs.

**Graph:** critic before END; conditional on approval threshold.

## Supervisor / multi-agent (advanced)

```
supervisor → worker_a | worker_b → supervisor → END
```

**When:** distinct personas **and** vocab/tools/risk diverge (`ns-multi-agent-architect` one-vs-many). Avoid premature use.

**Pattern:** subgraph per worker OR supervisor routes via structured output.

## RAG-augmented

```
retrieve → agent → tools? → END
```

**When:** knowledge-heavy Q&A; tenant-scoped corpora. One retrieve is enough.

**Rules:** filter `tenant_id`; citations as state refs, not full docs.

More than one retrieve-evaluate cycle: prefer analyst⇄executor + tool budget over a separate “agentic RAG” topology — unless `graph-spec.md` locks otherwise. Budget exhausted / low confidence → clarify or HITL; do not invent.

## Guardrails-first

```
safeguard → agent → tools → END
```

**When:** user-facing; injection risk.

**Pattern:** classifier node before main LLM — not system prompt alone.

## Selection guide

Suggested starting point only — lock the architecture in `graph-spec.md`.

| Need | Suggested start |
| ---- | --------------- |
| MVP chat + local tools only | ReAct |
| MCP / external tools + open query space | `plan_execute` (most cases) |
| Fixed business workflow (no MCP agent-api) | Plan-Execute (generic) |
| Quality gate | Reflection (pays +1 LLM invoke / turn) |
| Many specialists | Supervisor (later) |
| Untrusted input | Guardrails + ReAct or plan_execute |

## graph-spec requirements per architecture

Document in `templates/graph-spec.md`:

- Node list + responsibilities
- State fields beyond `messages`
- Interrupt points (HITL)
- Tools per node bind
- Eval scenarios proving architecture

Framework comparison (LangGraph vs CrewAI): `ns-multi-agent-architect` — not this file.
