# Harness project subagent dispatch

When a skill must **spawn a separate agent** (Cursor/Claude project agent, Task tool, `/name`), prefer harness **thin bridges** over calling the skill bare or inventing personas.

Skills remain the **workflow source of truth**. Bridges only bind `model` / `readonly` and load `AGENTS.md` + the skill.

## Bridges (v1)

| Project agent | Skill | Typical use |
| ------------- | ----- | ----------- |
| `coder-agent` | `ns-code-coder` | Implement task / slice / ad-hoc unit |
| `reviewer-agent` | `ns-code-reviewer` | Review gate (readonly) |
| `task-writer-agent` | `ns-sdd-task-generator` | Write SDD task files during planning |

Defaults and seeding: `rules-sync.md` → Default subagents. Project owns `model` in `.nextstage-harness/manifest.json` → `subagents`.

## Presence check

A bridge is **available** when **any** of:

1. `.cursor/agents/{name}.md` exists, or
2. `.claude/agents/{name}.md` exists, or
3. `manifest.json` → `subagents[]` has `{ "name": "{name}" }` and `.agents/skills/{skill}/` is installed

If unavailable → fall back to reading and following `.agents/skills/{skill}/SKILL.md` in the current session (or a generic subagent whose **only** instruction is to follow that skill).

## Dispatch rules

1. **Prefer the bridge** when available — so the run uses the project's configured model.
2. **Do not** paraphrase the skill into a custom persona prompt. The bridge body already points at the skill.
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in the dispatch message; the bridge still must open `AGENTS.md` then the skill.
4. **In-session** work: if the user already invoked `/ns-code-coder` (or the skill is the active face), continue that skill — do not bounce to `coder-agent` unless spawning a **child** worker.

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicitly requests) |
| ------- | ---------------------------------------------- |
| `coder-agent`, `reviewer-agent`, `task-writer-agent` | Cursor Task personas: `senior-tech-lead-reviewer`, `bugbot`, `security-review` |
| Direct skill read when bridge missing | Improvised "act as reviewer" without `ns-code-reviewer` |

`reviewer-agent` **is** the preferred review-gate vehicle when present — it is not a substitute; it loads `ns-code-reviewer`.

## Callers

Update these to cite this file when they dispatch workers:

- `ns-spec-driven` (Execute / Quick)
- `ns-sdd-execution-handoff-generator` (`run-implementation.md`)
- `ns-execution-orchestrator` (slice worker + closure review)
- `ns-code-autonomous` (C2 units + review gate)
- `ns-code-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 4)
- `review-gate-workflow.md`
