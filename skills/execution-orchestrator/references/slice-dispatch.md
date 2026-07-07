# Slice dispatch — subagent prompt and validation

The orchestrator dispatches exactly one **synchronous (blocking)** subagent per
slice. Keep its context small: pass only what the slice needs, never the whole
roadmap or master requirements.

## Prompt template

```
Embody the code-coder persona (backing `coder` skill) as a slice worker,
invoked by the execution orchestrator.

Product:     {product_root}
Version:     {version_san}
Subversion:  {subversion_san}
Active path: {product_root}/docs/versions/{version_san}/subversions/{subversion_san}/

Mandate:
- Implement ALL tasks in this slice, in order, with no confirmation between tasks.
- Do NOT commit — the orchestrator commits once per slice.
- Do NOT run backend or frontend tests — implement only.
- Obey AGENTS.md and the harness rules strictly. If any instruction conflicts
  with the rules or the confirmed scope, STOP and report a blocker instead of
  proceeding by assumption.

Report back:
- Per-task status: done / waived (with reason) / blocked (with reason).
- Files changed.
- Any blocker that prevented completion.
```

## Validation checklist (before commit)

- [ ] Every slice task is `done` or `waived` (waiver reason captured)
- [ ] No task left `in_progress` or silently skipped
- [ ] Changes are confined to `{product_root}/**`
- [ ] Slice handoff time block updated when the harness tracks it
- [ ] Roadmap row reflects the real state

## Commit (parent only)

One Conventional Commit per slice, e.g.:

```
feat({subversion_slug}): implement slice {NN} — {short summary}
```

Then mark the roadmap row `completed` and advance to the next slice.

## When the subagent reports a blocker

Do not retry blindly. Record the blocker in the slice handoff and the roadmap
row, then halt the loop per the SKILL.md stop conditions — a human resolves the
blocker before orchestration resumes.
