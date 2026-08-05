---
name: ns-spec-driven
description: "(NS) Spec-driven delivery face — clarify, requirements, tasks, implement or resume a version. Entry priority 2: use for feature specs, version work, or \"let's build X\" with multi-day scope; auto-sizes and delegates to workers. Prefer ns-code-coder for bare quick fixes. Do NOT use for brownfield onboarding, architecture rules, or /ns-harness-prepare (manual only; never auto-run Prepare)."
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.2"
depends:
  - ns-harness
  - ns-harness-prepare
  - ns-sdd-clarify-requirements
  - ns-sdd-requirements-generator
  - ns-sdd-analyze-consistency
  - ns-sdd-version-partitioner
  - ns-sdd-task-generator
  - ns-sdd-execution-handoff-generator
  - ns-code-coder
  - ns-code-autonomous
  - ns-execution-orchestrator
  - ns-code-reviewer
  - ns-sdd-living-spec-consolidator
  - ns-langgraph-agents
---

# NextStage Spec-Driven

**Delivery face** for the spec-driven journey: clarify → specify → (consistency / partition) → tasks → execute → close.

You **orchestrate** — you do **not** replace worker skills. Read each worker `SKILL.md` at delegation time. State lives on **disk** (`docs/versions/`, `docs/context/`, handoff files), not chat history.

Entry priority **2** (feature / version / SDD / multi-day). Harness table: `../ns-harness/references/code-skill-routing.md`. Trigger phrases: `references/entry-triggers.md`. Bare quick fixes without SDD context → redirect to `ns-code-coder` (priority 5) unless the user explicitly invoked this skill.

## Routing (read first)

| Handoff | Target |
| ------- | ------ |
| Small / quick inside SDD | `coder-agent` → `ns-code-coder` (**MUST** bridge when available — `../ns-harness/references/subagent-dispatch.md`) |
| Version + handoff | `ns-sdd-execution-handoff-generator` → `coder-agent` (**MUST** when available) / `ns-code-coder` or `ns-code-autonomous` |
| Task file generation | `task-writer-agent` → `ns-sdd-task-generator` (**MUST** bridge when available) |
| Bare quick fix, no SDD context | Redirect to `ns-code-coder` (priority 5) — if spawning worker: **MUST** `coder-agent` when available |

## Harness discovery

See `../ns-harness/references/harness-discovery.md` and `../ns-harness/references/artifact-layout.md`.

| Variable | Resolve via |
| -------- | ----------- |
| `{product_root}` | `AGENTS.md` product anchor |
| `{harness_root}` | Harness discovery |
| `{version_san}` | User scope or existing folder under `docs/versions/` |

## Out of band (not this skill)

**Brownfield onboarding** is manual — never auto-run, never a pipeline phase:

| Need | Skill |
| ---- | ----- |
| Full prepare after `harness init` | `/ns-harness-prepare` or `npx @nextstage-brasil/harness prepare` |
| Single worker only | Invoke that worker directly |

If `architecture-rules.md` is still a stub or `docs/context/brownfield-map.md` is missing and the task needs them: **tell the user to run `/ns-harness-prepare`**, then stop — or continue SDD **only if they insist** after the warning.

## Journey (delivery only)

```mermaid
flowchart LR
  user[User request]
  size[Auto-size]
  clarify[Clarify]
  specify[Specify]
  consist[Consistency]
  part[Partition]
  tasks[Tasks]
  exec[Execute]
  close[Close]
  quick[Quick mode]

  user --> size
  size -->|Small| quick
  size -->|Medium+| clarify
  clarify --> specify
  specify --> consist
  specify --> part
  specify --> tasks
  tasks --> exec
  exec --> close
  quick --> exec
```

| Phase | When | Worker |
| ----- | ---- | ------ |
| Clarify | Ambiguity / gray areas | `ns-sdd-clarify-requirements` (in-session — no v1 bridge) |
| Specify | Always for Medium+ | `ns-sdd-requirements-generator` (in-session — no v1 bridge) |
| Consistency | Before tasks (Large+) | `ns-sdd-analyze-consistency` (in-session — no v1 bridge) |
| Partition | Multi-slice versions | `ns-sdd-version-partitioner` (in-session — no v1 bridge) |
| Tasks | Medium+ formal tasks | `task-writer-agent` → `ns-sdd-task-generator` (**MUST** when available) + `ns-sdd-execution-handoff-generator` |
| Execute | Always | See execute routing below |
| Close | After delivery | `reviewer-agent` → `ns-code-reviewer` (**MUST** when available) → `ns-sdd-living-spec-consolidator` |
| Quick | ≤3 files, one-sentence scope | `coder-agent` → `ns-code-coder` (**MUST** when available) |

Details: `references/auto-sizing.md`, `references/router.md`.

## Boot (mandatory, once per session)

