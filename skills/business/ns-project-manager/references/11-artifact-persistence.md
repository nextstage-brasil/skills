# Artifact persistence — writing roadmap to disk

Pipeline (Phases 0–5) produces execution roadmap material. Chat scrollback ≠ roadmap — living markdown in user repo is. When/how write them:

## Ask once, early

Phase 0/1 (with clarification questions), ask:

```
Where should I save this project's artifacts as markdown files as we go?
Default: docs/<project-slug>/ (I'll derive the slug from the project name).
Say "skip docs" to keep everything in chat only.
```

Don't re-ask same conversation once answered. User never answer: default `docs/<project-slug>/` — don't silent skip (standing capability).

## File map

Inside confirmed base (default `docs/<project-slug>/`):

| File | Written after | Content |
|---|---|---|
| `00-clarification.md` | Phase 1 gate | Filled context template + `[ASSUMPTION]` markers |
| `01-requirements.md` | Phase 2 gate | Domain map, stakeholder map, epics, user stories (INVEST+Gherkin) |
| `02-prioritization.md` | Phase 3 gate | RICE/WSJF tables, combined ranking, flags |
| `03-schedule.md` | Phase 4 gate | Sprint-by-sprint plan, dependencies, critical path |
| `04-forecast.md` | Phase 5 gate | PERT table, Monte Carlo P50/P85/P95, audience translation |
| `roadmap.md` | Every gate (rewrite, not append) | Living index — template below |

On-demand modes (6+): append dated files under `docs/<project-slug>/status/` (e.g. `status/2026-07-20-meeting-digest.md`) only if persistence on — ask before create that subfolder first time.

## `roadmap.md` template

Rewrite full after every phase gate — one file stakeholder open for project stand:

```markdown
# <Project name> — execution roadmap

Last updated: <phase just completed>

## Status

| Phase | Status | Summary |
|---|---|---|
| 1 Clarification | Done / In progress / Pending | <one line> |
| 2 Structuring | ... | ... |
| 3 Prioritization | ... | ... |
| 4 Scheduling | ... | ... |
| 5 Forecast | ... | ... |

## Committed delivery date

<P85 date from Phase 5, or "Not yet forecast">

## Key risks / open decisions

- <carried from flags across phases>

## Artifacts

- [Clarification](00-clarification.md)
- [Requirements](01-requirements.md)
- [Prioritization](02-prioritization.md)
- [Schedule](03-schedule.md)
- [Forecast](04-forecast.md)
```

## Rules

- Write file **same content** just presented in chat — never diverge/expand.
- Write/update *before* gate question, so gate can cite path (e.g. "Saved to `docs/routewise/03-schedule.md` — confirm to run the forecast?").
- Never create files without user confirmed path (or accepted default) once.
- Persistence declined ("skip docs"): write nothing — respect rest of conversation, no re-ask.
