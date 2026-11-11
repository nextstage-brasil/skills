# Context budget

Keep active window focused. Prefer **disk artifacts** over paste large docs into chat.

## Base load (every SDD session)

1. Parent `ns-spec-driven` SKILL.md (already loaded).
2. Session boot + artifact-layout — **once** at agent cold start (obey `AGENTS.md` in context; architecture/project rules via `session-boot.md`). Mid-session: no full re-load unless local/rules changed. Never tool-Read `AGENTS.md`.
3. `.nextstage-harness/rules/architecture-rules.md` when implementing.
4. **One** version SDD tree: `docs/versions/{version_san}/sdd/` for active version only.

Do **not** re-load full rule corpus per task unless files changed. Everything runs in one session — cold-start cost is paid **once**; protect it.

## On-demand load

| Need | Read |
| ---- | ---- |
| Clarify / brownfield touch | `docs/context/brownfield-map.md`, `system-reverse-spec.agent.md` |
| UI work | `docs/context/design-brief.md` if present |
| Stack constraints | `docs/context/stack-confirmed.md` |
| GitLab execution | `docs/context/gitlab-sync-config.md` |
| Active task | Single `tasks/task-NNN-*.md` + `execution-handoff.md` |
| Source section | Targeted `docs/versions/{version_san}/sdd/source/{slug}.md` + cited `Sx` only |
| Living domain rules | One `docs/specs/{domain}.md` relevant to task |
| Test fixtures | `grep` / `head` — no full fixture dumps |

## Never

- Load **two or more** full `requirements.md` from different versions in one session.
- Load two version trees (`docs/versions/{a}/` and `docs/versions/{b}/`) as working sets.
- Paste entire living spec corpus into context.
- Re-read completed task files unless debugging.
- Mid-version / per-task code review during `run-implementation` (version closure only).

## Single-session hygiene

One session carries tasks, implementation and review. Costless habits that keep it lean (never add extra reads or steps to follow them):

- **Disk is the memory.** Handoff/units/roadmap rows are written as each task finishes; after that, nothing about the task needs to stay in chat.
- Read a task card once, when starting it. No re-reading finished cards, no re-reading files you just wrote.
- Grep/`head` over whole-file dumps; targeted `source/` anchors only.
- Report outcomes in a few lines (files, tests, blockers) — no diffs or logs pasted back into chat.
- **Boundaries:** at a unit end, wave end or slice end the context is cheapest to drop. Say once, in one line, that `/compact` or `/clear` is safe there and resume is automatic from the handoff file. Never stop or wait for the user to do it; the host may also auto-compact.
- Resume after compaction/restart: read only the handoff file + the current task card.

## Missing context docs

`brownfield-map.md` or architecture rules missing + phase needs them:

1. Warn: `/ns-harness prepare` should run manually.
2. Stop — unless user explicitly insist continue without prepare.
