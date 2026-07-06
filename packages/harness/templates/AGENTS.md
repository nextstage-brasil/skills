# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows.

## Harness discovery

Skills resolve project context at runtime:

1. If `.cursor/rules/` or this file exists at the repo root, treat the repo as `{product_root}`.
2. Load applicable rules from `.cursor/rules/*.mdc` when present.
3. SDD artifacts live under `docs/versions/{version}/` and living specs under `docs/specs/`.

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details. Install or refresh skills with `npx @nextstage-brasil/harness`.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → implementation (`coder` / `execute-gitlab-issue`) → `code-reviewer` → `living-spec-consolidator`

## Language

Project code comments and documentation: English unless the team defines otherwise.
