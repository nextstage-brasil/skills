---
name: ns-spec-driven
description: '(NS) Spec-driven delivery face — clarify, requirements, tasks (including unit/e2e test tasks), implement, resume or continue a version from disk artifacts. Entry priority 2: feature specs, version work, multi-day scope, or "continue" / "resume version" when partial artifacts exist under docs/versions/. Auto-sizes and runs internal phases via references/. Prefer ns-coder for bare quick fixes. Do NOT use for brownfield onboarding, architecture rules, or /ns-harness prepare (manual only; never auto-run Prepare).'
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.8.4"
depends:
  - ns-harness
  - ns-coder
  - ns-autonomous
  - ns-reviewer
  - ns-living-spec
---

# NextStage Spec-Driven

**Delivery face** for spec-driven journey: intake, clarify-strict, specify, (consistency / partition), tasks, execute, close.

Completeness before fidelity, both by construction. Clarify-Strict **grill** = Gate 0 only. Confirm gates **1–4** and brownfield Step 0.4 stay. Version Clarify-Strict ≠ per-issue enricher (`ns-requirements-enricher`). `ns-project-manager` stays decoupled.

**Orchestrate** — **not** implement phase bodies inline. **Read** phase reference at delegation time. State on **disk** (`docs/versions/`, `docs/context/`, handoff files), not chat history.

Entry priority **2** (feature / version / SDD / multi-day / resume). Harness table: `../../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`. Bare quick fix, no SDD context → redirect `ns-coder` (priority 5) unless user explicitly invoked this skill.

## Routing (read first)

| Handoff                        | Target                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Small / quick inside SDD       | `coder-agent` → `ns-coder` (**MUST** bridge when available — `../../ns-harness/references/subagent-dispatch.md`)             |
| Version + handoff              | `references/execution-handoff.md` + `../ns-coder/references/run-implementation.md` + `coder-agent` (**MUST** when available) |
| Task file generation           | **MUST** spawn project agent `task-writer-agent` (exact name; adapter `model`) → `references/task-generator.md`. **FORBIDDEN** Task `inherit` / `coder` / `generalPurpose` (`../../ns-harness/references/subagent-dispatch.md`) |
| Bare quick fix, no SDD context | Redirect `ns-coder` (priority 5) — if spawning worker: **MUST** `coder-agent` when available                                 |

## Harness

See `../../ns-harness/references/session-boot.md`, `../../ns-harness/references/artifact-layout.md`, `references/gates.md`.

| Variable        | Resolve via                                          |
| --------------- | ---------------------------------------------------- |
| `{version_san}` | User scope or existing folder under `docs/versions/` |

## Out of band (not this skill)

**Brownfield onboarding** manual — never auto-run, never pipeline phase:

| Need                              | Skill                                                                      |
| --------------------------------- | -------------------------------------------------------------------------- |
| Full prepare after `harness init` | `/ns-harness prepare this repo` or `npx @nextstage-brasil/harness prepare` |
| Per-issue GitLab grill-me         | `/ns-requirements-enricher` — not version Clarify-Strict                   |

`architecture-rules.md` still stub or `docs/context/brownfield-map.md` missing and task needs them: **tell user run `/ns-harness prepare this repo`**, then stop — or continue SDD **only if they insist** after warning.

## Journey (delivery only)

```mermaid
flowchart LR
  user[User request]
  size[Auto-size]
  intake[Intake]
  clarify[Clarify-Strict]
  specify[Specify]
  consist[Consistency]
  part[Partition]
  tasks[Tasks]
  units[Delivery units]
  handoff[Handoff]
  exec[Execute]
  close[Close]
  quick[Quick mode]

  user --> size
  size -->|Small| quick
  size -->|Medium+| intake
  intake --> clarify
  clarify --> specify
  specify --> consist
  specify --> part
  specify --> tasks
  tasks --> handoff
  tasks -.->|Gate 4 opt-in| units
  units --> handoff
  handoff --> exec
  quick --> exec
  exec --> close
```

