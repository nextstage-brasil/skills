# Rules contract

Operational limits for the agent loop.

## Limits

| Rule | Default | Env override |
| ---- | ------- | ------------ |
| `max_steps_per_turn` | 12 | `AGENT_MAX_STEPS` |
| `max_tool_calls_per_turn` | 8 | `AGENT_MAX_TOOL_CALLS` |
| `max_duration_seconds` | 120 | `AGENT_MAX_DURATION` |
| `no_progress_repeat_limit` | 3 | — |

## Sensitive actions

Tools requiring human confirmation before execute:

- `classification: destructive`
- Explicit list: {{tool wire names}}

## Mandatory tools

Before `FINALIZAR`, these must have succeeded in the turn:

- {{optional list}}

## Stop conditions

Stop and report to user when:

- Limits exceeded
- Human denies interrupt
- Circuit breaker trips on invalid planner JSON
- MCP server unavailable and no fallback

## Security

- Never log bearer tokens or API keys
- Never store secrets in memory files or graph state
- Deny `admin` class tools by default
