# Project agents — {project_name}

{one_line_project_summary}

## First action (before any work)

Obey this file (`AGENTS.md`) — already in host context; **do not** tool-Read it.

1. If `agents.local.md` exists at the same directory as `AGENTS.md` (case-insensitive filename), read it **once** — local overrides apply after this file.
2. Note the **GitLab MCP server** named in Project notes (or in `agents.local.md`) — use only that server for GitLab tools.

**Before implementation**, read `.nextstage-harness/rules/architecture-rules.md` when it exists. If missing or still the harness stub, run `/ns-harness` architecture-rules then `npx @nextstage-brasil/harness sync`.

## How to start

| Mode | When | Entry |
| ---- | ---- | ----- |
| Planning | New feature, version, or SDD scope | `/ns-spec-driven` or SDD chain below |
| Implementation | Approved plan, handoff, or GitLab issue | Implementation routing table below |
| Ad-hoc | Quick fix, script, small diff — no version lifecycle | `/ns-coder` |

## Layout

Present: {rules path or absent}, `.agents/skills/`, `agents.local.md` {present|not present}, `docs/context|specs|versions` {present paths only}.

## Installed skills

Group by role. Exact names from `.agents/skills/`.

| Role | Skills |
| ---- | ------ |
{role_rows}

Invoke via Skills menu / slash. Skills = entry points — no persona/subagent section.

## Implementation routing

Priority scan **1 → 5**; first match wins. Full handoffs: installed `ns-harness` → `references/code-skill-routing.md`.

| Priority | Signal | Skill |
| -------- | ------ | ----- |
| 1 | GitLab `ISSUE_URL` or "implement this issue" | `ns-execution-gitlab-issue` |
| 2 | Feature / version / SDD / multi-day scope | `ns-spec-driven` |
| 3 | Autonomous local plan, no issue | `ns-autonomous` |
| 4 | Root-cause only — no implement request | `ns-investigator` |
| 5 | Default — quick fix, small ad-hoc diff | `ns-coder` |

## Workflows

### SDD planning chain

{sdd_chain_tailored_to_installed_skills}

### Brownfield / context (when applicable)

| Artifact | Path | Skill |
| -------- | ---- | ----- |
| Architecture constitution | `.nextstage-harness/rules/architecture-rules.md` | `/ns-harness` → `architecture-rules-generator.md` |
| Brownfield map | `docs/context/brownfield-map.md` | `/ns-harness` → `bootstrap-brownfield.md` |
| Business reverse spec | `docs/context/system-reverse-spec.md` | `/ns-harness` → `codebase-reverse-spec.md` |
| Business reverse index (agents) | `docs/context/system-reverse-spec.agent.md` | Prefer when present |

## Hard stops / FORBIDDEN

- Do not invent folders, skills, or agent personas not listed here.
- Do not skip `architecture-rules.md` before implementation.
- Do not commit, push, or mutate GitLab state unless the active skill explicitly allows it for this run.
- GitLab `ISSUE_URL` → `ns-execution-gitlab-issue` — never ad-hoc coder on the main checkout.
- Do not fabricate `{version_san}` or `docs/versions/` unless the active skill's workflow requires it.

## Rules and sync

- Canonical rules: `.nextstage-harness/rules/*.md` — edit here
- Regenerate adapters: `npx @nextstage-brasil/harness sync`
- Skills: `.agents/skills/` (canonical; Cursor reads here) — `.claude/skills/` symlinked for Claude Code

See installed `ns-harness` (`session-boot.md`, `rules-sync.md`).

## Docker and testing

- **MUST NOT** restart/stop/recreate or `docker compose up`/`down` without asking the user first.
- {test_evidence — only when recon finds it: e.g. Vitest on host; or test container name + command}
- {phpunit_block — include verbatim PHPUnit subsection from `../docker-and-testing.md` ONLY if PHP/PHPUnit evidenced; otherwise omit}

## Project notes

- Routes agents to skills/rules; stack/constraints → `architecture-rules.md`.
- {language_policy — default English for code/docs unless repo states otherwise}
- {evidence_based_bullets — GitLab MCP server name, protected branches, monorepo quirks; mark inferred}
