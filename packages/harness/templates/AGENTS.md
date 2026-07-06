# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows. Skills are agent-agnostic — install with the [Skills CLI](https://skills.sh/) or `npx @nextstage-brasil/harness`.

## Harness discovery

Skills resolve project context at runtime:

1. This file at the repo root is `{product_root}` — read it first.
2. Load additional rules from agent-specific paths when present (for example `.agents/`, `.cursor/rules/`).
3. SDD artifacts live under `docs/versions/{version}/`; living specs under `docs/specs/`.

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → implementation (`coder` / `execute-gitlab-issue`) → `code-reviewer` → `living-spec-consolidator`

## Language

Project code comments and documentation: English unless the team defines otherwise.
