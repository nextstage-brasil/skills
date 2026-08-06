# Anti-patterns

Review before done. Diff touches `agent-api`: Placement, Prompt inject, Bind parity, Spec drift, Wire names = Critical if violated.

## Placement

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Locale / i18n / humanize under `graph/` | Graph becomes a junk drawer; breaks vertical data model | `src/conversation/locale/` |
| Presentation (charts, mermaid) under `graph/` or `llm/` | Mixes display with control flow / infra | `src/conversation/presentation/` |
| Domain prompts under `llm/` or top-level `src/prompts/` | Dual trees; orphan copies | `src/conversation/prompts/` |
| Domain heuristics in `src/skills/` or vendor policy in `src/mcp/` | Runtime TS hardcodes product rules | `conversation/` or `config/` |
| Code refs `config/*` missing on disk (or unused config dirs) | Drift and silent fallbacks | Create or delete in same change |
| New top-level folder outside layout matrix | Permanent layout debt | `references/placement-and-domains.md` |

## Prompt inject

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| God-node owns full system-prompt compose | Unreviewable; duplicates doctrine | `composeSystemPrompt` + thin `*.node.ts` |
| Session overlay replaces canonical body | Loses versioned role/behavior | Overlay appends via `configurable`; body stays in prompts/ |
| Composed system/persona prompt (`base_invariant + injected`) in checkpointer or durable `messages` | Leak + sticky persona in history | Rebuild per LLM invoke; state holds conversation only |
| Secrets / system prompt text in graph state | Leak via checkpoint/logs | `configurable` + files; compose at invoke |
| Motor rules only inside product persona file | Gather Markdown / dual-writer slips | Keep gather-no-Markdown + composer sole-writer in `base_invariant` |
| Nudge as fake `HumanMessage` | Pollutes history and trim | System prompt `Runtime directive` section |
| Skill auto-inject + `use_skill` same id | Double doctrine / inconsistent trunc | Choose one mode per id |
| Tool/MCP char cap applied to skill body | Doctrine silently cut | `CONTEXT_SKILL_BODY_MAX_CHARS` |
| Gather prompt includes deliver/formatting skill | Premature user-facing Markdown | Split gather vs deliver — `prompt-and-capability-injection.md` |

## Topology and evidence (MCP tool-heavy)

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Open ReAct as **only** analytical path over open MCP catalog | Fixed-shape pipelines fail outside mold; token blow-up | Prefer `react_bounded` — `architectures.md` |
| Gather emits final user-facing answer | SSE flicker; polluted history | Composer sole-writer |
| Discovery-only tool calls counted as "has evidence" | False progress; duplicate-skip breaks | Analytical evidence channels — `evidence-and-fidelity.md` |
| Silent `break` on LLM failure in gather | User sees empty or stale reply | Set `errorCode` on state; route to composer or `failed` |
| Generic clarify when `externalError` already in state | Credential/MCP failure reads as "send me data" | Branch composer on `externalError` channel |
| Greenfield agent-api without `/dev-chat` | No human train loop for MCP/SSE | `GET /dev-chat` + `DEV_CHAT_ENABLED` |
| Numeric `null` from tools treated as `0` | Invented totals | Hydrate evidence bundle in code — `evidence-and-fidelity.md` |
| Bootstrap / `.env` / `configurable.locale` as primary locale SoT | Ignores turn language; sticky wrong format | Conversation-observed `turnLocale` — `evidence-and-fidelity.md` |
| Persist locale as eternal thread truth in checkpointer | PT→EN mid-thread keeps old separators | Ephemeral `turnLocale` per turn; clear in guard |
| Composer invents number/date format without Intl | Separator / fidelity bugs | `formatUserFacing(turnLocale)` in `conversation/locale/` |

## Bind parity

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Tools node can run tool; missing from `bindTools` | Model never calls it | Bind or document unbound + test |
| Bind full remote MCP catalog | Token and safety blow-up | Allowlist at discovery |
| Trust server "read-only" flag | Writes slip through | Local classification |
| Colons in **new** wire tool names | Provider rejection | `mcp__server__tool` / `use_skill__id` |

## Spec drift

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Live graph differs from `graph-spec.md` (edges, recursion_limit, wires) | Spec becomes a lie | Spec Sync Gate — update spec in same delivery |
| "Fix code to match archive" when archive is stale | Reverts intentional runtime | Sync spec to intended graph; then implement |

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

## Graph structure

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| `addNode` id equals `AgentState` channel key | LangGraph compile/runtime error | Different node id — e.g. `intent_classify` writes `intent`; `plan_node` writes `plan` |
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
| Prompt roulette | Contract iteration + evals |
| Skip review | `ns-code-reviewer` + LangGraph anti-patterns when `agent-api` |

## Agent without rules

No explicit limits (`max_tool_calls`, sensitive actions, stop conditions) = loop, overspend, destructive calls. Ship `templates/contracts/rules-contract.md` with graph.
