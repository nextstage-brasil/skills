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

## Validation

Runtime validates JSON before execution. On parse failure: one repair attempt, then circuit breaker stop.
