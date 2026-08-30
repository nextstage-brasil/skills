# Harness project subagent dispatch

**Mandatory:** follow the **mapped skill** (workflow SoT). **Not mandatory:** Task `subagent_type`, named bridge, or adapter YAML `model` — those may be **set** or **inherited**.

Vehicle (named bridge, `inherit`, platform `coder` / `reviewer` / `generalPurpose`, in-session) is a delivery choice. Skipping the skill and running the platform persona’s default process is **forbidden**.

Named bridges bind `model` / `readonly` when you use them. Session boot at cold start per `session-boot.md` (obey `AGENTS.md` in context — no tool-Read; then rules), then skill. Worker owns boot — parent must **not** instruct per-task `AGENTS.md` re-read.

## Bridges (v1)

Optional vehicles. Same mapped skill whether the child is this `{name}` or inherit.

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

Unavailable: follow `.agents/skills/{skill}/SKILL.md` in-session (or any subagent whose **instruction** is that skill). Available: still **MAY** inherit / other Task type — **MUST** still load that skill.

## Child phases (always run mapped skill)

Parent face (`ns-spec-driven`, handoff, orchestrator, autonomous, gitlab) **MUST** run the mapped skill for these phases — not a paraphrased or platform-default workflow. Spawn vs inherit vs in-session = optional (in-session exception below).

| Phase | Mapped skill | Optional bridge |
| ----- | ------------ | --------------- |
| Tasks (Medium+ task files) | `ns-spec-driven` → `references/task-generator.md` | `task-writer-agent` |
| Execute / Quick implement | `ns-coder` | `coder-agent` |
| Review gate / Close review | `ns-reviewer` | `reviewer-agent` |

Clarify / Specify / Consistency / Partition: no v1 bridge — in-session OK.

## Dispatch rules

1. Child phase: **MUST** follow the mapped skill (read `SKILL.md` / named reference). Platform Task default for `coder` / `reviewer` **without** that skill = **forbidden**.
2. **Do not** paraphrase the skill into a custom persona that skips the file.
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in the dispatch message; worker boots then skill.
4. **In-session exception:** user already invoked **that same** skill/bridge as session face (e.g. `/ns-coder`, `/task-writer-agent`). Continue face. Does **not** apply when parent is `ns-spec-driven` (or handoff/orchestrator/autonomous/gitlab) + phase is **child** above — still run the mapped skill (vehicle optional).
5. **Model:** adapter YAML `model` applies **only** when the named bridge is the vehicle. `inherit` / omitted Task model is **allowed**. Do not stop the run solely because the platform cannot bind `{name}`.
6. Dispatch prompt for inherit / `coder` / `reviewer` / `generalPurpose`: first instruction = load and follow the mapped skill (and boot). Empty or “just implement/review” = forbidden.

## Cursor Task tool

`subagent_type` `coder` / `reviewer` are platform labels. They are valid **vehicles** only if the prompt binds the mapped skill. They are not a substitute for `ns-coder` / `ns-reviewer`.

| Do | Do not |
| -- | ------ |
| Any type or `inherit`, with prompt = mapped skill | Run Cursor’s built-in coder/reviewer process and skip the skill |
| Named `{name}` when you want YAML `model` | Treat missing `{name}` in the Task enum as a hard stop |
| | `senior-tech-lead-reviewer` / `bugbot` / `security-review` as the review **gate** unless the human asked this run |

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicit) |
| ------- | --------------------------------- |
| Named `{name}` **or** inherit / `coder` / `reviewer` / `generalPurpose` **if** instruction = mapped skill | Platform persona workflow **instead of** the skill |
| Direct skill in-session (face or fallback) | Improvised “act as reviewer/coder” without `ns-reviewer` / `ns-coder` |
| Human `/{name}` or `/ns-*` | Official review gate via `bugbot` / `security-review` / `senior-tech-lead-reviewer` |

Review gate = `ns-reviewer` (any vehicle). `reviewer-agent` is optional binding.

## Callers

Cite when dispatching:

- `ns-spec-driven` (Tasks / Execute / Quick / Close / partitioned)
- `../ns-coder/references/run-implementation.md`
- `ns-autonomous` (C2 + review gate)
- `ns-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 4)
- `../ns-reviewer/references/review-gate-workflow.md`
