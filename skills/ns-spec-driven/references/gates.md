# Planning gates (SDD)

Human confirmation gates for spec-driven workflows.

**Chat voice:** ask natural language; name deliverable, not phase. See `human-communication.md` when that skill installed.

## Gate 1 — Requirements (`requirements_confirmed`) {#gate-1-requirements}

- If `requirements.md` does not exist: generate via `ns-spec-driven` → `references/requirements-generator.md` and **stop** until human confirms.
- If exists but not explicitly validated: **stop** and ask confirmation (`yes` / explicit approval).
- Chat self-contained: plain-language highlights and questions; document IDs only in parentheses after meaning — see `human-communication.md` (**Gate 1 highlights**).
- Example ask shape: "Requirements are at `{path}`. [plain-language points / open decisions]. Confirm them, or tell me what to change."

## Gate 2 — Scope (`scope_confirmed`) {#gate-2-scope}

- Present summary of Features (with layer counts when applicable) and **stop** until human confirms.
- Use feature titles in words; do not lead with `Feature 00N` alone.
- Example ask: "Here is the feature/scope summary. OK to proceed, or what should change?"

## Consistency analysis {#consistency-analysis}

- After Gate 2, run `ns-spec-driven` Consistency phase (`references/analyze-consistency.md`).
- Resolve blockers (or get explicit waiver) before Gate 3.
- Warnings: fix or waive before Gate 3; do **not** skip Gate 3 on clean pass.

## Gate 3 — Execution (`execution_confirmed`) {#gate-3-execution}

- **Always required** before writing any `task-*.md` — even when consistency is 100% Approved.
- Present summarized task plan: count by layer/type **and** estimated worker spawns (classic batches: same-layer consecutive `pending`, prefer 4–7, hard max 7). Volume visible before generation.
- **Stop** until human confirms (`execution_confirmed`).
- Example ask: "Task plan: N backend, M frontend, … (~K worker batches, prefer 4–7 tasks each). Shall I generate the task files?"

## Hard stops {#hard-stops}

- Never generate tasks without passing required gates (Gate 3 always included).
- When step asks for explicit confirmation, do not proceed without it.
- GitLab MCP flows have additional gates — see `mcp-gitlab-usage` (`requirements_confirmed`, `projects_confirmed`, `issues_creation_confirmed`).
