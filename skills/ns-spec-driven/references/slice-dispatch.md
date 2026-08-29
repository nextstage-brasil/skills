# Slice / unit dispatch — subagent prompt and validation

Orchestrator dispatch exactly one **synchronous (blocking)** worker:
- **`delivery-units.md` present:** one worker **per unit** (`orchestrator.md` per-unit loop).
- **Else:** one subagent **per slice**.

**MUST** use harness **`coder-agent`** when available (`../../../ns-harness/references/subagent-dispatch.md`); else generic subagent whose prompt follows `ns-coder`. Keep context small: pass only what worker needs, never whole roadmap or master requirements.

## Prompt template

Use when dispatching `coder-agent` or fallback that must load `ns-coder`:

```
Follow the `ns-coder` skill as a slice worker, invoked by the execution
orchestrator. (If you are coder-agent: Session boot once at cold start, then that skill.)

Product:     (this repo)
Version:     {version_san}
Subversion:  {subversion_san}
Active path: docs/versions/{version_san}/subversions/{subversion_san}/
Source:      docs/versions/{version_san}/source/  sections: {S…}

Before coding:
- Session boot once at slice-worker start per `session-boot.md`
  (obey `AGENTS.md` in context — no tool-Read; then local + harness rules).
  No per-task AGENTS re-read inside the slice unless local/rules changed.
  Obey orders, including any mandatory product skills named.
- Load product context from docs/context/ per the Implementation
  boot rule in ns-harness artifact-layout.md (list folder, read layer-relevant files).
- Read docs/versions/{version_san}/source/ (or listed sections {S…}) before coding.
  Mandate: open cited anchors; do not implement from memory of paraphrased contracts.

Mandate:
- Implement ALL tasks in this {slice | unit}, in order, with no confirmation between tasks.
- Do NOT commit — owner = `delivery-units.md` **Commit / MR (SSoT)** when units exist (parent local or G Phase 3). No units file: orchestrator commits once per slice.
- Do NOT run backend or frontend tests — implement only.
- Obey AGENTS.md, agents.local.md (if present), and harness rules strictly. If
  any instruction conflicts with the rules or the confirmed scope, STOP and
  report a blocker instead of proceeding by assumption.

Report back:
- Per-task status: done / waived (with reason) / blocked (with reason).
- Files changed.
- Any blocker that prevented completion.
```

## Delivery units (when `delivery-units.md` exists)

Parent dispatches **by unit** — not whole slice:

- Worktree: `.worktrees/{unit_id}`
- Work branch: `work/{unit_id}-{slug}`
- Implement **all tasks in unit** only
- Wave barrier: do not start wave N+1 until all units in wave N complete or blocked
- Parallel units: only when Gate 4 parallel + `A ∥ B` + `max_parallel_units`
- GitLab: `delivery-units.md` **GitLab status/spent (SSoT)**
- Prompt: same template; Mandate = ALL tasks **in this unit**; Do NOT commit
- **Commit/MR:** local `coder-agent` → parent once per unit. **G dispatched** → G Phase 3 owns commit/MR; parent does not commit

## Validation checklist (before parent commit)

- [ ] Unit/slice **contract-conformance:** every cited Contract block / `ui-contract.md` element matches implementation (or reported divergence)
- [ ] **Layout SSoT conformance (when cited):** walk cited SSoT **Quick visual checklist** (`reference-sources.md` `role: ui-layout`, or task cites `*-visual.md`); report layout divergence before parent commit — same bar as orchestrator 4b; do not treat bare `prototype/` citation as Layout SSoT
- [ ] Every **unit** task (or every **slice** task when no units file) is `completed` or `waived`
- [ ] No task left `in_progress` or silently skipped
- [ ] Changes are confined to `**`
- [ ] Handoff updated per `execution-handoff.md` (task rows + time block)
- [ ] Unit row and/or roadmap row reflects real state

## Commit (parent only)

**Units + local worker:** one Conventional Commit per unit (skip when G Phase 3 already delivered).

**No units file:** one Conventional Commit per slice, e.g.:

```
feat({subversion_slug}): implement slice {NN} — {short summary}
```

Then mark unit (or roadmap row) `completed` and advance.

## When subagent reports blocker

Do not retry blindly. Record blocker in slice handoff and roadmap row, then halt loop per `orchestrator.md` stop conditions — human resolves blocker before orchestration resumes.
