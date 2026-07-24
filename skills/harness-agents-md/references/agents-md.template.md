# Project agents — {project_name}

{one_line_project_summary}

**Before implementation, read `{harness_root}/rules/architecture-rules.md`** when it exists. If missing, run `harness-architecture-rules` first.

**Local overrides:** When `agents.local.md` exists at `{product_root}` (case-insensitive filename), read it **after** this file.

<!-- harness-sync-managed: last-sync=never -->

## Product anchor

| Variable | Value |
| -------- | ----- |
| `{product_root}` | `.` |
| `{harness_root}` | {resolved_harness_root_or_absent} |

`{product_root}` is always relative to this file (`.`). Never write an absolute machine path.

## Layout

{layout_table_rows — only paths that exist or are scaffolded; mark missing as "not present". Do not list `.agents/agents/` or persona wrappers.}

## Installed skills

Group by role (Foundation / SDD planning / GitLab / Implementation / Brownfield / Other). Compact table — one row per role that has at least one installed skill. Exact names from `.agents/skills/`.

| Role | Skills |
| ---- | ------ |
{role_rows}

Invoke via the Skills menu / slash (e.g. `/code-coder`, `/code-reviewer`, `/execution-orchestrator`). **Skills are the entry points** — do not invent or document a separate "Agent personas / subagents" section.

## Workflows

### SDD planning chain

{sdd_chain_tailored_to_installed_skills}

### Implementation

{implementation_path — code-coder vs code-autonomous vs execution-gitlab-issue vs execution-orchestrator based on installed skills}

### Brownfield / context (when applicable)

| Artifact | Path | Skill |
| -------- | ---- | ----- |
| Architecture constitution | `.nextstage-harness/rules/architecture-rules.md` | `harness-architecture-rules` |
| Brownfield map | `docs/context/brownfield-map.md` | `harness-bootstrap-brownfield` |
| Business reverse spec | `docs/context/system-reverse-spec.md` | `harness-codebase-reverse-spec` |

## Rules and sync

- Canonical rules: `{harness_root}/rules/*.md` — edit here
- Regenerate adapters: `npx @nextstage-brasil/harness sync`
- Skills: `.agents/skills/` (canonical; Cursor reads here) — `.claude/skills/` symlinked for Claude Code

See installed `nextstage-harness` skill (`harness-discovery.md`, `rules-sync.md`).

## Docker and testing

Include verbatim from `../nextstage-harness/references/docker-and-testing.md` (keep in sync with `packages/harness/templates/snippets/docker-and-testing.md`).
{optional_project_specific_test_notes — only when evidenced: exact compose service name, phpunit wrapper script, etc.}

## Language

{language_policy — default English for code/docs unless repo states otherwise}

## Project-specific notes

{evidence_based_bullets — GitLab MCP server name, protected branches, monorepo quirks, completion style; mark inferred}
