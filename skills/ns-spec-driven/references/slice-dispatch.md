# Slice / unit execution — scope and validation

Orchestrator executes **in-session** (follow `ns-coder` inline; **MUST NOT** spawn `coder-agent` — `../../../ns-harness/references/subagent-dispatch.md` Default: one session):
- **`delivery-units.md` present:** one **unit** at a time (`orchestrator.md` per-unit loop).
- **Else:** one **slice** at a time.

Keep context small: load only the unit/slice tasks and cited `source/` anchors, never whole roadmap or master requirements. Host harness handles compaction; progress lives in handoff/roadmap files.

## Scope rules (apply to yourself)

- Product context: `docs/context/` per the **Implementation boot rule** (`ns-harness` `artifact-layout.md`); session boot already done — no re-read.
- Slice path: `docs/versions/{version_san}/sdd/subversions/{subversion_san}/` first, else legacy `subversions/{subversion_san}/` (`artifact-layout.md` Legacy path resolution). `source/` likewise (`sdd/source/` first); open cited anchors — never implement from memory of paraphrased contracts.
- Implement ALL tasks in the {slice | unit}, in order, no confirmation between tasks.
- Commit: owner = `delivery-units.md` **Commit / MR (SSoT)** when units exist (parent local or G Phase 3); no units file → once per slice.
- Tests: unit/integration per task as project rules require; no E2E unless the user explicitly asked.
- Obey `AGENTS.md`, `agents.local.md` (if present) and harness rules. Instruction conflicts with rules or confirmed scope → STOP, report blocker, do not proceed by assumption.
- Report per task: done / waived (reason) / blocked (reason); files changed.

**Parallel workers (explicit user request / Gate 4 `parallel` only):** give each worker the same rules above, its unit's task paths, and the worktree `.worktrees/{unit_id}`; it must not commit.

## Delivery units (when `delivery-units.md` exists)

Execute **by unit** — not whole slice:

- Worktree: `.worktrees/{unit_id}`
- Work branch: `work/{unit_id}-{slug}`
- Implement **all tasks in unit** only
- Wave barrier: do not start wave N+1 until all units in wave N complete or blocked
- Parallel units (the only case with separate workers): only when Gate 4 parallel + `A ∥ B` + `max_parallel_units`
- GitLab: `delivery-units.md` **GitLab status/spent (SSoT)**
- Scope = ALL tasks **in this unit**; Do NOT commit (owner per Commit / MR below)
- **Commit/MR:** local in-session → parent once per unit. **G unit mode** → G Phase 3 owns commit/MR; parent does not commit

## Validation checklist (before commit)

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

## When a task is blocked

Do not retry blindly. Record blocker in slice handoff and roadmap row, then halt loop per `orchestrator.md` stop conditions — human resolves blocker before orchestration resumes.
