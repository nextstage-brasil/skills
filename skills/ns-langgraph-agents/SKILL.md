---
name: ns-langgraph-agents
description: (NS) LangGraph.js agent-api — StateGraph, MCP tools, skill bind/inject, checkpointers, context-window trim, HITL/SSE, prompt/locale placement. Use for agent-api, LangGraph graphs, MCP wiring, orphan layout, system-prompt compose, bind parity, graph-spec sync, or "fix my LangGraph agent" / "wire MCP tools" / "translations in the graph". Code via ns-coder; LangGraph vs CrewAI via ns-multi-agent-architect. Do NOT use for CrewAI crews, generic web apps, or SDD-only requirements.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.10"
depends:
  - ns-harness
---

# LangGraph Agents

Production-grade LangGraph.js (Node 24+, TypeScript strict, `@langchain/langgraph`).

Owns **runtime doctrine** — placement, prompt/capability injection, graph-spec sync. Diffs via `ns-coder` or `ns-autonomous`. Framework choice: `ns-multi-agent-architect`.

## Applicability

| Context | Doctrine strength |
| ------- | ----------------- |
| **Greenfield** agent-api (new LangGraph runtime) | **MUST** follow build workflow gates — dev-chat, budgets, normalize-before-truncate, separate skill cap, `react_bounded` when MCP/tool-heavy |
| **Brownfield** existing agent | **RECOMMENDED** migration toward same controls; orphan recovery does not Critical-fail missing topology |
| **Intentional MCP redesign** | Sync `graph-spec.md` + refs in same delivery — treat greenfield MUST for topology/budget/evidence sections touched |

Brownfield open ReAct valid until deliberate topology change. Greenfield MUST = new agent-api + intentional MCP redesign only.

## Routing (read first)

| Signal | Action |
| ------ | ------ |
| No framework lock / CrewAI requested | **Stop** → `ns-multi-agent-architect` |
| Orphan / lost structure / layout unclear | Run orphan checklist **before** features (`references/orphan-recovery-checklist.md`) |
| GitLab `ISSUE_URL` or SDD version scope | **Defer** to harness `../../ns-harness/references/code-skill-routing.md` — do not absorb |
| Approved placement/inject plan ready for diff | Hand off to `ns-coder` for implementation only — this skill does **not** write app code |

## Boot (mandatory)

See `../../ns-harness/references/session-boot.md` — **complete Session boot (blocking)** there, then:

1. Confirm `{agent_api_root}` and `graph-spec.md` when touching runtime
2. Load placement/inject refs before path decisions (`references/placement-and-domains.md`, `references/prompt-and-capability-injection.md`)
3. Continue this skill

**Success:** placement + inject doctrine + project rules. **Failure:** invented folders or external frameworks.

## When to use

| Situation | Action |
| --------- | ------ |
| Greenfield agent-api | Follow **Build workflow**; produce `graph-spec.md` first |
| Brownfield / orphaned runtime | Run **Orphan recovery** (`references/orphan-recovery-checklist.md`) before features |
| New file / unclear folder | **Placement Decision Block** + `references/placement-and-domains.md` |
| System prompt / skill inject / bind | **Prompt/Capability plan** + `references/prompt-and-capability-injection.md` |
| Topology / state / capabilities change | **Spec Sync Gate** — update `graph-spec.md` in the same delivery |
| MCP with many servers/tools | Read `references/mcp-complex-access.md` + `references/capability-governance.md` |
| Token blow-up / slow turns | Read `references/context-window-and-tokens.md` |
| Provider message/reasoning quirks | Read `references/message-content-blocks.md` |
| HITL / streaming UX | Read `references/streaming-and-hitl.md` |
| JSON planner / analyst chooses tools | Operator-progress channel — `templates/contracts/planner-contract.md` + `references/streaming-and-hitl.md` |
| Evals before merge | Read `references/evals-and-gates.md` |

## Core doctrine

LangGraph = control flow. MCP/local tools = capabilities under graph. Small graph state (refs, summaries). Checkpointer = full state; context window = LLM view — separate.

**System prompt:** compose `base_invariant` (motor) + `injected` (product persona) **per LLM invoke**. Never persist composed system/persona text in graph state, checkpointer, or durable `messages`. Summary `SystemMessage` at index 0 ≠ full system — `references/prompt-and-capability-injection.md`, `references/message-content-blocks.md`.

**Locale:** conversation-observed `turnLocale` (detection-first from human messages ± intent slots); `configurable.locale` weak hint only; Intl formatters in code — not fixed bootstrap locale. `references/evidence-and-fidelity.md`, `templates/snippets/conversation-locale.ts.snippet`.

