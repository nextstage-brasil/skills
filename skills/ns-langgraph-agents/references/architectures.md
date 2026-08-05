# Cognitive architectures (LangGraph)

Pick architecture in `graph-spec.md` **before** coding. Runtime responds to **signals**, not architecture names.

## ReAct (default loop)

```
agent → tools? → agent → … → END
```

**Signals:** standard tool loop; optional `raciocínio` / reasoning field in planner JSON for audit.

**When:** exploratory tasks, dynamic tool choice, moderate autonomy.

**Graph:** `agent` node + `ToolNode` + conditional edge on `tool_calls`.

## Bounded ReAct (`react_bounded`)

```
guard → context_compact → intent → (gather | bypass | composer) → composer → respond → END
```

**Signals:** MCP or external tools with open query space; `needsData` routing; composer sole-writer; optional deterministic bypass for catalog/list lookups.

**When:** tool-heavy agents where unbounded ReAct blows tokens/latency or gather pollutes user stream. **Preferred default** for greenfield LangGraph + MCP — not a replacement for simple local-tool MVP.

**Graph rules:**

- **Gather** strips terminal `content`/`reasoning` without `tool_calls` — never user-facing Markdown
- **Composer** is the only node that emits final user text
- **Intent** (light LLM) routes chitchat/clarify vs data fetch — post-process only calendar/locale; no domain vocabulary in `src/`
- **Bypass** (optional): zero-LLM path for closed catalog question classes
- Wire budgets from `tool-budget.ts.snippet`; evidence channels in state — see `templates/graph-spec.md`

**State channels (optional):** `dataBundle`, `discoveryBrief`, `externalError`, `turnDecisions` — commented placeholders in `templates/snippets/state.ts.snippet`.

## Plan-Execute

```
plan → execute_step → execute_step → … → synthesize → END
```

**Signals:** `modo_execucao: plan_execute`, `plano_completo[]` on first LLM call only.

**When:** predictable multi-step workflows, lower per-step token cost.

**Graph:** separate `plan` node; executor reads current step index from state.

## Reflection

```
agent → tools → critic → (retry | END)
```

**Signals:** `critic.md` contract with `aprovado`, `nota`, `max_reflexoes`.

**When:** quality-sensitive outputs (reports, code, customer-facing text).

**Graph:** critic node before END; conditional edge on approval threshold.

## Supervisor / multi-agent (advanced)

```
supervisor → worker_a | worker_b → supervisor → END
```

**When:** distinct personas with separate tool sets; avoid premature complexity.

**Pattern:** subgraph per worker OR supervisor node routing via structured output.

## RAG-augmented

```
retrieve → agent → tools? → END
```

**When:** knowledge-heavy Q&A with tenant-scoped corpora.

**Rules:** always filter by `tenant_id`; store citations in state refs not full docs.

## Guardrails-first

```
safeguard → agent → tools → END
```

**When:** user-facing agents with injection risk.

**Pattern:** lightweight classifier node **before** main LLM — do not rely on system prompt alone.

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

- Node list and responsibilities
- State fields beyond `messages`
- Interrupt points (HITL)
- Which tools each node may bind
- Eval scenarios that prove the architecture

For framework comparison (LangGraph vs CrewAI), use `ns-multi-agent-architect` — not this file.
