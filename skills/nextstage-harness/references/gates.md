# Planning gates (SDD)

Human confirmation gates for spec-driven workflows.

## Gate 1 — Requirements (`requirements_confirmed`)

- If `requirements.md` does not exist: generate via `requirements-generator` and **stop** until the human confirms.
- If it exists but was not explicitly validated: **stop** and ask for confirmation (`yes` / explicit approval).

## Gate 2 — Scope (`scope_confirmed`)

- Present a summary of Features (with layer counts when applicable) and **stop** until the human confirms.

## Consistency analysis

- After Gate 2, run `analyze-consistency`.
- **100% pass** (zero blockers, zero warnings): `execution_confirmed` is implicit → proceed to task generation without Gate 3.
- If warnings or blockers exist: resolve or get explicit waiver before task generation.

## Gate 3 — Execution (`execution_confirmed`)

- **Required only** when consistency analysis is not 100% positive (or when waivers apply).
- Present summarized task plan (count by type) and **stop** until the human confirms.

## Hard stops

- Never generate tasks without passing required gates.
- When a step asks for explicit confirmation, do not proceed without it.
- GitLab MCP flows have additional gates — see `mcp-gitlab-usage` (`requirements_confirmed`, `projects_confirmed`, `issues_creation_confirmed`).