**Operator progress (JSON planner hops):** greenfield `streaming_sse` with a planner/analyst that emits structured `executionPlan` (no `bindTools` on that hop) **MUST** persist `userFacingIntent` (or `analysis.userFacingIntent`) + `executionPlan` on `AgentState`. **`userFacingIntent` language MUST match the current user message** (last `HumanMessage`) — not English unless that message is English; not product default locale. Machine `intent` stays English for audit. Emit SSE `thinking` from that field at **node entry** of the next hop — not `response_streaming`, not in durable `messages`. Hop 0 uses generic copy from `conversation/presentation/` (or locale) in the **same operator language**. Open ReAct + `ToolNode` uses `tool_started` / `tool_finished` only. Details: `templates/contracts/planner-contract.md`, `references/streaming-and-hitl.md`.

Three capability kinds bind to the model:

| Kind | LLM wire name | Internal id |
| ---- | ------------- | ------------- |
| Local tool | `{name}` | `local:{name}` |
| MCP tool | `mcp__{server}__{tool}` | `mcp:{server}:{tool}` |
| Skill procedure | `use_skill__{id}` | `skill:{id}` |

Wire names must match `^[a-zA-Z0-9_-]{1,128}$` (use `__` separators; colons only in internal ids). Colon in a **new** wire name is Critical on review.

## Pre-change gates

Before new file or inject/bind change: complete all three. No code until posted.

### 1. Placement Decision Block

```markdown
### Placement Decision Block
- Artifact: …
- Type: …
- Target path: …
- Layer: …
- Refs: placement-and-domains.md
- do_not_create_under: […]
```

Full matrix: `references/placement-and-domains.md`.

### 2. Prompt / Capability plan

```markdown
### Prompt / Capability plan
- Compose: base_invariant + injected (rebuild per invoke; not in state/checkpointer/durable messages)
- Motor (`base_invariant`): [gather-no-Markdown / sole-writer / tool discipline / JSON planner userFacingIntent is SSE not Markdown / …]
- Product (`injected`): canonical path + persona/tone notes; mode-resolved: yes/no; modes: [...]; resolver: ...
- System layers touched: […]
- Canonical prompt path: …
- Session overlay: yes/no
- Bind list: […]
- Auto-inject skills: […] (exclusive of bind for same id)
- Truncate caps: tool vs skill body
- Bind parity: …
- Spec paths to sync: […]
```

Full doctrine: `references/prompt-and-capability-injection.md`.

### 3. Spec Sync Gate

**Nodes, edges, state, capabilities, recursion_limit, or wire names** change: update `graph-spec.md` **same** delivery. Stale archive ≠ SoT — sync spec to intended runtime; do not force-fit live code to stale archive.

## Reference map

Load on demand — do not memorize whole files.

| Reference | Read when |
| --------- | --------- |
| `references/orphan-recovery-checklist.md` | Project structure unclear or agent "lost" |
| `references/runtime-layout.md` | Scaffolding, refactors, layer violations |
| `references/placement-and-domains.md` | Where to put files; domain vs graph vs config |
| `references/prompt-and-capability-injection.md` | System prompt layers, bind vs inject, bind parity |
| `references/message-content-blocks.md` | AIMessage/HumanMessage/ToolMessage across providers |
| `references/context-window-and-tokens.md` | trim, summarize, tool vs skill body caps, `context_compact` |
| `references/mcp-complex-access.md` | Multi-server MCP, discovery, transport, lifecycle |
| `references/capability-governance.md` | Allowlist, classification, rate limits, tool budgets |
| `references/evidence-and-fidelity.md` | State-backed evidence, fidelity gate, conversation-observed locale |
| `templates/snippets/conversation-locale.ts.snippet` | `resolveConversationLocale` + Intl `formatUserFacing` |
| `templates/snippets/tool-budget.ts.snippet` | Per-turn tool/MCP caps, arg fingerprint duplicate-skip |
| `templates/snippets/prepare-llm-messages.ts.snippet` | `context_compact` helper (optional pre-intent) |
| `references/error-and-reliability.md` | Tool errors, circuit breaker, retries |
| `references/observability.md` | Postgres audit, LangSmith, OTel, run context |
| `references/architectures.md` | ReAct, react_bounded, plan-execute; **node id ≠ state channel** |
| `references/streaming-and-hitl.md` | SSE envelopes, operator `thinking` from planner state, `interrupt()`, `Command` resume |
| `templates/contracts/planner-contract.md` | JSON planner hops: `executionPlan` + `userFacingIntent` |
| `references/evals-and-gates.md` | Architecture, tool-selection, memory evals |
| `references/anti-patterns.md` | Review gate before marking done |

