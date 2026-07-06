# Harness discovery

Use this pattern in every skill that needs project rules, artifact paths, or harness-relative references.

## Resolution order

1. **Standalone / Cursor** — If the repo has `.cursor/rules/` or `AGENTS.md` at `{product_root}`, treat `{product_root}` as the harness anchor (rules may live under `.cursor/rules/`).
2. **Rules loading** — Load applicable rules from `.cursor/rules/*.mdc` when they exist. Read `AGENTS.md` first for pointers.

## Variables

| Variable | Typical value |
|----------|---------------|
| `{harness}` | Repo root (rules under `.cursor/rules/`) |
| `{product_root}` | Product folder or repo root |
| `{specs_root}` | `{product_root}/docs/specs/` |
| `{version_san}` | Sanitized version (e.g. `1.0.0`) |

## No harness found

If none of the resolution steps above match (no `.cursor/rules/`, no `AGENTS.md`): treat the repo as **standalone with no versioning scaffold**. Use repo root as `{product_root}`, load no project-specific rules, and skip any step that depends on `{version_san}` or `docs/versions/` (e.g. version-closure report paths). Do **not** fabricate a `version_san`, do **not** create a `docs/versions/` folder speculatively, and do **not** ask the human to supply one unless the active skill's own workflow explicitly requires versioned output for the task at hand.

## Do not assume

- Grogoo, Laravel, React, or Cypress unless detected in stack context or rules.
- Fixed monorepo layout (`apps/` vs repo root) — resolve `{product_root}` from context or ask once.

## MCP GitLab

When GitLab MCP is available, follow the `mcp-gitlab-usage` skill for tool contracts. Server-specific skill sync via `get_mcp_gitlab_skill` applies to MCP servers that expose it — not to this repository's copy of `mcp-gitlab-usage`.
