# Harness discovery

Use this pattern in every skill that needs project rules, artifact paths, or harness-relative references.

## Session boot (blocking)

**Before any other step** in a consumer skill — MCP calls, file edits, planning, or review — complete this sequence. Do not skip by reading only the skill body. Do not put this sequence in skill frontmatter `description` (descriptions are for triggering only).

1. Read `{product_root}/AGENTS.md` (project entry router).
2. If `agents.local.md` exists at `{product_root}` (case-insensitive filename), read it **after** `AGENTS.md`.
3. Read `{harness_root}/rules/architecture-rules.md` (constitution) when `{harness_root}/` exists.
4. Read `{harness_root}/rules/project-rules.md` (project-local settings — language, codes, MCP server, agent names) when that file exists.
5. Load layer rules from `{harness_root}/rules/` matching the files you will change (backend, frontend, tests, e2e).
6. **Legacy fallback:** if `{harness_root}/` is missing but `.cursor/rules/*.mdc` exists, read adapters with a one-time deprecation note.
7. When `{product_root}/docs/context/` exists, follow the **Implementation boot rule** in `artifact-layout.md` before writing code.

**GitLab MCP:** after steps 1–7, use **only** the MCP server named in `project-rules.md` or `agents.local.md` when those files exist (`agents.local.md` overrides `project-rules.md` when both name a server). If missing, follow `AGENTS.md` First action / GitLab MCP section or stop and ask the human.

Then continue the active skill workflow.

## Resolution order

1. **Product anchor** — If the repo has `AGENTS.md` at `{product_root}`, treat `{product_root}` as the harness anchor.
2. **Canonical rules** — Load rules from `{harness_root}/rules/*.md`. Read `architecture-rules.md` first (constitution), then `project-rules.md` (project-local) — covered by Session boot steps 3–4.
3. **Layer rules** — Load additional rules from `{harness_root}/rules/` matching changed files — covered by Session boot step 5.
4. **Legacy fallback** — If `{harness_root}/` is missing but `.cursor/rules/*.mdc` exists, read adapters with a one-time deprecation note. Prefer `harness init` then `npx @nextstage-brasil/harness sync` (absorbs orphans into canonical).
5. **Product context (implementation)** — When `{product_root}/docs/context/` exists, follow the **Implementation boot rule** in `artifact-layout.md` before writing code — covered by Session boot step 7.

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

**Legacy alias:** `{harness}` → `{product_root}` (deprecated in new docs; prefer `{harness_root}` for rules paths).

Adapter generation: see `rules-sync.md`. Skills: canonical `.agents/skills/`; `harness sync` symlinks to `.claude/skills/` for Claude Code only (Cursor reads canonical directly).

## No harness found

If none of the resolution steps above match (no `{harness_root}/`, no `.cursor/rules/`, no `AGENTS.md`): treat the repo as **standalone with no versioning scaffold**. Use repo root as `{product_root}`, load no project-specific rules, and skip any step that depends on `{version_san}` or `docs/versions/`. Do **not** fabricate a `version_san`, do **not** create a `docs/versions/` folder speculatively, and do **not** ask the human to supply one unless the active skill's own workflow explicitly requires versioned output for the task at hand.

## Do not assume

- Grogoo, Laravel, React, or Cypress unless detected in stack context or rules.
- Fixed monorepo layout (`apps/` vs repo root) — resolve `{product_root}` from context or ask once.

## MCP GitLab

When GitLab MCP is available, follow the `mcp-gitlab-usage` skill for tool contracts. Server-specific skill sync via `get_mcp_gitlab_skill` applies to MCP servers that expose it — not to this repository's copy of `mcp-gitlab-usage`.