| Phase       | When                         | Reference                                                                                                                                                                            |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Intake      | Dense / pasted source        | `references/source-registry.md` — persist `source/{slug}.md`, anchors, classify                                                                                                       |
| Clarify     | Medium+ mandatory            | `references/clarify-requirements.md` then `references/clarify-strict.md`: checklist, D1–D3, Gate 0 (in-session)                                                                      |
| Specify     | Always for Medium+           | `references/requirements-generator.md` — also writes `ui-contract.md` when `ui-screen` in source (in-session — no v1 bridge)                                                                 |
| Consistency | Before tasks (Large+)        | `references/analyze-consistency.md` (in-session — no v1 bridge)                                                                                                                      |
| Partition   | Multi-slice versions         | `references/version-partitioner.md` (in-session — no v1 bridge)                                                                                                                      |
| Tasks       | Medium+ formal tasks         | **MUST** spawn `task-writer-agent` by exact name (adapter `model`; no Task `inherit`) → `task-generator.md` then unit/e2e generators |
| Delivery units | After all tasks (optional) | Gate 4 when GitLab possible; `references/delivery-units.md` only when publish, parallel, or resume file |
| Handoff     | After tasks (or Gate 4 when run) | `references/execution-handoff.md` |
| Execute     | Always                       | See execute routing below                                                                                                                                                            |
| Close       | After delivery               | `reviewer-agent` → `ns-reviewer` (**MUST** when available); `ns-living-spec` after `Approved` only (`../ns-reviewer/references/review-gate-workflow.md`) |
| Quick       | ≤3 files, one-sentence scope | `coder-agent` → `ns-coder` (**MUST** when available)                                                                                                                                 |

Details: `references/auto-sizing.md`, `references/router.md`.

## Boot (mandatory, once per session)

1. Classify request → **Small / Medium / Large** (`references/auto-sizing.md`). Dense source (contract/schema tables or ~8+ sections) → Large min.
2. **Source detection:** list `docs/versions/{version_san}/source/` and user-pasted specs → Intake (`source-registry.md`) before Clarify.
3. Check **resume** signals (`execution-handoff.md`, `version-roadmap.md`, partial version, open unknowns) → `references/session-continuity.md`.
4. **Agent runtime gate** — agent-api / intelligent SaaS (`references/agent-runtime-integration.md`): **MUST** load `ns-langgraph-agents` in session before any phase; **stop** if skill not installed.
5. Scan installed complements (soft) → `references/skill-integrations.md`.
6. Confirm **once** when needed: target version id, language for markdown artifacts — **natural chat** (`references/human-communication.md`). Never open with telegraphic status dump or phase jargon.

## Human communication

Chat short, natural language. **Read `references/human-communication.md` before any human gate or boot confirm.**

- Name next **deliverable** ("requirements document", "task files") — not internal phases ("Specify", "Clarify").
- Chat stand alone: highlights in plain language; document IDs only after meaning (**Gate 1 highlights** in that file). Gate 0: **numbered** asks (`1.` `2.` …); human may reply by number **or** `Tudo sim` / `all yes` on remaining yes/no confirms (not open questions). Behavior (when, HTTP, copy) — never product error codes (`FPA*`) for the human to recall.
- Never use `Reply:`, `Premise:`, or "go for Specify".
- Caveman / artifact-compress = **files only** — never chat.

## Orchestration mandate

- **Delegate** = spawn bridge when available (else read phase reference in-session). Not "skip reference" while bridge present. See `../../ns-harness/references/subagent-dispatch.md`.
- **Read** phase reference before that phase — never improvise from memory.
- **Do not** ask "continue to next phase?" between phases in same sized pipeline.
- **Do not** invoke `/ns-harness prepare` or brownfield prepare references.
- **Do not** load multiple version specs into context — see `references/context-budget.md`.
- After each phase, verify expected artifact paths exist before advancing.

## Auto-size summary

| Size       | Pipeline                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **Small**  | `coder-agent` → `ns-coder` (quick mode — `references/quick-mode.md`)                                            |
| **Medium** | Intake (if source) → Clarify-Strict → Specify → Tasks (**MUST** spawn `task-writer-agent` exact name) → optional Gate 4 + units → handoff → Execute → Close |
| **Large**  | Full chain including Consistency and/or Partition when scope warrants                                           |

**Safety valve:** scope exceeds ~3 files or explodes mid-session → stop, formalize via Medium+ pipeline (requirements + tasks).

## Execute routing

Worker dispatch: **MUST** use harness project agents when available — `../../ns-harness/references/subagent-dispatch.md`. Inline mapped skill while bridge present = forbidden.

| Context                                    | Worker                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ad-hoc / quick / single task               | `coder-agent` → `ns-coder` (**MUST** bridge when available)                                                                                                                                                                                                                                                           |
| Version with `delivery-units.md`           | Dispatch **by unit** (wave order); parallel only if Gate 4 parallel + `A ∥ B`. GitLab: `delivery-units.md` **GitLab status/spent (SSoT)**. Published + G present → `ns-execution-gitlab-issue` SDD unit mode; else local unit batches in `run-implementation.md` |
| Version with `execution-handoff.md` only (no units file) | `../ns-coder/references/run-implementation.md` — classic **batched** dispatch (same-layer consecutive `pending`, prefer 4–7, hard max 7; size 1 = single task) + `coder-agent` (**MUST** when available) / `ns-coder` or `ns-autonomous`; handoff rows stay per task; Progress **Next task** = first id of next batch |
| Partitioned version (`version-roadmap.md`) | `references/orchestrator.md` — **by unit** when `delivery-units.md` exists (commit/MR per unit); else slice workers via `coder-agent` (**MUST** when available) |
| External GitLab `ISSUE_URL` + MCP available           | `ns-execution-gitlab-issue` (priority 1 — not SDD unit mode)                                                                                                                                                                                                                                                       |
| Autonomous multi-step local plan           | `ns-autonomous`                                                                                                                                                                                                                                                                                                       |

