# Context budget

Keep the active window focused. Prefer **disk artifacts** over pasting large docs into chat.

## Base load (every SDD session)

1. Parent `nextstage-spec-driven` SKILL.md (already loaded).
2. Harness discovery + artifact-layout pointers.
3. `{harness_root}/rules/architecture-rules.md` when implementing.
4. **One** version folder: `docs/versions/{version_san}/` for the active version only.

## On-demand load

| Need | Read |
| ---- | ---- |
| Clarify / brownfield touch | `docs/context/brownfield-map.md`, `system-reverse-spec.agent.md` |
| UI work | `docs/context/design-brief.md` if present |
| Stack constraints | `docs/context/stack-confirmed.md` |
| GitLab execution | `docs/context/gitlab-sync-config.md` |
| Active task | Single `tasks/task-NNN-*.md` + `execution-handoff.md` |
| Living domain rules | One `docs/specs/{domain}.md` relevant to the task |

## Never

- Load **two or more** full `requirements.md` from different versions in one session.
- Paste entire living spec corpus into context.
- Re-read completed task files unless debugging.

## Worker delegation

When delegating, pass **paths and phase goal** — let the worker skill load its own references.

## Missing context docs

If `brownfield-map.md` or architecture rules are missing and the phase needs them:

1. Warn that `/harness-prepare` should be run manually.
2. Stop — unless user explicitly insists on continuing without prepare.
