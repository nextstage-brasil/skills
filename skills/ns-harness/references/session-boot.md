# Session boot (blocking)

**Before any other step** in consumer skill — MCP, file edits, planning, review — finish this sequence. Do not skip via skill body alone. Do not put sequence in frontmatter `description` (triggering only).

## Once per agent start

| When | Action |
| ---- | ------ |
| Cold start (skill first boot **or** new subagent/bridge) | Steps 1–6 **once** |
| Same agent mid-session | Skip re-boot unless `agents.local.md` or harness rules changed |
| Cross-skill "Complete Session boot" | Steps 1–6 done + files unchanged: continue; else finish or re-boot |

Fresh subagents may start without the parent's rules — check what is in context and boot the rest (local overrides always). No invented skip/cache. "Already booted" = steps **1–6 complete**.

**`AGENTS.md`:** already in host context (Cursor and Antigravity inject it; Claude Code through the `@AGENTS.md` import in `CLAUDE.md`). Do not tool-Read it. Obey loaded text. Only exception: its text is genuinely absent from your context (e.g. an old `CLAUDE.md` without the import) — then open it once.

**Injected rules — do not read twice.** Hosts inject harness rule adapters on their own: Claude Code loads `.claude/rules/{name}.md` (always, or on matching files when the adapter has `paths:`); Cursor loads `.cursor/rules/{name}.mdc` (`alwaysApply`, or `globs` on matching files). When a rule's text is already in your context, skip the Read in steps 2–4. When it is not — Antigravity, a missing adapter, or a fresh subagent without it — Read the canonical file under `.nextstage-harness/rules/`.

1. `agents.local.md` beside `AGENTS.md` (case-insensitive) — read **once** if present.
2. `.nextstage-harness/rules/architecture-rules.md` when `.nextstage-harness/` exists (skip if injected).
3. `.nextstage-harness/rules/project-rules.md` when present — language, codes, MCP server, agent names (skip if injected).
4. Layer rules under `.nextstage-harness/rules/` matching files you change — backend, frontend, tests, e2e (skip if injected).
5. **Legacy:** `.nextstage-harness/` missing + `.cursor/rules/*.mdc` exists — read adapters + one-time deprecation note.
6. `docs/context/` present — follow **Implementation boot rule** in `artifact-layout.md` before code writes.

**GitLab MCP:** after 1–6, **only** server named in `project-rules.md` or `agents.local.md` (`agents.local.md` wins if both). Missing: `AGENTS.md` First action / GitLab MCP, or stop + ask human.

Then active skill workflow.

## No harness / no scaffold

No `.nextstage-harness/`, `.cursor/rules/`, or `AGENTS.md`: standalone — no project rules. Do **not** fabricate `{version_san}` or create `docs/versions/` unless active skill requires versioned output.

## MCP GitLab

GitLab MCP available: follow `mcp-gitlab-usage` for tool contracts. That skill is **MCP-provisioned** via `get_mcp_gitlab_skill` on first access — not installed from this repo's harness catalog.
