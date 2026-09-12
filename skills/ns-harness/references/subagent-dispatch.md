# Harness project subagent dispatch

Skill spawns harness **thin bridge** when **spawn gate** says so. Bare skill / invented persona = forbidden while bridge present **and** gate requires spawn.

**Spawn vehicle (Cursor):** project agent whose **`name` equals** `manifest.json` `subagents[].name` — file `.cursor/agents/{name}.md` (slash `/{name}`). That YAML `model:` is bound model.

Skills = **workflow SoT**. Bridges bind `model` / `readonly`, Session boot at cold start per `session-boot.md` (obey `AGENTS.md` in context — no tool-Read; then rules), then skill. Worker owns boot — parent **MUST NOT** instruct per-task `AGENTS.md` re-read.

## Bridges (v1)

| Project agent | Skill | Typical use |
| ------------- | ----- | ----------- |
| `coder-agent` | `ns-coder` | Implement task / slice / ad-hoc (heavy execute) |
| `reviewer-agent` | `ns-reviewer` | Review gate (readonly) |
| `task-writer-agent` | `ns-spec-driven` (`references/task-generator.md`) | SDD task files |

Defaults: `rules-sync.md` Default subagents. Project owns `model` in `.nextstage-harness/manifest.json` `subagents`.

## Presence check

Bridge **available** if **any**:

1. `.cursor/agents/{name}.md`, or
2. `.claude/agents/{name}.md`, or
3. `manifest.json` `subagents[]` has `{ "name": "{name}" }` + `.agents/skills/{skill}/` installed

Unavailable: follow `.agents/skills/{skill}/SKILL.md` in-session (or generic subagent whose **only** instruction = that skill).

## Spawn gate

Parent face (`ns-spec-driven`, handoff, orchestrator, autonomous, gitlab) picks phase. Gate decides spawn vs in-session. Callers cite this table — no second table.

| Phase | Spawn | Else |
| ----- | ----- | ---- |
| Review / Close | **MUST** `reviewer-agent` when available | `ns-reviewer` in-session if bridge missing |
| Tasks (Medium+ task files) | **MUST** `task-writer-agent` when available | `task-generator.md` in-session if bridge missing |
| Execute **cheap** | **MUST NOT** spawn `coder-agent` | Parent follows `ns-coder` in-session |
| Execute **heavy** | **MUST** `coder-agent` when available | `ns-coder` if bridge missing |

Clarify / Specify / Consistency / Partition: no v1 bridge — in-session OK.

**Delivery judge (v1):** no `judge-agent`. After `reviewer-agent` returns `Code Review: Approved`, **parent** reads `ns-judge/SKILL.md` in-session. Human `/ns-judge` only as session face. Reviewer **MUST NOT** dispatch judge.

### Cheap vs heavy execute

**Cheap** (all must hold): one-sentence scope, ≤3 files expected, no `execution-handoff.md`, not GitLab lifecycle / not unit worktree. Host priority **5** ad-hoc and `ns-spec-driven` Quick.

**Heavy:** `run-implementation` batch, orchestrator unit/slice, G Phase 2 coding in worktree, A with **≥2** work units.

**Handoff size:** classic batch prefer **4–7**, hard **max 7**, same layer. **MUST NOT** split to size-1 to skip spawn. Unit-scoped batch = whole unit.

### Review once per closure

Engine `C2` / SDD handoff batches = implement only — **no** per-unit / per-batch `reviewer-agent`. Parent owns one review at closure (G Phase 4, A standalone step 5, `run-implementation` Step 5). Ad-hoc `/ns-coder` = one review after diff.

### Engine skip (G → A)

`ns-execution-gitlab-issue` external Phase 2: invoke `ns-autonomous` Engine **only if** planning-depth would be multi-unit (`../ns-autonomous/references/planning-decision.md` Requirements+tasks path). Single-unit heuristic (≤5 files / one-paragraph AC) → **skip A**; **MUST** `coder-agent` in existing worktree (or `ns-coder` if bridge missing). Cite `planning-decision.md` — no third heuristic.

A already running with **1** unit: follow `ns-coder` in A session (worktree); **MUST NOT** extra `coder-agent` spawn. A with **≥2** units: **MUST** `coder-agent` per unit.

## Dispatch rules

1. Bridge **available** **and** spawn gate **requires** spawn: **MUST** dispatch that `{name}`. Inline `Skill(ns-*)` / bare follow while bridge present **and** gate requires spawn = **forbidden**.
2. Spawn gate says **MUST NOT** spawn: follow mapped skill in-session even if bridge present. Still **FORBIDDEN** invent persona / platform `coder`/`reviewer` stand-in.
3. **Do not** paraphrase skill into custom persona.
4. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in dispatch message; bridge boots then skill.
5. **In-session exception:** user already invoked **that same** skill/bridge as session face (e.g. `/ns-coder`, `/task-writer-agent`). Continue face. **Cheap execute** also applies under `ns-spec-driven` Quick (parent S + cheap child = in-session `ns-coder`). Heavy child under S/handoff/orchestrator/autonomous/gitlab still **MUST** spawn when bridge available.
6. **Model:** child **MUST** run adapter frontmatter `model` (from manifest). Parent session model is **not** worker model.
7. Platform cannot spawn `{name}` (only `inherit` / `coder` / `reviewer` / `generalPurpose` / other persona): **stop**. Tell human invoke `/{name}`. Do **not** spawn inherit-as-bridge.

## Allowed vs forbidden

| Allowed | Forbidden (unless human explicit) |
| ------- | --------------------------------- |
| Exact `{name}` when gate requires spawn | Cursor Task personas: `senior-tech-lead-reviewer`, `bugbot`, `security-review` |
| In-session mapped skill when gate says cheap / bridge missing | Inline `Skill` / bare follow while bridge present **and** gate requires spawn |
| Human `/{name}` when parent cannot bind model | Child Task with `model: inherit` (or omit model so child = parent) |
| | `coder` / `reviewer` / `generalPurpose` / `explore` as stand-in for named bridge |
| | Improvised "act as reviewer" without `ns-reviewer` |
| | Spawn `coder-agent` for cheap execute |

`reviewer-agent` = required review-gate vehicle when present — loads `ns-reviewer`.

## Callers

Cite when dispatching:

- `ns-spec-driven` (Tasks / Execute / Quick / Close / partitioned)
- `../ns-coder/references/run-implementation.md`
- `ns-autonomous` (C2 + review gate)
- `ns-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 2 / Phase 4)
- `../ns-reviewer/references/review-gate-workflow.md`
- `../ns-judge/SKILL.md`
