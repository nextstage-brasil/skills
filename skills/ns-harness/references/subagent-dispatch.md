# Harness project subagent dispatch

Skill must **spawn separate agent** (Cursor/Claude project agent, Task tool, `/name`): **MUST** use harness **thin bridge** if available. Bare skill / invented persona = forbidden while bridge exists.

Skills = **workflow SoT**. Bridges bind `model` / `readonly`, Session boot at cold start per `session-boot.md` (obey `AGENTS.md` in context — no tool-Read; then rules), then skill. Worker owns boot — parent must **not** instruct per-task `AGENTS.md` re-read.

## Bridges (v1)

| Project agent | Skill | Typical use |
| ------------- | ----- | ----------- |
| `coder-agent` | `ns-coder` | Implement task / slice / ad-hoc |
| `reviewer-agent` | `ns-reviewer` | Review gate (readonly) |
| `task-writer-agent` | `ns-spec-driven` (`references/task-generator.md`) | SDD task files |

Defaults: `rules-sync.md` Default subagents. Project owns `model` in `.nextstage-harness/manifest.json` `subagents`.

## Presence check

Bridge **available** if **any**:

1. `.cursor/agents/{name}.md`, or
2. `.claude/agents/{name}.md`, or
3. `manifest.json` `subagents[]` has `{ "name": "{name}" }` + `.agents/skills/{skill}/` installed

Unavailable: **only then** follow `.agents/skills/{skill}/SKILL.md` in-session (or generic subagent whose **only** instruction = that skill).

## Child phases (always spawn)

Parent face (`ns-spec-driven`, handoff, orchestrator, autonomous, gitlab) needs these phases: **MUST** dispatch bridge when available. Not in-session parent continuation.

| Phase | Bridge | Mapped skill |
| ----- | ------ | ------------ |
| Tasks (Medium+ task files) | `task-writer-agent` | `ns-spec-driven` → `references/task-generator.md` |
| Execute / Quick implement | `coder-agent` | `ns-coder` |
| Review gate / Close review | `reviewer-agent` | `ns-reviewer` |

Clarify / Specify / Consistency / Partition: no v1 bridge — in-session OK.

## Dispatch rules

1. Bridge **available**: **MUST** dispatch for its child phase. Inline `Skill(ns-*)` / bare follow while bridge present = **forbidden**.
2. **Do not** paraphrase skill into custom persona.
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in dispatch message; bridge boots then skill.
4. **In-session exception:** user already invoked **that same** skill/bridge as session face (e.g. `/ns-coder`, `/task-writer-agent`). Continue face. Does **not** apply when parent is `ns-spec-driven` (or handoff/orchestrator/autonomous/gitlab) + phase is **child** above.

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicit) |
| ------- | --------------------------------- |
| `coder-agent`, `reviewer-agent`, `task-writer-agent` | Cursor Task personas: `senior-tech-lead-reviewer`, `bugbot`, `security-review` |
| Direct skill when bridge **missing** | Inline `Skill` / bare follow while bridge **present** |
| | Improvised "act as reviewer" without `ns-reviewer` |

`reviewer-agent` = required review-gate vehicle when present — loads `ns-reviewer`.

## Callers

Cite when dispatching:

- `ns-spec-driven` (Tasks / Execute / Quick / Close / partitioned)
- `../ns-coder/references/run-implementation.md`
- `ns-autonomous` (C2 + review gate)
- `ns-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 4)
- `../ns-reviewer/references/review-gate-workflow.md`
