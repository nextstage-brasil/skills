# Cognitive architectures (LangGraph)

Lock architecture in `graph-spec.md` before code. Runtime follows **signals**, not enum names.

## Node id vs state channel

`AgentState` key = state channel. `addNode` string = node id. Same string forbidden — compile/runtime error (*state attribute cannot also be used as a node name*).

| Rule | Example |
| ---- | ------- |
| Node id ≠ channel when both exist | `intent_classify` returns `{ intent: { speechAct, needsData } }` |
| Diagrams use node ids | `intent_classify`, not channel `intent` |
| `graph-spec.md` Nodes table = node ids | State schema = channel keys; map writer in Outputs |

`messages` = reducer channel — still no node named `messages`. State has `plan` — node `plan_node` or `planner`, not `plan`. Any channel key: different node id (`intent` channel, `intent_classify` node).

`context_compact` as node id only when state has **no** `context_compact` channel (typical: node rewrites `messages` only). Need compact metadata channel: use `compactMeta` or node `context_compact_node`.

## ReAct (default loop)

```
agent → tools? → agent → … → END
```

**Signals:** tool loop; optional planner `raciocínio` / reasoning for audit.

**When:** exploratory tasks, dynamic tool choice, moderate autonomy.

**Graph:** `agent` + `ToolNode` + conditional on `tool_calls`.

## Bounded ReAct (`react_bounded`)

```
guard → context_compact → intent_classify → (gather | bypass | composer) → composer → respond → END
```

Node ids above — not channel names. `intent_classify` writes `intent`. No `addNode("intent", …)` when `intent` on `AgentState`.

**Signals:** open MCP/external query space; `needsData` routing; composer sole-writer; optional catalog bypass.

**When:** tool-heavy; unbounded ReAct blows tokens/latency or gather pollutes stream. **Preferred default** greenfield LangGraph + MCP. Simple local-tool MVP may stay open ReAct.

**Graph rules:**

- Gather strips terminal `content`/`reasoning` without `tool_calls` — no user Markdown
- Composer only node with final user text
- `intent_classify` — light LLM; writes `intent`; routes chitchat/clarify vs fetch; optional generic slots `locale` / `speechLanguage` when heuristic weak; post-process calendar + epistemic gates only; no domain vocabulary in `src/`
- Bypass (optional): zero-LLM closed catalog classes
- Budgets: `tool-budget.ts.snippet`; evidence channels: `templates/graph-spec.md`
- Locale: `guard` clears `turnLocale`/`currencyHint`; after `intent_classify` (or pre-composer) call `resolveConversationLocale` and set ephemeral fields — conversation-observed, not fixed/bootstrap locale SoT (`evidence-and-fidelity.md`, `conversation-locale.ts.snippet`)

**State channels (optional):** `dataBundle`, `discoveryBrief`, `externalError`, `turnDecisions`, ephemeral `turnLocale` / `currencyHint` — `templates/snippets/state.ts.snippet`.

## Plan-Execute

```
plan → execute_step → execute_step → … → synthesize → END
```

**Signals:** `modo_execucao: plan_execute`, `plano_completo[]` on first LLM call only.

**When:** predictable multi-step workflows; lower per-step token cost.

**Graph:** `plan_node` or `planner` — not `plan` when `plan` on `AgentState`; executor reads step index from state.

## Reflection

```
agent → tools → critic → (retry | END)
```

**Signals:** `critic.md` — `aprovado`, `nota`, `max_reflexoes`.

**When:** quality-sensitive outputs.

**Graph:** critic before END; conditional on approval threshold.

## Supervisor / multi-agent (advanced)

```
supervisor → worker_a | worker_b → supervisor → END
```

**When:** distinct personas, separate tool sets. Avoid premature use.

**Pattern:** subgraph per worker OR supervisor routes via structured output.

## RAG-augmented

```
retrieve → agent → tools? → END
```

**When:** knowledge-heavy Q&A; tenant-scoped corpora.

**Rules:** filter `tenant_id`; citations as state refs, not full docs.

## Guardrails-first

```
safeguard → agent → tools → END
```

**When:** user-facing; injection risk.

**Pattern:** classifier node before main LLM — not system prompt alone.

## Selection guide

| Need | Start with |
| ---- | ---------- |
| MVP chat + local tools only | ReAct |
| MCP / external tools + open query space | **react_bounded** |
| Fixed business workflow | Plan-Execute |
| Quality gate | Reflection |
| Many specialists | Supervisor (later) |
| Untrusted input | Guardrails + ReAct or react_bounded |

## graph-spec requirements per architecture

Document in `templates/graph-spec.md`:

- Node list + responsibilities
- State fields beyond `messages`
- Interrupt points (HITL)
- Tools per node bind
- Eval scenarios proving architecture

Framework comparison (LangGraph vs CrewAI): `ns-multi-agent-architect` — not this file.
