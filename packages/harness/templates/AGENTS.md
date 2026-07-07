# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows. Skills are agent-agnostic — install with the [Skills CLI](https://skills.sh/) or `npx @nextstage-brasil/harness`.

## Layout

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Project rules entry point (`{product_root}`) |
| `.agents/skills/` | Installed skills (Skills CLI) |
| `.agents/agents/` | Isolated agent personas |
| `.agents/rules/` | Project-specific agent rules |
| `.agents/docs/` | Agent-oriented project docs |
| `docs/context/` | Product-wide context (stack, design, brownfield, GitLab sync) — read before implementation |
| `docs/versions/` | SDD version artifacts |
| `docs/specs/` | Living domain specs |

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → `execution-handoff-generator` → implementation (`coder` / `code-coder` / `execution-orchestrator`) → `code-reviewer` → `living-spec-consolidator`

## Language

Project code comments and documentation: English unless the team defines otherwise.
