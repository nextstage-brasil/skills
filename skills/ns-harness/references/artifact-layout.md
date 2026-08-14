# Artifact layout (SDD)

Canonical paths for SDD planning/delivery. `{version_san}` / `{subversion_san}` = sanitized ids (e.g. `1.0.0`).

## Isolation

- Version planning under `docs/versions/{version_san}/`.
- No product specs at repo root `/docs/` unless explicitly documented.
- Living specs under `docs/specs/` — see `ns-living-spec`.

## Minimum tree (create before writing)

```
docs/versions/{version_san}/
docs/versions/{version_san}/tasks/
docs/context/
docs/specs/          # first living-spec delivery
```

## Standard artifacts

| Artifact | Path |
|----------|------|
| Requirements | `docs/versions/{version_san}/requirements.md` (trailing `## Consistency` from `ns-spec-driven` Consistency — `references/analyze-consistency.md`) |
| Tasks | `docs/versions/{version_san}/tasks/task-NNN-*.md` |
| Execution handoff | `docs/versions/{version_san}/execution-handoff.md` |
| Commercial budget (internal) | `docs/versions/{version_san}/commercial-budget-internal.md` (header: Sequência + Gerado em) |
| Commercial budget (client) | `docs/versions/{version_san}/commercial-budget-costumer.md` (optional; header: `{version_san}-costumer`) |
| Living spec index | `docs/specs/INDEX.md` |
| Domain spec | `docs/specs/{domain}.md` |

## Product context (`docs/context/`)

Stable product-wide context outside version folders.

| File | Purpose |
|------|---------|
| `stack-confirmed.md` | Stack, constraints, test environment |
| `design-brief.md` | UI/UX tokens, layout, component style |
| `brownfield-map.md` | Agent-dense module/gap map (stack via `architecture-rules.md`) |
| `system-reverse-spec.md` | Human reverse description |
| `system-reverse-spec.agent.md` | Agent index (prefer when both exist) |
| `gitlab-sync-config.md` | Project ids, status labels, branches |
| `ci-cd-notes.md` | Pipeline / deploy notes |

Other `docs/context/**/*.md` valid — read when task layer/filename relevant.

### Implementation boot rule

Before writing code (ad-hoc, handoff, slice, GitLab issue):

1. `docs/context/` exists → **list** contents (+ one level of subdirs).
2. **Read** every file for task layer — at min `stack-confirmed.md` when present; `design-brief.md` for UI; `brownfield-map.md` for legacy; prefer `system-reverse-spec.agent.md` over prose body; `gitlab-sync-config.md` for GitLab/branches.
3. Do not skip because path is version/subversion folder.

## Subversions (optional)

- Master roadmap: `docs/versions/{version_san}/version-roadmap.md`
- Slice: `docs/versions/{version_san}/subversions/{subversion_san}/`
- Slice requirements: excerpt under each subversion folder

See `ns-spec-driven` → `references/version-partitioner.md` + `core-subversions` when present.

## Handoff rule

- Planning incomplete if tasks exist without `execution-handoff.md`.
- Handoff = **single SoT** for version progress — no task-status duplicate in `task-NNN-*.md`.
- Must include **Time tracking (seconds)** with `Total process time (s)`.
- Update timestamps/totals during execution, review, living specs, closure.
- Maintain via `ns-spec-driven` → `references/execution-handoff.md`.

Slice handoff:

- `docs/versions/{version_san}/subversions/{subversion_san}/execution-handoff.md`
- Master may hold top-level handoff for aggregate closure.
