# Harness project subagent dispatch

Skill must **spawn separate agent** (Cursor/Claude project agent, Task tool, `/name`): **MUST** use harness **thin bridge** if available. Bare skill call / invented persona = forbidden while bridge exists.

Skills = **workflow source of truth**. Bridges bind `model` / `readonly`, begin Session boot at cold start (`AGENTS.md` + rules), then skill (skill finishes remaining harness-discovery steps). Worker owns that boot — parent must **not** instruct per-task `AGENTS.md` re-read.

## Bridges (v1)

| Project agent | Skill | Typical use |
| ------------- | ----- | ----------- |
| `coder-agent` | `ns-code-coder` | Implement task / slice / ad-hoc unit |
| `reviewer-agent` | `ns-code-reviewer` | Review gate (readonly) |
| `task-writer-agent` | `ns-sdd-task-generator` | Write SDD task files during planning |

Defaults/seeding: `rules-sync.md` Default subagents. Project owns `model` in `.nextstage-harness/manifest.json` `subagents`.

## Presence check

Bridge **available** when **any** of:

1. `.cursor/agents/{name}.md` exists, or
2. `.claude/agents/{name}.md` exists, or
3. `manifest.json` `subagents[]` has `{ "name": "{name}" }` and `.agents/skills/{skill}/` installed

Unavailable: **only then** read/follow `.agents/skills/{skill}/SKILL.md` in current session (or generic subagent whose **only** instruction = that skill).

## Child phases (always spawn)

Parent face (`ns-spec-driven`, handoff, orchestrator, autonomous, gitlab) needs these phases: **MUST** dispatch bridge when available. Not in-session continuation of parent.

| Phase | Bridge | Mapped skill |
| ----- | ------ | ------------ |
| Tasks (Medium+ task files) | `task-writer-agent` | `ns-sdd-task-generator` |
| Execute / Quick implement | `coder-agent` | `ns-code-coder` |
| Review gate / Close review | `reviewer-agent` | `ns-code-reviewer` |

Clarify / Specify / Consistency / Partition: no v1 bridge — in-session worker skill OK.

## Dispatch rules

1. Bridge **available**: **MUST** dispatch that bridge for its child phase. Inline `Skill(ns-*)` / bare in-session follow of mapped skill = **forbidden**.
2. **Do not** paraphrase skill into custom persona. Bridge body already points at skill.
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in dispatch message; bridge begins Session boot at cold start then skill.
4. **In-session exception:** only when user already invoked **that same** skill/bridge as session face (e.g. `/ns-code-coder`, `/task-writer-agent`). Continue that face — do not bounce to bridge. Does **not** apply when parent is `ns-spec-driven` (or handoff/orchestrator/autonomous/gitlab) and phase is a **child** in table above.

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicitly requests) |
| ------- | ---------------------------------------------- |
| `coder-agent`, `reviewer-agent`, `task-writer-agent` | Cursor Task personas: `senior-tech-lead-reviewer`, `bugbot`, `security-review` |
| Direct skill read when bridge **missing** | Inline `Skill` / bare follow of mapped skill while bridge **present** |
| | Improvised "act as reviewer" without `ns-code-reviewer` |

`reviewer-agent` = required review-gate vehicle when present — loads `ns-code-reviewer`; not substitute for that skill.

## Callers

Cite this file when dispatching workers:

- `ns-spec-driven` (Tasks / Execute / Quick / Close)
- `ns-sdd-execution-handoff-generator` (`run-implementation.md`)
- `ns-execution-orchestrator` (slice worker + closure review)
- `ns-code-autonomous` (C2 units + review gate)
- `ns-code-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 4)
- `review-gate-workflow.md`
