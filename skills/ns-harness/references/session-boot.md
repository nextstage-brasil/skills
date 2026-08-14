# Session boot (blocking)

**Before any other step** in consumer skill — MCP calls, file edits, planning, or review — complete this sequence. Do not skip by reading only skill body. Do not put this sequence in skill frontmatter `description` (descriptions = triggering only).

## Once per agent start

| When | Action |
| ---- | ------ |
| Cold start (skill first boot **or** new subagent/bridge) | Complete steps 1–6 **once** |
| Same agent mid-session | Skip full re-boot unless `agents.local.md` or harness rules changed since last boot |
| Cross-skill "Complete Session boot" | Steps 1–6 already done this agent run and files unchanged: continue; else finish or re-boot |

Fresh subagents = empty context for **rules** — always boot rules/local overrides. Do **not** invent skip/caching for new agent invocation. "Already booted" = steps **1–6 complete**.

**`AGENTS.md`:** already in host context (Cursor injects it; Claude via `CLAUDE.md`). **Never** tool-Read `AGENTS.md`. Obey the text already loaded.

1. If `agents.local.md` exists beside `AGENTS.md` (case-insensitive filename), read it **once**.
2. Read `.nextstage-harness/rules/architecture-rules.md` (constitution) when `.nextstage-harness/` exists.
3. Read `.nextstage-harness/rules/project-rules.md` (project-local settings — language, codes, MCP server, agent names) when that file exists.
4. Load layer rules from `.nextstage-harness/rules/` matching files you will change (backend, frontend, tests, e2e).
5. **Legacy fallback:** if `.nextstage-harness/` missing but `.cursor/rules/*.mdc` exists, read adapters with one-time deprecation note.
6. When `docs/context/` exists, follow **Implementation boot rule** in `artifact-layout.md` before writing code.

**GitLab MCP:** after steps 1–6, use **only** MCP server named in `project-rules.md` or `agents.local.md` when those files exist (`agents.local.md` overrides `project-rules.md` when both name a server). If missing, follow `AGENTS.md` First action / GitLab MCP section or stop and ask human.

Then continue active skill workflow.

## No harness / no scaffold

None of `.nextstage-harness/`, `.cursor/rules/`, or `AGENTS.md`: standalone repo — load no project-specific rules. Do **not** fabricate `{version_san}` or create `docs/versions/` unless the active skill workflow explicitly requires versioned output.

## MCP GitLab

GitLab MCP available: follow `mcp-gitlab-usage` for tool contracts. Server-specific skill sync via `get_mcp_gitlab_skill` = MCP servers that expose it — not this repo's copy of `mcp-gitlab-usage`.
