# Anti-patterns

Review before marking agent work done.

## State and memory

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Large API payloads in `state` | Slow checkpoint, token explosion | Store ref; fetch via tool |
| Summarize without persisting | Re-summarize every turn | `RemoveMessage` + rewrite |
| Raw `state.messages` to LLM | Blows context window | `trimMessagesForLlm` |
| Full tool JSON in messages | Same | `truncateToolOutput` |
| Secrets in state/checkpointer | Leak via logs/resume | `configurable` only |

## Graph structure

| Anti-pattern | Fix |
| ------------ | --- |
| Graph in `memory/` | `graph/graph.ts` |
| Domain prompts in `llm/` | `conversation/` |
| Monolithic nodes file | Split `*.node.ts` |
| Architecture `if (name === "react")` in runtime | Respond to contract signals |

## MCP and tools

| Anti-pattern | Fix |
| ------------ | --- |
| Bind full remote catalog | Allowlist at discovery |
| Trust server "read-only" flag | Local classification |
| Colons in wire tool names | `mcp__server__tool` |
| stdio MCP per HTTP request | Singleton HTTP client |
| MCP for trivial in-process fn | Local `StructuredTool` |

## LLM

| Anti-pattern | Fix |
| ------------ | --- |
| `withStructuredOutput` on LM Studio | JSON mode + Zod |
| System prompt as only security | Safeguard node |
| Stream reasoning to end users | Text only in SSE |

## Ops

| Anti-pattern | Fix |
| ------------ | --- |
| No `thread_id` on invoke | `buildRunConfig` |
| No Postman / stale collection | Update with routes |
| Eval only happy path | Adversarial + tool-confusion cases |
| Agent without stop conditions | `rules` contract limits |

## Process

| Anti-pattern | Fix |
| ------------ | --- |
| Code without `graph-spec.md` | Spec gate first |
| Prompt roulette | Contract iteration + evals |
| Skip review | `ns-code-reviewer` |

## Agent without rules

An agent without explicit limits (`max_tool_calls`, sensitive actions, stop conditions) will loop, overspend, or call destructive tools. Always ship `templates/contracts/rules-contract.md` alongside the graph.
