# Project agents — {project_name}

{one_line_project_summary}

<!-- harness-sync-managed: last-sync=never -->

## First action (read before any work)

1. Read this file (`AGENTS.md`) in full.
2. If `agents.local.md` exists at `{product_root}` (case-insensitive filename), read it **next** — local overrides apply after this file.
3. Note the **GitLab MCP server** named in Project-specific notes (or in `agents.local.md`) — use only that server for GitLab tools.

**Before implementation**, read `{harness_root}/rules/architecture-rules.md` when it exists. If missing or still the harness stub, run `ns-harness-architecture-rules` first.

## How to start

| Mode | When | Entry |
| ---- | ---- | ----- |
| Planning | New feature, version, or SDD scope | `/ns-spec-driven` or SDD chain below |
| Implementation | Approved plan, handoff, or GitLab issue | Implementation routing table below |
| Ad-hoc | Quick fix, script, small diff — no version lifecycle | `/ns-code-coder` |

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

Invoke via the Skills menu / slash (e.g. `/ns-code-coder`, `/ns-code-reviewer`). **Skills are the entry points** — do not invent or document a separate "Agent personas / subagents" section.

## Implementation routing

Priority scan **1 → 5**; first matching signal wins. Full handoffs: installed `ns-harness` skill → `references/code-skill-routing.md`.

| Priority | Signal | Skill |
| -------- | ------ | ----- |
| 1 | GitLab `ISSUE_URL` or "implement this issue" | `ns-execution-gitlab-issue` |
| 2 | Feature / version / SDD / multi-day scope | `ns-spec-driven` |
| 3 | Autonomous local plan, no issue | `ns-code-autonomous` |
| 4 | Root-cause only — no implement request | `ns-code-investigator` |
| 5 | Default — quick fix, small ad-hoc diff | `ns-code-coder` |

## Workflows

### SDD planning chain

{sdd_chain_tailored_to_installed_skills}

### Implementation

{implementation_path — ns-code-coder vs ns-code-autonomous vs ns-execution-gitlab-issue vs ns-execution-orchestrator based on installed skills}

### Brownfield / context (when applicable)

| Artifact | Path | Skill |
| -------- | ---- | ----- |
| Architecture constitution | `.nextstage-harness/rules/architecture-rules.md` | `ns-harness-architecture-rules` |
| Brownfield map | `docs/context/brownfield-map.md` | `ns-harness-bootstrap-brownfield` |
| Business reverse spec | `docs/context/system-reverse-spec.md` | `ns-harness-codebase-reverse-spec` |
| Business reverse index (agents) | `docs/context/system-reverse-spec.agent.md` | Prefer when present |

## Hard stops / FORBIDDEN

- Do not invent folders, skills, or agent personas not listed here.
- Do not skip `architecture-rules.md` before implementation.
- Do not commit, push, or mutate GitLab state unless the active skill explicitly allows it for this run.
- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` — never ad-hoc coder on the main checkout.
- Do not fabricate `{version_san}` or `docs/versions/` unless the active skill's workflow requires it.

## Ownership

This file **routes** agents to skills and project rules. Stack, modules, and technical constraints belong in `architecture-rules.md` — not here.

## Rules and sync

- Canonical rules: `{harness_root}/rules/*.md` — edit here
- Regenerate adapters: `npx @nextstage-brasil/harness sync`
- Skills: `.agents/skills/` (canonical; Cursor reads here) — `.claude/skills/` symlinked for Claude Code

See installed `ns-harness` skill (`harness-discovery.md`, `rules-sync.md`).

## Docker and testing

Include verbatim from `../ns-harness/references/docker-and-testing.md` (keep in sync with `packages/harness/templates/snippets/docker-and-testing.md`).
{optional_project_specific_test_notes — only when evidenced: exact compose service name, phpunit wrapper script, etc.}

## Language

{language_policy — default English for code/docs unless repo states otherwise}

## Project-specific notes

{evidence_based_bullets — GitLab MCP server name, protected branches, monorepo quirks, completion style; mark inferred}
