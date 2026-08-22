# Bootstrap agent-api (greenfield)

Copy `templates/agent-runtime/` into `{agent_api_root}` (default `agent-api/`). Source of truth for the skeleton is this skill — never copy another product.

Snippets under `templates/snippets/` remain for **brownfield patches**. Greenfield does not assemble the tree from snippets.

## When

- No `{agent_api_root}/package.json` yet
- User asked for a new LangGraph agent-api from scratch
- Spec-driven first setup feature on a greenfield agent / intelligent SaaS slice

Do **not** copy over an existing runtime. Brownfield → orphan checklist.

## Prerequisites

1. Architecture lock — `ns-multi-agent-architect` if framework unlocked; skip if `framework: langgraph` already locked
2. `graph-spec.md` from `templates/graph-spec.md` (Phase 0) — at `docs/versions/{version_san}/graph-spec.md` and/or `{agent_api_root}/graph-spec.md`

## Command

From the **product root** (directory that should contain `agent-api/`):

```bash
node .agents/skills/ns-langgraph-agents/scripts/bootstrap-agent-runtime.mjs
# or explicit dest / slug:
node path/to/ns-langgraph-agents/scripts/bootstrap-agent-runtime.mjs --dest ./agent-api --slug my-agent
```

Maintainer checkout of this repo:

```bash
node skills/ns-langgraph-agents/scripts/bootstrap-agent-runtime.mjs --dest ./agent-api --slug my-agent
```

`--force` overwrites a non-empty dest (destructive). Default: refuse if dest exists and is not empty.

## After copy

1. `cd {agent_api_root} && npm install && npm test`
2. Confirm DoD in `templates/agent-runtime/README.md` (dev-chat, tool-budget, MCP normalize-before-truncate, composeSystemPrompt, locale, db, sse, postman)
3. Align `src/graph/` with locked `graph-spec.md` (template scaffold is a starting suggestion)
4. Domain: `src/conversation/`, `config/`, `skills/*.md` — via `ns-coder` / spec-driven **feature** tasks, not a second scaffold

## Spec-driven

Parent `ns-spec-driven` coordinates **version features** (MCP servers, HITL, domain prompts) after this copy. First greenfield infrastructure feature = this bootstrap. See `../../ns-spec-driven/references/agent-runtime-integration.md`.
