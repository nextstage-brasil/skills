# Planning gates (SDD)

Human confirmation gates for spec-driven workflows.

**Chat voice:** ask in natural language; name the deliverable, not the phase. See `../../ns-spec-driven/references/human-communication.md` when that skill is installed.

## Gate 1 — Requirements (`requirements_confirmed`) {#gate-1-requirements}

- If `requirements.md` does not exist: generate via `ns-sdd-requirements-generator` and **stop** until the human confirms.
- If it exists but was not explicitly validated: **stop** and ask for confirmation (`yes` / explicit approval).
- Chat must be self-contained: plain-language highlights and questions; document IDs only in parentheses after the meaning — see `../../ns-spec-driven/references/human-communication.md` (**Gate 1 highlights**).
- Example ask shape: "Requirements are at `{path}`. [plain-language points / open decisions]. Confirm them, or tell me what to change."

## Gate 2 — Scope (`scope_confirmed`) {#gate-2-scope}

- Present a summary of Features (with layer counts when applicable) and **stop** until the human confirms.
- Use feature titles in words; do not lead with `Feature 00N` alone.
- Example ask: "Here is the feature/scope summary. OK to proceed, or what should change?"

## Consistency analysis {#consistency-analysis}

- After Gate 2, run `ns-sdd-analyze-consistency`.
- **100% pass** (zero blockers, zero warnings): `execution_confirmed` is implicit → proceed to task generation without Gate 3.
- If warnings or blockers exist: resolve or get explicit waiver before task generation.

## Gate 3 — Execution (`execution_confirmed`) {#gate-3-execution}

- **Required only** when consistency analysis is not 100% positive (or when waivers apply).
- Present summarized task plan (count by type) and **stop** until the human confirms.
- Example ask: "Task plan summary: … Shall I generate the task files?"

## Hard stops {#hard-stops}

- Never generate tasks without passing required gates.
- When a step asks for explicit confirmation, do not proceed without it.
- GitLab MCP flows have additional gates — see `mcp-gitlab-usage` (`requirements_confirmed`, `projects_confirmed`, `issues_creation_confirmed`).
