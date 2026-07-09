# Harness discovery

Use this pattern in every skill that needs project rules, artifact paths, or harness-relative references.

## Resolution order

1. **Product anchor** — If the repo has `AGENTS.md` at `{product_root}`, treat `{product_root}` as the harness anchor.
2. **Canonical rules** — Load rules from `{harness_root}/rules/*.md`. Read `architecture-rules.md` first (constitution).
3. **Layer rules** — Load additional rules from `{harness_root}/rules/` matching changed files (backend, frontend, tests, e2e).
4. **Legacy fallback** — If `{harness_root}/` is missing but `.cursor/rules/*.mdc` exists, read adapters with a one-time deprecation note. Prefer migrating with `npx @nextstage-brasil/harness migrate-rules`.
5. **Product context (implementation)** — When `{product_root}/docs/context/` exists, follow the **Implementation boot rule** in `artifact-layout.md` before writing code.

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

## Rules loading order (all consumer skills)

1. Read `AGENTS.md`
2. If `agents.local.md` exists at `{product_root}` (case-insensitive filename), read it after `AGENTS.md`
3. Read `{harness_root}/rules/architecture-rules.md` (constitution)
4. Load layer rules from `{harness_root}/rules/` matching changed files
5. **Legacy fallback:** if `{harness_root}/` missing but `.cursor/rules/*.mdc` exists, read adapters with a one-time deprecation note

Adapter generation: see `rules-sync.md`. Skills: canonical `.agents/skills/` → `harness sync` → symlinks in `.cursor/skills/`, `.claude/skills/`.

## No harness found

If none of the resolution steps above match (no `{harness_root}/`, no `.cursor/rules/`, no `AGENTS.md`): treat the repo as **standalone with no versioning scaffold**. Use repo root as `{product_root}`, load no project-specific rules, and skip any step that depends on `{version_san}` or `docs/versions/`. Do **not** fabricate a `version_san`, do **not** create a `docs/versions/` folder speculatively, and do **not** ask the human to supply one unless the active skill's own workflow explicitly requires versioned output for the task at hand.

## Do not assume

- Grogoo, Laravel, React, or Cypress unless detected in stack context or rules.
- Fixed monorepo layout (`apps/` vs repo root) — resolve `{product_root}` from context or ask once.

## MCP GitLab

When GitLab MCP is available, follow the `mcp-gitlab-usage` skill for tool contracts. Server-specific skill sync via `get_mcp_gitlab_skill` applies to MCP servers that expose it — not to this repository's copy of `mcp-gitlab-usage`.
