# Slice dispatch — subagent prompt and validation

Orchestrator dispatch exactly one **synchronous (blocking)** subagent per slice.
**MUST** use harness **`coder-agent`** when available
(`../../../ns-harness/references/subagent-dispatch.md`); else generic subagent whose
prompt follows `ns-coder`. Keep context small: pass only what slice needs,
never whole roadmap or master requirements.

## Prompt template

Use when dispatching `coder-agent` or fallback that must load `ns-coder`:

```
Follow the `ns-coder` skill as a slice worker, invoked by the execution
orchestrator. (If you are coder-agent: Session boot once at cold start, then that skill.)

Product:     (this repo)
Version:     {version_san}
Subversion:  {subversion_san}
Active path: docs/versions/{version_san}/subversions/{subversion_san}/

Before coding:
- Session boot once at slice-worker start per `session-boot.md`
  (obey `AGENTS.md` in context — no tool-Read; then local + harness rules).
  No per-task AGENTS re-read inside the slice unless local/rules changed.
  Obey orders, including any mandatory product skills named.
- Load product context from docs/context/ per the Implementation
  boot rule in ns-harness artifact-layout.md (list folder, read layer-relevant files).

Mandate:
- Implement ALL tasks in this slice, in order, with no confirmation between tasks.
- Do NOT commit — the orchestrator commits once per slice.
- Do NOT run backend or frontend tests — implement only.
- Obey AGENTS.md, agents.local.md (if present), and harness rules strictly. If
  any instruction conflicts with the rules or the confirmed scope, STOP and
  report a blocker instead of proceeding by assumption.

Report back:
- Per-task status: done / waived (with reason) / blocked (with reason).
- Files changed.
- Any blocker that prevented completion.
```

## Validation checklist (before commit)

- [ ] Every slice task is `completed` or `waived` (waiver reason captured)
- [ ] No task left `in_progress` or silently skipped
- [ ] Changes are confined to `**`
- [ ] Slice handoff updated per `execution-handoff.md` (task rows + time block)
- [ ] Roadmap row reflects real state

## Commit (parent only)

One Conventional Commit per slice, e.g.:

```
feat({subversion_slug}): implement slice {NN} — {short summary}
```

Then mark roadmap row `completed` and advance to next slice.

## When subagent reports blocker

Do not retry blindly. Record blocker in slice handoff and roadmap row, then
halt loop per `orchestrator.md` stop conditions — human resolves blocker before
orchestration resumes.
