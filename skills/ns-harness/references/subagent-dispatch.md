# Harness project subagent dispatch

Skill must **spawn** the harness **thin bridge** when available. Bare skill / invented persona = forbidden while bridge exists.

**Spawn vehicle (Cursor):** project agent whose **`name` equals** `manifest.json` `subagents[].name` — file `.cursor/agents/{name}.md` (slash `/{name}`). That YAML `model:` is the bound model.

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

Parent face (`ns-spec-driven`, handoff, orchestrator, autonomous, gitlab) needs these phases: **MUST** dispatch **named bridge** when available. Not in-session parent continuation.

| Phase | Bridge | Mapped skill |
| ----- | ------ | ------------ |
| Tasks (Medium+ task files) | `task-writer-agent` | `ns-spec-driven` → `references/task-generator.md` |
| Execute / Quick implement | `coder-agent` | `ns-coder` |
| Review gate / Close review | `reviewer-agent` | `ns-reviewer` |

Clarify / Specify / Consistency / Partition: no v1 bridge — in-session OK.

## Dispatch rules

1. Bridge **available**: **MUST** dispatch that `{name}` for its child phase. Inline `Skill(ns-*)` / bare follow while bridge present = **forbidden**.
2. **Do not** paraphrase skill into custom persona.
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in dispatch message; bridge boots then skill.
4. **In-session exception:** user already invoked **that same** skill/bridge as session face (e.g. `/ns-coder`, `/task-writer-agent`). Continue face. Does **not** apply when parent is `ns-spec-driven` (or handoff/orchestrator/autonomous/gitlab) + phase is **child** above.
5. **Model:** child **MUST** run the adapter frontmatter `model` (from manifest). Parent session model is **not** the worker model.
6. Platform cannot spawn `{name}` (only `inherit` / `coder` / `generalPurpose` / other persona): **stop**. Tell human invoke `/{name}`. Do **not** spawn inherit-as-bridge.

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicit) |
| ------- | --------------------------------- |
| Exact `{name}`: `coder-agent`, `reviewer-agent`, `task-writer-agent` | Cursor Task personas: `senior-tech-lead-reviewer`, `bugbot`, `security-review` |
| Direct skill when bridge **missing** | Inline `Skill` / bare follow while bridge **present** |
| Human `/{name}` when parent cannot bind model | Child Task with `model: inherit` (or omit model so child = parent) |
| | `coder` / `generalPurpose` / `explore` as stand-in for a named bridge |
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
