# Quick mode (Small)

Bypass PM planning chain for **tight, local changes**.

## Entry criteria (all must hold)

- Scope fits in **one sentence**.
- **≤3 files** expected to change (estimate; upgrade if wrong).
- No new version folder or formal acceptance criteria needed.
- No `execution-handoff.md` for this work (if handoff exists for version, use normal Execute routing instead).

## Workflow

1. Read `architecture-rules.md`.
2. Load `docs/context/` files relevant to layer (UI → `design-brief.md` if present).
3. Soft-check complements (`skill-integrations.md`) — UI/docs/security signals only.
4. **MUST** dispatch **`coder-agent`** when available (loads `ns-coder`); else read/follow **`ns-coder`** with explicit `{task_description}`. See `../../../ns-harness/references/subagent-dispatch.md`. Inline `Skill(ns-coder)` while bridge present = forbidden.
5. Optional: user asks for review → **MUST** `reviewer-agent` when available (else `ns-reviewer`). Not automatic.

## Do not

- Create `requirements.md` or task files.
- Run clarify / specify / task-generator.
- Auto-run `/ns-harness prepare`.

## Upgrade triggers

If during implementation:

- File count will exceed 3,
- New API surface or migration appears,
- User expands scope to a "feature",

→ **Stop**, announce upgrade to Medium pipeline, read `requirements-generator.md` and downstream references.

## Examples

| Request | Quick? |
| ------- | ------ |
| Fix null pointer in checkout handler | Yes |
| Add `aria-label` to submit button | Yes |
| Build notification system with email + in-app | No → Medium+ |
| Implement version 2.0 from existing handoff | No → Execute path |
