# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows. Skills are agent-agnostic — install with the [Skills CLI](https://skills.sh/) or `npx @nextstage-brasil/harness`.

**Before implementation, read `.nextstage-harness/rules/architecture-rules.md`.**

<!-- harness-sync-managed: last-sync=never -->

## Layout

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Project rules entry point (`{product_root}`) |
| `.nextstage-harness/rules/` | Canonical project rules (edit here) |
| `.nextstage-harness/manifest.json` | Adapter config for `harness sync` |
| `.cursor/rules/` | Generated Cursor adapters (do not edit) |
| `.claude/rules/` | Generated Claude Code adapters (do not edit) |
| `.agents/skills/` | Installed skills (Skills CLI) |
| `.agents/agents/` | Isolated agent personas (canonical — edit here) |
| `.cursor/agents/` | Symlinked Cursor subagents (do not edit) |
| `.claude/agents/` | Symlinked Claude Code subagents (do not edit) |
| `.agents/docs/` | Agent-oriented project docs |
| `docs/context/` | Product-wide context (stack, design, brownfield, GitLab sync) — read before implementation |
| `docs/versions/` | SDD version artifacts |
| `docs/specs/` | Living domain specs |

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → `execution-handoff-generator` → implementation (`coder` / `code-coder` / `execution-orchestrator`) → `code-reviewer` → `living-spec-consolidator`

## Language

Project code comments and documentation: English unless the team defines otherwise.
