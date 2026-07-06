# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows. Skills are agent-agnostic — install with the [Skills CLI](https://skills.sh/) or `npx @nextstage-brasil/harness`.

## Harness discovery

Skills resolve project context at runtime:

1. This file at the repo root is `{product_root}` — read it first.
2. Skills install to `.agents/skills/` (Skills CLI).
3. Isolated agent personas install to `agents/<name>.md` when the matching skill is in the preset.
4. SDD artifacts live under `docs/versions/{version}/`; living specs under `docs/specs/`.

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → implementation (`coder` / `execute-gitlab-issue`) → `code-reviewer` → `living-spec-consolidator`

## Language

Project code comments and documentation: English unless the team defines otherwise.