Templates (copy snippets, not full scaffolds): `templates/graph-spec.md`, `templates/contracts/`, `templates/snippets/`.

## Session inputs

| Variable | Required |
| -------- | -------- |
| `{agent_api_root}` | Default `agent-api` |
| `{task}` | What to build, fix, or review |

## Orphan recovery (brownfield first)

Runtime disorganized or team blocked:

1. Read `references/orphan-recovery-checklist.md`; score project.
2. Gap report: structure, placement, context window, inject/bind parity, MCP governance, HTTP, spec sync.
3. Ordered fix plan (one phase per message if large).
4. Implement via `ns-coder`.

No new graph nodes or MCP servers until layout + governance baselines pass.

## Build workflow (greenfield or post-recovery)

### Phase 0 — Spec gate

If `graph-spec.md` is missing, create it from `templates/graph-spec.md`. Minimum sections: locked header (`framework`, `architecture`, `interaction_mode`), domain ownership, prompt composition, state schema, nodes table, edges, interrupts, memory, capability bind/inject table, recursion_limit, HTTP routes.

If the user has no architecture decision yet, stop and invoke `ns-multi-agent-architect` first.

### Phase 1 — Skeleton

Align tree per `references/runtime-layout.md` and `references/placement-and-domains.md`. Production code under `src/` only; tests under `tests/`. Graph compiles in `src/graph/graph.ts`; checkpointer in `src/memory/`. Conversation owns `prompts/`, `locale/`, `presentation/`.

Use snippets from `templates/snippets/` — do not paste a monolithic scaffold.

### Phase 2 — State and persistence

- `AgentState` with `messages` reducer (`Annotation.Root` or Zod + `MessagesZodMeta`).
- `PostgresSaver` in dev/prod; `MemorySaver` only in `tests/setup.ts`.
- Every invoke/stream: `configurable.thread_id` via `buildRunConfig`.
- JSON planner/analyst (no `bindTools` on that hop): declare `executionPlan` + `userFacingIntent` (or nested on `analysis`) in `graph-spec.md` state schema — `templates/snippets/state.ts.snippet`.

### Phase 3 — LLM and messages

- Provider config in `src/llm/` (infra only — no domain prompts).
- Prefer JSON mode + Zod parse for structured turns; avoid `withStructuredOutput` on OpenAI-compatible local servers.
- Normalize provider output via `contentBlocks` / `content_blocks` — see `references/message-content-blocks.md`.

### Phase 4 — Context window (mandatory)

Implement per `references/context-window-and-tokens.md`:

- `trimMessagesForLlm` before every LLM call.
- `normalizeMcpToolResult` then `truncateToolOutput` before `ToolMessage` enters state.
- Separate `CONTEXT_SKILL_BODY_MAX_CHARS` for skill bodies (snippet `skillBodyMaxChars`).
- Optional `summarizeOlderMessages` with **persisted compaction** (`RemoveMessage` + rewrite) in the same agent-node return.

Never pass raw `state.messages` to the model.

### Phase 5 — Capabilities

1. Local `StructuredTool`s in `src/tools/`.
2. MCP: governed client — discovery → local allowlist → wire names → singleton client lifecycle (`references/mcp-complex-access.md`).
3. Skills: `skills/*.md` auto-discovered → `use_skill__{id}` **or** auto-inject (exclusive per id).

Apply `references/capability-governance.md` and `references/prompt-and-capability-injection.md` before `bindTools`. Enforce **bind parity**. Wire per-turn tool/MCP budgets from `templates/snippets/tool-budget.ts.snippet` when MCP or external tools are bound.

### Phase 6 — HTTP and interaction mode

| Mode | Requirements |
| ---- | ------------ |
| `sync_json` | `POST /threads`, `POST /threads/:id/message` |
| `streaming_sse` | SSE envelope per `references/streaming-and-hitl.md`; **greenfield MUST** ship `GET /dev-chat` gated by `DEV_CHAT_ENABLED` (local-only); JSON planner hops **MUST** emit operator `thinking` from state `userFacingIntent` |
| HITL | `interrupt()` + `POST /threads/:id/resume` with `Command({ resume })` |

Brownfield missing dev-chat: recommend add — not Critical. Postman synced with live routes.

### Phase 7 — Observability

