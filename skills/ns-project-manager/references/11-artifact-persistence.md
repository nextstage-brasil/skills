# Artifact persistence — writing PM markdown to disk

Pipeline (Phases 0–5) persist **phase files**. Chat scrollback ≠ source of truth. Living markdown in user repo is.

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
| `02-prioritization.md` | Phase 3 gate | RICE/WSJF tables (activity list), DAG Mermaid, layer table, topological order, edges, flags |
| `03-schedule.md` | Phase 4 gate | Sprint-by-sprint plan, dependencies, critical path |
| `04-forecast.md` | Phase 5 gate | PERT table, Monte Carlo P50/P85/P95, audience translation |

Product/project roadmap (on-demand, **not** under project-slug): `docs/roadmap.md` — `assets/product-roadmap.template.md`, `references/13-product-roadmap.md`.

Phases 1–5 **never** write or rewrite `docs/roadmap.md`.

Version handoff card (on-demand, not pipeline phase): `docs/versions/{version_san}/pm/execution-handoff.md` — `references/12-version-handoff.md`, `references/pm-persist.md`.

On-demand modes (6+): append dated files under `docs/<project-slug>/status/` (e.g. `status/2026-07-20-meeting-digest.md`) only if persistence on — ask before create that subfolder first time.

## Rules

- Write file **same content** just presented in chat — never diverge/expand.
- Write/update *before* gate question, so gate can cite path (e.g. "Saved to `docs/routewise/03-schedule.md` — confirm to run the forecast?").
- `docs/roadmap.md` only in product-roadmap mode. Never under `docs/<project-slug>/`. Never rewrite on phase 1–5 gates. Never write SDD `version-roadmap.md`. Existing non-product `docs/roadmap.md`: STOP gate in `references/13-product-roadmap.md` — no silent overwrite.
- Never create files without user confirmed path (or accepted default) once.
- Persistence declined ("skip docs"): write nothing — respect rest of conversation, no re-ask.