1. Resolve `{product_root}` and `{harness_root}`.
2. Classify request → **Small / Medium / Large** (see `references/auto-sizing.md`).
3. Check for **resume** signals (`execution-handoff.md`, partial version) → `references/session-continuity.md`.
4. **Agent runtime gate** — if agent-api / intelligent SaaS (see `references/agent-runtime-integration.md`): **MUST** load `ns-langgraph-agents` in session before any phase; **stop** if skill is not installed.
5. Scan installed complements (soft) → `references/skill-integrations.md`.
6. Confirm **once** when needed: `{product_root}`, target version id, and language for markdown artifacts — in **natural chat** (see `references/human-communication.md`). Never open with a telegraphic status dump or phase jargon.

## Human communication

Chat with the human in short, natural language. **Read `references/human-communication.md` before any human gate or boot confirm.**

- Name the next **deliverable** ("requirements document", "task files") — not internal phases ("Specify", "Clarify").
- Never use `Reply:`, `Premise:`, or "go for Specify".
- Caveman / artifact-compress applies to **files only** — never to chat.

## Orchestration mandate

- **Delegate** = spawn bridge when available (else fall back to worker `SKILL.md`). Not "load worker skill in parent session" while bridge present. See `../ns-harness/references/subagent-dispatch.md`.
- **Do not** ask "continue to next phase?" between phases in same sized pipeline.
- **Do not** invoke `ns-harness-prepare` or any brownfield prepare worker.
- **Do not** load multiple version specs into context — see `references/context-budget.md`.
- After each phase, verify expected artifact paths exist before advancing.

## Auto-size summary

| Size | Pipeline |
| ---- | -------- |
| **Small** | `coder-agent` → `ns-code-coder` (quick mode — `references/quick-mode.md`) |
| **Medium** | Clarify (if needed) → Specify → Tasks (**MUST** `task-writer-agent` when available) + handoff → Execute → Close |
| **Large** | Full chain including Consistency and/or Partition when scope warrants |

**Safety valve:** if scope exceeds ~3 files or explodes mid-session → stop and formalize via Medium+ pipeline (requirements + tasks).

## Execute routing

Worker dispatch: **MUST** use harness project agents when available — `../ns-harness/references/subagent-dispatch.md`. Inline mapped skill while bridge present = forbidden.

| Context | Worker |
| ------- | ------ |
| Ad-hoc / quick / single task | `coder-agent` → `ns-code-coder` (**MUST** bridge when available) |
| Version with `execution-handoff.md` | `ns-sdd-execution-handoff-generator` run-implementation + `coder-agent` (**MUST** when available) / `ns-code-coder` or `ns-code-autonomous` |
| Partitioned version (subversions) | `ns-execution-orchestrator` (slice workers via `coder-agent` — **MUST** when available) |
| GitLab issue URL + MCP available | `ns-execution-gitlab-issue` (soft — prefer when GitLab present) |
| Autonomous multi-step local plan | `ns-code-autonomous` |

## Trigger → reference

| User says | Read first |
| --------- | ---------- |
| "specify", "requirements for vX" | `references/router.md` → Specify |
| "clarify", vague scope | `references/router.md` → Clarify |
| "implement", "build version", tasks exist | `references/session-continuity.md` + Execute |
| "quick fix", "just change X" | `references/quick-mode.md` |
| "resume", "continue version" | `references/session-continuity.md` |
| UI / design work | `references/skill-integrations.md` → `ns-code-frontend-design` |
| README / docs | `references/skill-integrations.md` → `ns-code-docs-writer` |
| security headers / modernize | `references/skill-integrations.md` → `ns-code-best-practices` |
| agent-api / intelligent SaaS / LangGraph scope | `references/agent-runtime-integration.md` → `ns-langgraph-agents` (**mandatory**) |
| MR / PR review | `ns-code-reviewer` directly (not this face) |

## Agent runtime (mandatory when detected)

Non-negotiable for agent-api and intelligent SaaS products. See `references/agent-runtime-integration.md`.

## Soft integrations

Before relevant work, check `.agents/skills/` for complements. If present → **delegate**. If absent → continue with workers/rules and **recommend install once per session** (agent runtime is **not** soft — see above):

```bash
npx @nextstage-brasil/harness --skill ns-code-frontend-design --skill ns-code-docs-writer --skill ns-code-best-practices --no-scaffold -y
```

See `references/skill-integrations.md`.

## Completion summary

When a version or quick fix closes, report:

1. Artifacts written or updated (paths).
2. Handoff status if applicable.
3. Suggested next step (living spec done → next version clarify; quick fix → optional review).

## Forbidden

- Auto-run or chain `ns-harness-prepare`.
- List Prepare as an SDD phase.
- Hard-require soft complement skills (`ns-code-frontend-design`, etc.).
- Plan or execute agent-api / intelligent SaaS work without loading `ns-langgraph-agents` when detection signals match.
- Generate requirements/tasks yourself without delegating to PM workers.
- Skip `ns-sdd-execution-handoff-generator` when formal tasks exist for a version.
- Address the human with internal phase names ("Specify", "Clarify") or bot chrome (`Reply:`, `Premise:`).

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
