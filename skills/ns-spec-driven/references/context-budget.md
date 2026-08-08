# Context budget

Keep the active window focused. Prefer **disk artifacts** over pasting large docs into chat.

## Base load (every SDD session)

1. Parent `ns-spec-driven` SKILL.md (already loaded).
2. Harness discovery + artifact-layout — **once**/session (`AGENTS.md`, architecture/project rules).
3. `{harness_root}/rules/architecture-rules.md` when implementing.
4. **One** version folder: `docs/versions/{version_san}/` for the active version only.

Do **not** re-load full rule corpus per task unless those files changed.

## On-demand load

| Need | Read |
| ---- | ---- |
| Clarify / brownfield touch | `docs/context/brownfield-map.md`, `system-reverse-spec.agent.md` |
| UI work | `docs/context/design-brief.md` if present |
| Stack constraints | `docs/context/stack-confirmed.md` |
| GitLab execution | `docs/context/gitlab-sync-config.md` |
| Active task | Single `tasks/task-NNN-*.md` + `execution-handoff.md` |
| Living domain rules | One `docs/specs/{domain}.md` relevant to the task |
| Test fixtures | `grep` / `head` — no full fixture dumps |

## Never

- Load **two or more** full `requirements.md` from different versions in one session.
- Paste entire living spec corpus into context.
- Re-read completed task files unless debugging.
- Mid-version / per-task code review during `run-implementation` (version closure only).

## Worker delegation

When delegating, pass **paths and phase goal** — worker skill loads its own references.
For coding under handoff: state **SDD handoff mode** (implement only; parent owns review).

## Missing context docs

If `brownfield-map.md` or architecture rules are missing and the phase needs them:

1. Warn that `/ns-harness-prepare` should be run manually.
2. Stop — unless user explicitly insists on continuing without prepare.