Wire `references/observability.md`: `initDb`, `runStorage`, `logLlmCall`, `logToolExecution`, persist `turn_decisions`. LangSmith and OTel are opt-in.

### Phase 8 — Evals and review

- Add suites per `references/evals-and-gates.md`.
- Run `npm run build && npm test` in `{agent_api_root}`.
- Invoke `ns-reviewer` on the diff; ask it to verify placement, inject, wire-name, and bind-parity anti-patterns when the diff touches `agent-api`.

## Maintenance workflow

Ongoing work (not greenfield):

1. Three **Pre-change gates**
2. `graph-spec.md` matches intended graph after change
3. Layer: graph node, conversation, MCP, memory, HTTP
4. Read matching reference before edit
5. Minimal diff via `ns-coder` with placement/inject handoff
6. Postman on HTTP route change
7. Re-run orphan checklist items touched

## MCP complex access (quick rules)

Multiple MCP servers, overlapping or large catalogs:

- **Discovery filter** — allowlisted `tools/list` before bind
- **Local classify** — `read | write | destructive | admin`; never trust server read-only flags
- **Singleton client** — one `MultiServerMCPClient` per process; no per-request stdio in prod
- **Transport** — Streamable HTTP deployed; stdio local single-user dev only
- **Errors** — MCP `isError: true` = recoverable `ToolMessage` `status: "error"`; protocol fail may abort with HTTP/SSE `failed`
- **Secrets** — env or `configurable` / request payload only; never state or checkpointer

Full: `references/mcp-complex-access.md`.

## Handoff to ns-coder

When implementation is approved, delegate with:

```markdown
## LangGraph implementation task
- Root: {agent_api_root}
- Spec: path/to/graph-spec.md
- Phase: [number and name from this skill]
- target_paths: […]
- layer: […]
- do_not_create_under: […]
- injection_notes: [layers / bind vs auto-inject / caps]
- spec_paths_to_sync: […]
- References to apply: [list]
- Acceptance: build + test pass; orphan checklist items [n] resolved; placement + inject + bind parity verified
- Review: ns-reviewer after tests — must check placement, inject, wire names (`:`), bind parity (load ns-langgraph-agents anti-patterns when diff touches agent-api)
```

Stay here for diagnosis, spec, placement, governance design. `ns-coder` for diff.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| No `graph-spec.md` and user wants code now | Create spec or invoke architect |
| Path outside placement matrix / inventing folders | Stop; propose legal path |
| Domain / locale / copy landing in `graph/` or `llm/` | Stop; reroute to conversation/config |
| Bind without parity (dispatchable but unbound) | Stop; fix bind or document unbound + test |
| `:` in a new wire name | Stop; use `__` separators |
| Skill auto-inject + bind same id without explicit decision | Stop; choose one mode |
| CrewAI requested | Redirect to appropriate skill |
| Change spans >3 layers without plan | One-line phased plan, wait for approval |
| Critical security gap (secrets in state, ungoverned MCP) | Block feature work; fix governance first |

## Related skills (ownership)

| Skill | Owns |
| ----- | ---- |
| `ns-langgraph-agents` | Doctrine, placement, inject plan, graph-spec |
| `ns-coder` | Diff + review loop |
| `ns-reviewer` | Verdict; when diff touches `agent-api`, apply placement + inject + wire-name + bind-parity anti-patterns from this skill |
| `ns-multi-agent-architect` | Framework choice only |
| `ns-investigator` | Runtime debug |

## Forbidden

- Emitting planner `userFacingIntent` as `response_streaming` or as Markdown in `messages` (SSE `thinking` only; composer remains sole Markdown writer)
- Writing `userFacingIntent` in a language other than the current user message (e.g. English progress when the operator wrote Portuguese)
- Persisting composed system/persona prompt (`base_invariant + injected`) — or secrets/API keys — in graph state, checkpointer, or durable `messages` (rebuild system text per invoke)
- Treating bootstrap / `.env` / `configurable.locale` as primary locale SoT, or persisting sticky thread locale (use conversation-observed `turnLocale` + Intl)
- Passing unbounded tool/MCP output into `state.messages`
- Applying tool/MCP truncate caps to skill bodies (use `CONTEXT_SKILL_BODY_MAX_CHARS`)
- Trusting MCP tool metadata for security classification
- Spawning stdio MCP subprocesses per HTTP request in production
- `memory/` compiling `StateGraph`
- Domain qualify/conversation prompts in `src/llm/`
- Locale/presentation under `graph/`
- Nudge as fake `HumanMessage`
- Tests under `src/`
