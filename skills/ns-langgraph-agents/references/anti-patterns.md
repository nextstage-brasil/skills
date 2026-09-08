# Anti-patterns

Review before done. Diff touches `agent-api`: Placement, Prompt inject, Bind parity, Spec drift, Wire names = Critical if violated.

## Placement

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Locale / i18n / humanize under `graph/` | Graph becomes a junk drawer; breaks config/conversation data model | `src/conversation/locale/` |
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
| Open ReAct as **only** analytical path over open MCP catalog without a spec lock | Token blow-up / ungoverned tools | Suggest `plan_execute` or lock another architecture in `graph-spec.md` — `architectures.md` |
| Dedicated **LLM** `intent_classify` hop | Extra LLM; skips executor on fake chitchat | Analyst JSON + `routeAfterAnalyst`. Deterministic Gateway routing (rule / cheap non-LLM classifier / embedding) from ADR categories is **allowed** — not this row |
| Gather emits final user-facing answer | SSE flicker; polluted history | Composer sole-writer |
| JSON planner hop without `userFacingIntent` on state | Operator sees only generic “model started” or silence | Persist + emit `thinking` at next hop entry — `planner-contract.md` |
| `userFacingIntent` on `response_streaming` or in `messages` as the answer | Dual-writer; looks like the reply | SSE `thinking` only |
| Hop 0 `thinking` from LLM before first plan exists | Hallucinated progress | Generic copy from `conversation/presentation/` |
| Copy `intent` (English machine line) into `userFacingIntent` | Wrong language / restates the ask | New evidence-gap line in operator-message language |
| `userFacingIntent` not in the user’s input language | Operator sees English (or default locale) while they wrote another language | Match last `HumanMessage`; prompt MUST require it |
| Discovery-only tool calls counted as "has evidence" | False progress; duplicate-skip breaks | Analytical evidence channels — `evidence-and-fidelity.md` |
| Silent `break` on LLM failure in gather | User sees empty or stale reply | Set `errorCode` on state; route to composer or `failed` |
| Generic clarify when `externalError` already in state | Credential/MCP failure reads as "send me data" | Branch composer on `externalError` channel |
| Greenfield agent-api without `/dev-chat` | No human train loop for MCP/SSE | `GET /dev-chat` + `DEV_CHAT_ENABLED` |
| Numeric `null` from tools treated as `0` | Invented totals | Hydrate evidence bundle in code — `evidence-and-fidelity.md` |
| Bootstrap / `.env` / `configurable.locale` as primary locale SoT | Ignores turn language; sticky wrong format | Conversation-observed `turnLocale` — `evidence-and-fidelity.md` |
| Persist locale as eternal thread truth in checkpointer | PT→EN mid-thread keeps old separators | Ephemeral `turnLocale` per turn; clear in guard |
| Composer invents number/date format without Intl | Separator / fidelity bugs | `formatUserFacing(turnLocale)` in `conversation/locale/` |

## Product topology (`intelligent_saas`)

| Anti-pattern | Why it hurts | Fix |
| ------------ | ------------ | --- |
| Browser direct to agent-api | Bypasses auth, audit, conversation SoT | Application relay — `intelligent-saas.md` Conversation hop |
| Conversation persisted only in checkpointer | No product history, resume, or compliance | Application PG owns conversation; checkpointer = turn state |
| `thread_id` generated on client | Session hijack, orphan threads | Application creates and maps `thread_id` to CS session |
| `/dev-chat` exposed as product chat | Training UI in production surface | Product chat via Application; `/dev-chat` local training only |
| Agent env or DNS in frontend bundle | Leaks internal topology | Frontend calls Application only; runtime stays internal |

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

## Extended anti-patterns

For Dead prompt copies, State/memory, Reliability, Graph structure, MCP/tools, LLM, Ops, Process, Agent without rules: read `references/anti-patterns-extended.md`.
