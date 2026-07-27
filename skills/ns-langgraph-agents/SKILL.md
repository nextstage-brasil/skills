---
name: ns-langgraph-agents
description: (NS) Build, maintain, and recover production LangGraph.js agent runtimes — TypeScript StateGraph, MCP multi-server tools, capability governance, content blocks (reasoning/tool_call/error), context-window token management, checkpointers, HITL interrupts, streaming SSE, and observability. Use whenever the user works on agent-api, LangGraph graphs, MCP tool integration, agent checkpointers, trim/summarize message history, ToolMessage errors, or says their agent project is lost or has no structure — even if they only say "fix my LangGraph agent" or "wire MCP tools". Pair with ns-code-coder for code changes and ns-multi-agent-architect for LangGraph vs CrewAI choice only. Do NOT use for CrewAI crews, generic web apps without an agent runtime, or SDD requirements without implementation intent.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
depends:
  - ns-harness
---

# LangGraph Agents

Senior agent-runtime engineer. Guide construction and maintenance of **production-grade LangGraph.js** systems (Node 24+, TypeScript strict, `@langchain/langgraph`).

This skill owns **runtime doctrine and coordination**. Implementation diffs are executed via `ns-code-coder` (or `ns-code-autonomous` for larger plans). Architecture choice (LangGraph vs CrewAI) stays in `ns-multi-agent-architect`.

## Harness discovery

See `../ns-harness/references/harness-discovery.md`. Read project `AGENTS.md` and harness rules before changing runtime code.

## When to use

| Situation | Action |
| --------- | ------ |
| Greenfield agent-api | Follow **Build workflow**; produce `graph-spec.md` first |
| Brownfield / orphaned runtime | Run **Orphan recovery** (`references/orphan-recovery-checklist.md`) before features |
| MCP with many servers/tools | Read `references/mcp-complex-access.md` + `references/capability-governance.md` |
| Token blow-up / slow turns | Read `references/context-window-and-tokens.md` |
| Provider message/reasoning quirks | Read `references/message-content-blocks.md` |
| HITL / streaming UX | Read `references/streaming-and-hitl.md` |
| Evals before merge | Read `references/evals-and-gates.md` |

## Core doctrine

LangGraph orchestrates **control flow**; MCP and local tools are **capabilities** beneath the graph. Keep graph state small (references and summaries, not large payloads). The checkpointer persists full state; **context window management** decides what the LLM sees — these are separate concerns.

Three capability kinds bind to the model:

| Kind | LLM wire name | Internal id |
| ---- | ------------- | ------------- |
| Local tool | `{name}` | `local:{name}` |
| MCP tool | `mcp__{server}__{tool}` | `mcp:{server}:{tool}` |
| Skill procedure | `use_skill__{id}` | `skill:{id}` |

Wire names must match `^[a-zA-Z0-9_-]{1,128}$` (use `__` separators; colons only in internal ids).

## Reference map

Load on demand — do not memorize entire files into the conversation.

| Reference | Read when |
| --------- | --------- |
| `references/orphan-recovery-checklist.md` | Project structure unclear or agent "lost" |
| `references/runtime-layout.md` | Scaffolding, refactors, layer violations |
| `references/message-content-blocks.md` | AIMessage/HumanMessage/ToolMessage across providers |
| `references/context-window-and-tokens.md` | trim, summarize, tool output caps |
| `references/mcp-complex-access.md` | Multi-server MCP, discovery, transport, lifecycle |
| `references/capability-governance.md` | Allowlist, classification, rate limits, secrets |
| `references/error-and-reliability.md` | Tool errors, circuit breaker, retries |
| `references/observability.md` | Postgres audit, LangSmith, OTel, run context |
| `references/architectures.md` | ReAct, plan-execute, reflection, supervisor |
| `references/streaming-and-hitl.md` | SSE envelopes, `interrupt()`, `Command` resume |
| `references/evals-and-gates.md` | Architecture, tool-selection, memory evals |
| `references/anti-patterns.md` | Review gate before marking done |

Templates (copy snippets, not full scaffolds): `templates/graph-spec.md`, `templates/contracts/`, `templates/snippets/`.

## Session inputs

| Variable | Required |
| -------- | -------- |
| `{product_root}` | Yes (or infer when single product) |
| `{agent_api_root}` | Default `{product_root}/agent-api` |
| `{task}` | What to build, fix, or review |

## Orphan recovery (brownfield first)

When the runtime is disorganized or the team is blocked:

1. Read `references/orphan-recovery-checklist.md` and score the project.
2. Post a short gap report: structure, context window, MCP governance, observability, HTTP contract.
3. Propose a **ordered fix plan** (one phase per message if large).
4. Only then implement via `ns-code-coder`.

Do not add graph nodes or MCP servers until layout and governance baselines pass.

## Build workflow (greenfield or post-recovery)

### Phase 0 — Spec gate

If `graph-spec.md` is missing, create it from `templates/graph-spec.md`. Minimum sections: locked header (`framework`, `tenant_model`, `architecture`, `interaction_mode`), state schema, nodes table, edges, interrupts, memory, capabilities, HTTP routes.

If the user has no architecture decision yet, stop and invoke `ns-multi-agent-architect` first.

