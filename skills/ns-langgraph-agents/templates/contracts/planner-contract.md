# Planner contract

Structured planner output — **never free text** for machine-parseable turns.

## Output schema (JSON)

```json
{
  "proxima_acao": "CHAMAR_FERRAMENTA | FINALIZAR | PERGUNTAR_USUARIO",
  "nome_ferramenta": "mcp__server__tool | null",
  "argumentos_ferramenta": {},
  "criterio_sucesso": "string",
  "pergunta": "string | null",
  "raciocinio": "optional — required for react architecture"
}
```

## Rules

- `proxima_acao` must be one of the enum values exactly
- `nome_ferramenta` required when action is `CHAMAR_FERRAMENTA`
- Tool must exist in current allowlist
- `raciocinio` mandatory when `architecture: react`

## Plan-execute extension

When `modo_execucao: plan_execute`:

```json
{
  "modo_execucao": "plan_execute",
  "plano_completo": ["step 1", "step 2"],
  "passo_atual": 0
}
```

First LLM call emits full plan; subsequent steps execute without re-planning unless reflection fails.

## Operator progress (JSON planner / analyst hops)

Applies when the planner **does not** `bindTools` on that hop and returns a structured plan the executor runs. **MUST** for greenfield `streaming_sse`. Open ReAct + `ToolNode` skips this JSON field — emit `tool_started` / `tool_finished` from the executor instead.

Same hop JSON **MUST** include tools-to-run **and** an operator line:

```json
{
  "intent": "English machine sentence — audit only; never copy into userFacingIntent",
  "userFacingIntent": "REQUIRED every hop; SAME LANGUAGE as the current user message",
  "executionPlan": {
    "status": "need_more_data | complete | clarification_required",
    "actions": [{ "tool": "mcp__server__tool", "args": {} }]
  }
}
```

Nest `userFacingIntent` under `analysis` when the graph already has an `analysis` channel (`analysis.userFacingIntent`). Node id must not equal the channel (`analyst` writes `analysis`).

Rules:

- **Language MUST = current user message** (last human turn). Portuguese in → Portuguese out. English in → English out. Never default to English, product locale, or a translation of `intent`
- Put this rule in the planner **prompt** (`base_invariant` / hop payload), not only in this contract
- Names **this hop’s** new step or evidence gap — not a translation of `intent`, not a restatement of the user’s overall goal
- After prior tool results exist, say what those results still lack for the **new** actions
- Must differ from every operator line already narrated this turn (except pagination of the same fetch)
- Persist on `AgentState`. Optional `analystNarration: string[]` to reject duplicates
- SSE: emit `thinking` with that string at **planner node entry** of the **next** hop (before the next LLM invoke). Hop 0: generic copy from `src/conversation/presentation/` (or locale), not LLM text
- Never put this line in `response_streaming` or durable `messages` as the answer — composer remains sole Markdown writer
- Executor emits `tool_started` / `tool_finished` (generic progress copy in presentation/, not the planner JSON)

## Validation

Runtime validates JSON before execution. On parse failure: one repair attempt, then circuit breaker stop.
