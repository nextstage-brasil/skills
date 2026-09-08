# Anti-patterns — extended

Load for full review beyond Placement / Prompt inject / Topology / Bind parity / Spec drift.

## Dead prompt copies

| Anti-pattern | Fix |
| ------------ | --- |
| `src/prompts/` plus `conversation/prompts/` | One canonical path |
| Files named `* copy.md` or duplicated bodies | Delete dead copy; keep one |

## State and memory

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Large API payloads in `state` | Slow checkpoint, token explosion | Store ref; fetch via tool |
| Summarize without persisting | Re-summarize every turn | `RemoveMessage` + rewrite |
| Raw `state.messages` to LLM | Blows context window | `trimMessagesForLlm` |
| Full tool JSON in messages | Same | `truncateToolOutput` |
| Secrets in state/checkpointer | Leak via logs/resume | `configurable` only |
| Full composed system/persona in `messages` | Sticky persona; checkpoint bloat | Invoke-only `base_invariant + injected` — `prompt-and-capability-injection.md` |
| Last-write-wins on shared artifact / thread state | Silent data loss under concurrent turns | Optimistic version check; reject + reconcile — `error-and-reliability.md` |

## Reliability (writes and distributed)

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Multi-write plan with neither compensation nor sync gate | Partial external side effects stuck | Declare reverse-order idempotent compensations; uncancellable write behind sync gate |
| Blind retry of non-idempotent write | Duplicate side effects | Idempotency keys or HITL — no blind retry |
| Global availability choice for all blocks | Wrong block proceeds or blocks | Per-block availability vs consistency on `turnDecisions` |
| Parallel producers, no start/finish version record | Stale success undetectable | Two-version record + post-join check — `error-and-reliability.md` |
| Fan-out discards sibling on first rejection | Good result lost; retry both | Settle-all; retry failed branch only |

## Graph structure

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| `addNode` id equals `AgentState` channel key | LangGraph compile/runtime error | Different node id — e.g. `analyst` writes `analysis`; `executor` writes `executionResults` |
| Topology doc uses channel name as node id | Agents copy wrong `addNode` name | Diagrams + graph-spec Nodes table use node ids; map channels in Outputs |
| Graph in `memory/` | — | `graph/graph.ts` |
| Domain prompts in `llm/` | — | `conversation/` |
| Monolithic nodes file | — | Split thin `*.node.ts` |
| Architecture `if (name === "react")` in runtime | — | Respond to contract signals |

## MCP and tools

| Anti-pattern | Fix |
| ------------ | --- |
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
| Code without Placement / Inject / Spec gates | Complete pre-change gates in `SKILL.md` |
| Code without `graph-spec.md` | Spec gate first |
| Greenfield tree from snippets or another product | `templates/agent-runtime/` + `bootstrap-agent-runtime.mjs` |
| Prompt roulette | Contract iteration + evals |
| Skip review | `ns-reviewer` + LangGraph anti-patterns when `agent-api` |

## Agent without rules

No explicit limits (`max_tool_calls`, sensitive actions, stop conditions) = loop, overspend, destructive calls. Ship `templates/contracts/rules-contract.md` with graph.
