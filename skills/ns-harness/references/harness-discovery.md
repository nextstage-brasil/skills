# Harness discovery

Pattern for every skill needing project rules, artifact paths, or harness-relative references.

## Session boot (blocking)

**Before any other step** in consumer skill — MCP calls, file edits, planning, or review — complete this sequence. Do not skip by reading only skill body. Do not put this sequence in skill frontmatter `description` (descriptions = triggering only).

### Once per agent start

| When | Action |
| ---- | ------ |
| Cold start (skill first boot **or** new subagent/bridge) | Complete steps 1–7 **once** |
| Same agent mid-session | Skip full re-boot unless `AGENTS.md`, `agents.local.md`, or harness rules changed since last boot |
| Cross-skill "Complete Session boot" | Steps 1–7 already done this agent run and files unchanged: continue; else finish or re-boot |

Fresh subagents = empty context — always boot. Do **not** invent skip/caching for new agent invocation. "Already booted" = steps **1–7 complete**, not AGENTS-only.

1. Read `{product_root}/AGENTS.md` (project entry router).
2. If `agents.local.md` exists at `{product_root}` (case-insensitive filename), read it **after** `AGENTS.md`.
3. Read `{harness_root}/rules/architecture-rules.md` (constitution) when `{harness_root}/` exists.
4. Read `{harness_root}/rules/project-rules.md` (project-local settings — language, codes, MCP server, agent names) when that file exists.
5. Load layer rules from `{harness_root}/rules/` matching files you will change (backend, frontend, tests, e2e).
6. **Legacy fallback:** if `{harness_root}/` missing but `.cursor/rules/*.mdc` exists, read adapters with one-time deprecation note.
7. When `{product_root}/docs/context/` exists, follow **Implementation boot rule** in `artifact-layout.md` before writing code.

**GitLab MCP:** after steps 1–7, use **only** MCP server named in `project-rules.md` or `agents.local.md` when those files exist (`agents.local.md` overrides `project-rules.md` when both name a server). If missing, follow `AGENTS.md` First action / GitLab MCP section or stop and ask human.

Then continue active skill workflow.

## Resolution order

1. **Product anchor** — `AGENTS.md` at `{product_root}`: `{product_root}` = harness anchor.
2. **Canonical rules** — `{harness_root}/rules/*.md`. `architecture-rules.md` first (constitution), then `project-rules.md` (project-local) — Session boot steps 3–4.
3. **Layer rules** — `{harness_root}/rules/` matching changed files — Session boot step 5.
4. **Legacy fallback** — `{harness_root}/` missing but `.cursor/rules/*.mdc` exists: read adapters, one-time deprecation note. Prefer `harness init` then `npx @nextstage-brasil/harness sync` (absorbs orphans into canonical).
5. **Product context (implementation)** — `{product_root}/docs/context/` exists: **Implementation boot rule** in `artifact-layout.md` before writing code — Session boot step 7.

## Variables

| Variable | Typical value |
|----------|---------------|
| `{product_root}` | Repo root or monorepo product folder |
| `{harness_root}` | `{product_root}/.nextstage-harness/` |
| `{rules_canonical}` | `{harness_root}/rules/*.md` |
| `{skills_canonical}` | `{product_root}/.agents/skills/` (Skills CLI — do not move) |
| `{specs_root}` | `{product_root}/docs/specs/` |
| `{context_root}` | `{product_root}/docs/context/` |
| `{version_san}` | Sanitized version (e.g. `1.0.0`) |

**Legacy alias:** `{harness}` means `{product_root}` (deprecated in new docs; prefer `{harness_root}` for rules paths).

Adapter generation: `rules-sync.md`. Skills: canonical `.agents/skills/`; `harness sync` symlinks to `.claude/skills/` for Claude Code only (Cursor reads canonical directly).

## No harness found

None of resolution steps match (no `{harness_root}/`, no `.cursor/rules/`, no `AGENTS.md`): repo = **standalone, no versioning scaffold**. Use repo root as `{product_root}`, load no project-specific rules, skip steps needing `{version_san}` or `docs/versions/`. Do **not** fabricate `version_san`, do **not** create `docs/versions/` speculatively, do **not** ask human for one unless active skill workflow explicitly requires versioned output.

## Do not assume

- Grogoo, Laravel, React, or Cypress unless detected in stack context or rules.
- Fixed monorepo layout (`apps/` vs repo root) — resolve `{product_root}` from context or ask once.

## MCP GitLab

GitLab MCP available: follow `mcp-gitlab-usage` for tool contracts. Server-specific skill sync via `get_mcp_gitlab_skill` = MCP servers that expose it — not this repo's copy of `mcp-gitlab-usage`.