**Face = orchestrator** (`ns-spec-driven`); does not implement — drives `run-implementation.md` (classic) or `orchestrator.md` (units when `delivery-units.md`; else slices).

**Tests while executing version tasks:** unit/integration only. **Forbidden** for agents to run E2E during task/batch loop; human runs E2E at version end (`../ns-coder/references/run-implementation.md`).

## Trigger → reference

| User says                                              | Read first                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| "specify", "requirements for vX"                       | `references/router.md` → `requirements-generator.md`                              |
| "clarify", vague scope, reopen clarification           | `references/router.md` → `clarify-strict.md` via `clarify-requirements.md`        |
| Intake / persist source / coverage                     | `references/source-registry.md` + `references/spec-coverage.md`                   |
| "implement", "build version", tasks exist              | `references/session-continuity.md` + Execute                                      |
| "quick fix", "just change X"                           | `references/quick-mode.md`                                                        |
| "resume", "continue version", partial `docs/versions/` | `references/session-continuity.md`                                                |
| "orchestrate slices", partitioned roadmap              | `references/orchestrator.md`                                                      |
| UI / design work (no Layout SSoT for screen) | `references/skill-integrations.md` → `ns-frontend-design` |
| UI with Layout SSoT registered (`role: ui-layout`, cited `*-visual.md`) | `ns-coder` Complement delegation — read SSoT; skip `ns-frontend-design` |
| README / docs                                          | `references/skill-integrations.md` → `ns-docs-writer`                             |
| security headers / modernize                           | `references/skill-integrations.md` → `ns-best-practices`                          |
| agent-api / intelligent SaaS / LangGraph scope         | `references/agent-runtime-integration.md` → `ns-langgraph-agents` (**mandatory**) |
| MR / PR review                                         | `ns-reviewer` directly (not this face)                                            |

## Agent runtime (mandatory when detected)

Non-negotiable for agent-api and intelligent SaaS products. See `references/agent-runtime-integration.md`. Greenfield with no `agent-api/`: Feature 001 = langgraph bootstrap, then version deltas.

## Complement integrations

`spec-driven` / `gitlab` / `agents` ship `ns-frontend-design`, `ns-docs-writer`, and `ns-best-practices` via `ns-coder` `depends`. Check `.agents/skills/` once per session; if present → **delegate** (`references/skill-integrations.md`). If absent (minimal install) → continue and recommend install once per session (agent runtime **not** optional — see above):

```bash
npx @nextstage-brasil/harness --skill ns-frontend-design --skill ns-docs-writer --skill ns-best-practices --no-scaffold -y
```

## Completion summary

When version or quick fix closes, report:

1. Artifacts written or updated (paths).
2. Handoff status if applicable.
3. Suggested next step (living spec done → next version clarify; quick fix → optional review).

## Forbidden

- Auto-run or chain `/ns-harness prepare`.
- List Prepare as SDD phase.
- Hard-require complement skills when missing from `.agents/skills/` (delegate when present; see **Complement integrations**).
- Plan or execute agent-api / intelligent SaaS work without loading `ns-langgraph-agents` when detection signals match.
- Generate requirements/tasks yourself without reading phase references / delegating task files via `task-writer-agent`.
- Skip `execution-handoff.md` when formal tasks exist for version.
- Skip `delivery-units.md` + Gate 4 when human chose publish or parallel.
- Generate `delivery-units.md` on default local sequential path (no GitLab capability, no human ask).
- Create GitLab issue per `task-NNN` or one issue for whole version.
- Parallel unit execution without `A ∥ B` or without Gate 4 parallel choice.
- Address human with internal phase names ("Specify", "Clarify") or bot chrome (`Reply:`, `Premise:`).
- Specify with open critical unknown (no `skip clarify` waiver).
- Silent assumption from unanswered critical.
- Edit `docs/versions/{version_san}/source/` after Gate 1.
- Task cards for unmapped mappable source sections.
- UI implementation task without `ui-contract.md` when UI in scope.

## Invocation examples

```
/ns-spec-driven
```

```
Specify and implement user notifications for version 2.1
```

```
Quick fix: add nullable email field to the signup form
```

```
Resume implementation — handoff exists for docs/versions/1.0.0/
```

```
Continue partitioned version 3.8.0 — run pending slices from version-roadmap.md
```
