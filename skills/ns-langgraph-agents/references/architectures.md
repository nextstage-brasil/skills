# Cognitive architectures (LangGraph)

Pick architecture in `graph-spec.md` **before** coding. Runtime responds to **signals**, not architecture names.

## ReAct (default loop)

```
agent → tools? → agent → … → END
```

**Signals:** standard tool loop; optional `raciocínio` / reasoning field in planner JSON for audit.

**When:** exploratory tasks, dynamic tool choice, moderate autonomy.

**Graph:** `agent` node + `ToolNode` + conditional edge on `tool_calls`.

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
| MVP chat + tools | ReAct |
| Fixed business workflow | Plan-Execute |
| Quality gate | Reflection |
| Many specialists | Supervisor (later) |
| Untrusted input | Guardrails + ReAct |

## graph-spec requirements per architecture

Document in `templates/graph-spec.md`:

- Node list and responsibilities
- State fields beyond `messages`
- Interrupt points (HITL)
- Which tools each node may bind
- Eval scenarios that prove the architecture

For framework comparison (LangGraph vs CrewAI), use `ns-multi-agent-architect` — not this file.
