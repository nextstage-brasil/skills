# Project agents

This project uses [NextStage skills](https://github.com/nextstage-brasil/skills) for spec-driven development and agent workflows. Skills are agent-agnostic — install with the [Skills CLI](https://skills.sh/) or `npx @nextstage-brasil/harness`.

**Before implementation, read `.nextstage-harness/rules/architecture-rules.md`.**

<!-- harness-sync-managed: last-sync=never -->

## Product anchor

| Variable | Value |
| -------- | ----- |
| `{product_root}` | `.` |
| `{harness_root}` | `.nextstage-harness/` |

## Layout

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Project rules entry point (`{product_root}`) |
| `.nextstage-harness/rules/` | Canonical project rules (edit here) |
| `.nextstage-harness/README.md` | How to add/edit rules |
| `.nextstage-harness/manifest.json` | Adapter config for `harness sync` |
| `.cursor/rules/` | Generated Cursor adapters (do not edit) |
| `.claude/rules/` | Generated Claude Code adapters (do not edit) |
| `.agents/skills/` | Installed skills (Skills CLI) |
| `.cursor/skills/` | Symlinked Cursor skills (do not edit) |
| `.claude/skills/` | Symlinked Claude Code skills (do not edit) |
| `.agents/docs/` | Agent-oriented project docs |
| `docs/context/` | Product-wide context (stack, design, brownfield, GitLab sync) — read before implementation |
| `docs/versions/` | SDD version artifacts |
| `docs/specs/` | Living domain specs |

See the installed `nextstage-harness` skill for gates, artifact paths, and discovery details.

## Typical SDD chain

`clarify-requirements` → `requirements-generator` → `analyze-consistency` → `task-generator` → `execution-handoff-generator` → implementation (`code-coder` / `code-autonomous` / `execute-gitlab-issue` / `execution-orchestrator`) → `code-reviewer` → `living-spec-consolidator`

Invoke skills via the Skills menu / slash (e.g. `/code-coder`, `/code-reviewer`). Skills are the entry points — no separate agent personas layer.

## Testing

- **PHPUnit** — run only inside the appropriate Docker test container (never on the host, never in the app/dev container). Resolve the container name from `architecture-rules.md`, `docs/context/stack-confirmed.md`, or Compose/service docs when present. If the container is not documented or unclear, **ask once** before running tests — do not guess.

## Language

Project code comments and documentation: English unless the team defines otherwise.
