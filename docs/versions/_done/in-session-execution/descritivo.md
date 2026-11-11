# In-session execution — single-session SDD and Claude Code readiness

**Repository:** `nextstage-brasil/skills`
**Baseline:** harness `v1.20.0`
**Status:** closed — implemented in working tree, pending release

---

## Problem

`ns-spec-driven` (and every skill it hands off to) spawned subagents by default — `task-writer-agent` for task files, one `coder-agent` per batch / unit / slice, `reviewer-agent` for review. Each spawn starts a fresh context and re-pays cold start (session boot, rules, `source/`, task cards). Speed gained from isolation was outweighed by token cost, and context management is now a job of the local host harness (Claude Code, Cursor, …), not of the skills.

## Decision

**Default = everything runs in the current session.** Tasks, Execute and Review all run inline. A subagent is spawned **only when the user explicitly asks** (including Gate 4 `parallel`). Approval for one spawn does not extend to later phases.

Single source of truth: `skills/ns-harness/references/subagent-dispatch.md` → **Default: one session** + **Spawn gate** (table: default in-session, `*-agent` only on explicit request). Every caller cites it; no second table.

## Changes

### 1. Spawn gate rewritten (all skills)

| Phase | Before | Now |
| ----- | ------ | --- |
| Tasks | **MUST** `task-writer-agent` | in-session `task-generator.md` |
| Execute (heavy) | **MUST** `coder-agent` | in-session `ns-coder` |
| Review / Close | **MUST** `reviewer-agent` | in-session `ns-reviewer` (then `ns-judge`) |

Applied to: `ns-spec-driven`, `ns-coder`, `ns-reviewer`, `ns-autonomous` (any unit count runs sequentially in the A session), `ns-execution-gitlab-issue` (external single-unit too), `ns-harness` routing, and the generated consumer `AGENTS.md` (`generateAgentsMd.js`). Harness bridges (`coder-agent`, `reviewer-agent`, `task-writer-agent`) are kept for the explicit-request path.

### 2. Context handling moves to the host

- State lives on disk (`execution-handoff.md`, `delivery-units.md`, roadmap, git); rows are updated as each task finishes so a host compaction/restart resumes from files.
- New **Single-session hygiene** section in `ns-spec-driven/references/context-budget.md`: read a card once, no re-reads of finished work, grep over dumps, short reports, and a one-line note that `/compact` / `/clear` is safe at unit / wave / slice boundaries. No extra reads or steps, never blocks waiting for the user.
- Token tracking per task now comes from the session usage delta (not a worker report).

### 3. Batching removed

The classic mode no longer dispatches same-layer batches of 4–7 (that cap amortized spawn cost). Now: one task at a time in numeric order; consecutive same-layer tasks run back-to-back without reloading rules. Unit mode = tasks of the current unit, one at a time. Gate 3 shows total tasks instead of "~K batches". Slice size target (4–7) in `version-partitioner.md` is unchanged.

### 4. Test policy

Unit/integration tests run per task as project rules require. **E2E is never run by the agent unless the user explicitly asks** (previously "human-only at version end"). The orchestrator's contradictory "do not run tests during slice execution" was reconciled.

### 5. Dead code removed

Worker prompt templates in `ns-spec-driven/references/slice-dispatch.md` and `ns-autonomous/references/multi-agent-dispatch.md` replaced by short in-session scope rules plus a one-paragraph note for explicit parallel workers.

### 6. Review independence compensation

In-session review loses process isolation, so the rules require it to be **read-only and diff-grounded** (judge diff vs `AGENTS.md` + rules + contracts, not the implementer's notes; no fixes inside the review step). New eval `ns-reviewer` #14 covers this.

### 7. Claude Code readiness (this repository)

- `CLAUDE.md` → one line pointing to `@AGENTS.md`.
- Maintainer assets moved out of `.cursor/` to the tool-neutral `.agents/`:
  - `.cursor/skills/` → `.agents/skills/` (`code-routing-diagram`)
  - `.cursor/agents/` → `.agents/agents/` (`my_coder`, `my_reviewer`; invalid frontmatter fixed; `my_coder` closure reviews in-session)
  - `.cursor/rules/mcp-gitlab-usage-naming.mdc` → `.claude/rules/mcp-gitlab-usage-naming.md`
- `.claude/skills` and `.claude/agents` are symlinks to `.agents/skills` and `.agents/agents`.
- `AGENTS.md` layout section updated.

## Files touched (by area)

- `skills/ns-harness/references/` — `subagent-dispatch.md` (rewritten), `code-skill-routing.md`
- `skills/ns-spec-driven/` — `SKILL.md`, `references/` (router, orchestrator, orchestrator-closure, slice-dispatch, execution-handoff, gates, human-communication, partition-workflow, skill-integrations, delivery-units, context-budget, task-generator, quick-mode, agent-runtime-integration), `templates/execution-handoff.template.md`, `evals/`
- `skills/ns-coder/` — `SKILL.md`, `references/run-implementation*.md`, `evals/`
- `skills/ns-reviewer/` — `SKILL.md`, `references/review-gate-workflow.md`, `evals/`
- `skills/ns-autonomous/`, `skills/ns-execution-gitlab-issue/`, `skills/ns-bug-report-diagnosis/` — dispatch rows and evals
- `packages/harness/` — `src/generateAgentsMd.js`, `templates/harness-README.md`, `test/sync-smoke.mjs`
- `docs/coder-skill-routing.md` — derived routing doc kept in sync

## Validation

- `npm test` in `packages/harness` — passes
- `node packages/harness/scripts/validate-catalog.js` — catalog in sync (28 skills)
- Skill evals were rewritten to expect in-session behavior but **not executed** (no eval run yet).

## Open items

- Gate 4 `parallel` is the only remaining path that spawns workers (explicit user choice); remove it if even that opt-in is unwanted.
- Optional: run the updated `ns-spec-driven` / `ns-coder` / `ns-reviewer` evals to measure real token savings vs. the subagent flow.
- Consumer projects already installed keep old text until `npx @nextstage-brasil/harness` updates them; a harness release is needed to propagate.
- Harness still targets `.cursor/` for consumer projects; Claude Code adapters for consumers are handled by the existing `.claude/skills` sync.
