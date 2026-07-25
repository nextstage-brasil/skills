# Artifact persistence — writing the roadmap to disk

The pipeline (Phases 0–5) produces the material for an execution roadmap. Chat scrollback isn't a roadmap — a living set of markdown files in the user's repo is. This reference defines when and how to write them.

## Ask once, early

At Phase 0/1 (alongside the clarification questions), ask:

```
Where should I save this project's artifacts as markdown files as we go?
Default: docs/<project-slug>/ (I'll derive the slug from the project name).
Say "skip docs" to keep everything in chat only.
```

Don't ask again in the same conversation once answered. If the user never answers, default to `docs/<project-slug>/` — don't silently skip persistence, since the user asked for it as a standing capability.

## File map

Inside the confirmed base folder (default `docs/<project-slug>/`):

| File | Written after | Content |
|---|---|---|
| `00-clarification.md` | Phase 1 gate | Filled context template + any `[ASSUMPTION]` markers |
| `01-requirements.md` | Phase 2 gate | Domain map, stakeholder map, epics, user stories (INVEST+Gherkin) |
| `02-prioritization.md` | Phase 3 gate | RICE/WSJF tables, combined ranking, flags |
| `03-schedule.md` | Phase 4 gate | Sprint-by-sprint plan, dependencies, critical path |
| `04-forecast.md` | Phase 5 gate | PERT table, Monte Carlo P50/P85/P95, audience translation |
| `roadmap.md` | Every gate (rewritten, not appended) | Living index — see template below |

On-demand modes (6+) append dated files under `docs/<project-slug>/status/` (e.g. `status/2026-07-20-meeting-digest.md`) only when persistence is enabled — ask before creating that subfolder the first time it's needed.

## `roadmap.md` template

Rewrite this file in full after every phase gate so it always reflects current state — it's the one file a stakeholder can open to see where the project stands:

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

- Write the file with the **same content** just presented in chat — never a diverging or expanded version.
- Write/update the file *before* asking the phase's gate question, so the gate question can reference the saved path (e.g. "Saved to `docs/routewise/03-schedule.md` — confirm to run the forecast?").
- Never create files without the user having confirmed a path (or accepted the default) once in the conversation.
- If persistence was declined ("skip docs"), don't write anything — respect it for the rest of the conversation without re-asking.