### Phase 1 — Skeleton

Align tree per `references/runtime-layout.md`. Production code under `src/` only; tests under `tests/`. Graph compiles in `src/graph/graph.ts`; checkpointer in `src/memory/`.

Use snippets from `templates/snippets/` — do not paste a monolithic scaffold.

### Phase 2 — State and persistence

- `AgentState` with `messages` reducer (`Annotation.Root` or Zod + `MessagesZodMeta`).
- `PostgresSaver` in dev/prod; `MemorySaver` only in `tests/setup.ts`.
- Every invoke/stream: `configurable.thread_id` via `buildRunConfig`.

### Phase 3 — LLM and messages

- Provider config in `src/llm/` (infra only — no domain prompts).
- Prefer JSON mode + Zod parse for structured turns; avoid `withStructuredOutput` on OpenAI-compatible local servers.
- Normalize provider output via `contentBlocks` / `content_blocks` — see `references/message-content-blocks.md`.

### Phase 4 — Context window (mandatory)

Implement per `references/context-window-and-tokens.md`:

- `trimMessagesForLlm` before every LLM call.
- `truncateToolOutput` before `ToolMessage` enters state.
- Optional `summarizeOlderMessages` with **persisted compaction** (`RemoveMessage` + rewrite) in the same agent-node return.

Never pass raw `state.messages` to the model.

### Phase 5 — Capabilities

1. Local `StructuredTool`s in `src/tools/`.
2. MCP: governed client — discovery → local allowlist → wire names → singleton client lifecycle (`references/mcp-complex-access.md`).
3. Skills: `skills/*.md` auto-discovered → `use_skill__{id}` tools.

Apply `references/capability-governance.md` before `bind_tools`.

### Phase 6 — HTTP and interaction mode

| Mode | Requirements |
| ---- | ------------ |
| `sync_json` | `POST /threads`, `POST /threads/:id/message` |
| `streaming_sse` | SSE envelope per `references/streaming-and-hitl.md` |
| HITL | `interrupt()` + `POST /threads/:id/resume` with `Command({ resume })` |

Keep Postman collection aligned with live routes.

### Phase 7 — Observability

Wire `references/observability.md`: `initDb`, `runStorage`, `logLlmCall`, `logToolExecution`. LangSmith and OTel are opt-in.

### Phase 8 — Evals and review

- Add suites per `references/evals-and-gates.md`.
- Run `npm run build && npm test` in `{agent_api_root}`.
- Invoke `ns-code-reviewer` on the diff.

## Maintenance workflow

For ongoing work (not greenfield):

1. Confirm `graph-spec.md` matches compiled graph.
2. Identify layer: graph node, conversation domain, MCP, memory, HTTP.
3. Read the matching reference section before editing.
4. Implement minimal diff via `ns-code-coder`.
5. Update Postman when HTTP routes change.
6. Re-run orphan checklist items touched by the change.

## MCP complex access (quick rules)

When multiple MCP servers expose overlapping or large tool catalogs:

- **Filter at discovery** — agent sees only allowlisted tools (`tools/list` filtered before bind).
- **Classify locally** — `read | write | destructive | admin`; never trust server "read-only" flags.
- **Reuse client** — one `MultiServerMCPClient` (or equivalent) per process; no per-request subprocess spawn in production.
- **Transport** — Streamable HTTP for deployed services; stdio only for local single-user dev.
- **Errors** — MCP execution errors (`isError: true`) become recoverable `ToolMessage` with `status: "error"`; protocol failures may abort the run with a structured HTTP/SSE `failed` envelope.
- **Secrets** — env or `RunnableConfig.configurable` / request payload only; never graph state or checkpointer snapshots.

Full patterns: `references/mcp-complex-access.md`.

## Handoff to ns-code-coder

When implementation is approved, delegate with:

```markdown
## LangGraph implementation task
- Root: {agent_api_root}
- Spec: path/to/graph-spec.md
- Phase: [number and name from this skill]
- References to apply: [list]
- Acceptance: build + test pass; orphan checklist items [n] resolved
- Review: ns-code-reviewer after tests
```

Stay in this skill for diagnosis, spec updates, and governance design; switch to coder for the diff.

## Stop conditions

| Condition | Action |
| --------- | ------ |
| No `graph-spec.md` and user wants code now | Create spec or invoke architect |
| CrewAI requested | Redirect to appropriate skill |
| Change spans >3 layers without plan | One-line phased plan, wait for approval |
| Critical security gap (secrets in state, ungoverned MCP) | Block feature work; fix governance first |

## Related skills

- `ns-code-coder` — apply code diffs from this skill's plan
- `ns-code-reviewer` — mandatory after implementation
- `ns-multi-agent-architect` — framework and topology before `graph-spec.md`
- `ns-code-investigator` — deep debugging when runtime behavior is unclear

## Forbidden

- Storing secrets, API keys, or system prompts in graph state or checkpointer
- Passing unbounded tool/MCP output into `state.messages`
- Trusting MCP tool metadata for security classification
- Spawning stdio MCP subprocesses per HTTP request in production
- `memory/` compiling `StateGraph`
- Domain qualify/conversation prompts in `src/llm/`
- Tests under `src/`
