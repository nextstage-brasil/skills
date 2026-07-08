# Project agents — {project_name}

{one_line_project_summary}

**Before implementation, read `{harness_root}/rules/architecture-rules.md`** when it exists. If missing, run `architecture-rules-generator` first.

<!-- harness-sync-managed: last-sync=never -->

## Product anchor

| Variable | Value |
| -------- | ----- |
| `{product_root}` | {resolved_product_root} |
| `{harness_root}` | {resolved_harness_root_or_absent} |

## Layout

{layout_table_rows — only paths that exist or are scaffolded; mark missing as "not present"}

## Installed skills

{list_from_.agents/skills/ — group by role when helpful}

Invoke via the Skills menu / slash (e.g. `/code-coder`, `/code-reviewer`, `/execution-orchestrator`).

## Workflows

### SDD planning chain

{sdd_chain_tailored_to_installed_skills}

### Implementation

{implementation_path — code-coder vs execute-gitlab-issue vs execution-orchestrator based on installed skills}

### Brownfield / context (when applicable)

| Artifact | Path | Skill |
| -------- | ---- | ----- |
| Architecture constitution | `.nextstage-harness/rules/architecture-rules.md` | `architecture-rules-generator` |
| Brownfield map | `docs/context/brownfield-map.md` | `bootstrap-brownfield` |
| Business reverse spec | `docs/context/system-reverse-spec.md` | `codebase-reverse-spec` |

## Rules and sync

- Canonical rules: `{harness_root}/rules/*.md` — edit here
- Regenerate adapters: `npx @nextstage-brasil/harness sync`
- Skills: `.agents/skills/` → symlinks in `.cursor/skills/`, `.claude/skills/`

See installed `nextstage-harness` skill (`harness-discovery.md`, `rules-sync.md`).

## Language

{language_policy — default English for code/docs unless repo states otherwise}

## Project-specific notes

{evidence_based_bullets — GitLab MCP server name, protected branches, monorepo quirks, completion style; mark inferred}
