# Harness project subagent dispatch

Harness **thin bridges** exist for optional isolation. Skills do **not** spawn them by default — only on explicit user request (see **Default: one session**).

**Spawn vehicle (Cursor):** project agent whose **`name` equals** `manifest.json` `subagents[].name` — file `.cursor/agents/{name}.md` (slash `/{name}`). That YAML `model:` is bound model.

Skills = **workflow SoT**. Bridges bind `model` / `readonly`, Session boot at cold start per `session-boot.md` (obey `AGENTS.md` in context — no tool-Read; then rules), then skill. Worker owns boot — parent **MUST NOT** instruct per-task `AGENTS.md` re-read.

## Bridges (v1)

| Project agent | Skill | Typical use |
| ------------- | ----- | ----------- |
| `coder-agent` | `ns-coder` | Implement task / slice / ad-hoc (heavy execute) |
| `reviewer-agent` | `ns-reviewer` | Review gate (readonly) |
| `task-writer-agent` | `ns-spec-driven` (`references/task-generator.md`) | SDD task files |

Defaults: `rules-sync.md` Default subagents. Project owns `model` in `.nextstage-harness/manifest.json` `subagents`.

## Default: one session

**Default = everything runs in the current session.** No subagent, no bridge spawn — for Tasks, Execute, Review, Close alike. Reason: each spawned worker re-pays cold start (boot, rules, `source/`, cards) in a fresh context, so N workers cost more tokens than one session that keeps context. Context management (auto-compaction, `/clear`, new chat) is the **host harness's job** (Claude Code, Cursor, …); skills never simulate it with subagents.

**Spawn only when the user explicitly asks** (e.g. "use a subagent", "run `/reviewer-agent`", "parallel workers", Gate 4 `parallel`). Approval for one spawn does not extend to later phases. When spawning on request, say once that it trades tokens for isolation/speed.

## Spawn gate

Callers cite this table — no second table.

| Phase | Default | Only on explicit user request |
| ----- | ------- | ----------------------------- |
| Tasks (task files) | Parent follows `task-generator.md` in-session | `task-writer-agent` |
| Execute (any size, SDD or not) | Parent follows `ns-coder` in-session | `coder-agent` (e.g. Gate 4 `parallel`) |
| Review / Close | Parent follows `ns-reviewer` in-session | `reviewer-agent` |

Clarify / Specify / Consistency / Partition: always in-session.

**Judge:** no `judge-agent`. After `Code Review: Approved`, parent reads `ns-judge/SKILL.md` in-session.

### In-session rules

- **State lives on disk** (`execution-handoff.md`, `delivery-units.md`, roadmap, git). Update as each task completes so a host compaction/restart resumes from files.
- Do not re-read rules, `AGENTS.md`, or full `source/` per batch; read only the task card and cited anchors.
- **Review independence:** in-session review must be **read-only and diff-grounded** — judge the diff against `AGENTS.md` + rules + cited contracts, not against your own implementation notes. Do not fix inside the review step; apply the `Rejected` map afterward per `review-gate-workflow.md`.
- Engine `C2` / SDD handoff batches = implement only — **no** per-unit / per-batch review. One review at closure (G Phase 4, A standalone step 5, `run-implementation` Step 5). Ad-hoc `/ns-coder` = one review after diff.
- `ns-execution-gitlab-issue` external Phase 2: single-unit (≤5 files / one-paragraph AC) → follow `ns-coder` in the worktree, skip `ns-autonomous`; multi-unit → `ns-autonomous` Engine (`../ns-autonomous/references/planning-decision.md`), units executed sequentially in-session.

## Dispatch rules (when the user did ask for a spawn)

1. Spawn the project agent whose `name` equals the bridge (exact). Presence: `.cursor/agents/{name}.md`, `.claude/agents/{name}.md`, or `manifest.json` `subagents[]` + `.agents/skills/{skill}/` installed.
2. **Do not** paraphrase skill into a custom persona; **do not** use Task `inherit` / `coder` / `reviewer` / `generalPurpose` as stand-in; no Cursor Task personas (`senior-tech-lead-reviewer`, `bugbot`, `security-review`).
3. Pass task context (paths, `ISSUE_URL`, unit scope, mode) in the dispatch message; bridge boots then skill. Child runs adapter `model` from manifest.
4. Platform cannot spawn `{name}`: tell the human to invoke `/{name}`; do not spawn inherit-as-bridge.
5. Parallel units: only Gate 4 `parallel` + `A ∥ B` + `max_parallel_units`.

## Callers

Cite this gate (default in-session):

- `ns-spec-driven` (Tasks / Execute / Quick / Close / partitioned)
- `../ns-coder/references/run-implementation.md`
- `ns-autonomous` (C2 + review gate)
- `ns-coder` (review loop)
- `ns-execution-gitlab-issue` (Phase 2 / Phase 4)
- `../ns-reviewer/references/review-gate-workflow.md`
- `../ns-judge/SKILL.md`
