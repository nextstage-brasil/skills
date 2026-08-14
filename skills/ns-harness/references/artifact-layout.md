# Artifact layout (SDD)

Canonical paths for spec-driven planning and delivery artifacts. Keep `{version_san}` / `{subversion_san}` as sanitized ids (e.g. `1.0.0`).

## Isolation

- All version planning artifacts live under `docs/versions/{version_san}/`.
- Do not save product specs at repo root `/docs/` unless explicitly documented.
- Living specs live under `docs/specs/` — see `ns-living-spec` skill.

## Minimum tree (create before writing)

```
docs/versions/{version_san}/
docs/versions/{version_san}/tasks/
docs/context/
docs/specs/          # created on first living-spec delivery
```

## Standard artifacts

| Artifact | Path |
|----------|------|
| Requirements | `docs/versions/{version_san}/requirements.md` (trailing `## Consistency` status from `ns-spec-driven` Consistency phase — `references/analyze-consistency.md`) |
| Tasks | `docs/versions/{version_san}/tasks/task-NNN-*.md` |
| Execution handoff | `docs/versions/{version_san}/execution-handoff.md` |
| Commercial budget (internal) | `docs/versions/{version_san}/commercial-budget-internal.md` (header: Sequência + Gerado em) |
| Commercial budget (client) | `docs/versions/{version_san}/commercial-budget-costumer.md` (optional; header: `{version_san}-costumer`) |
| Living spec index | `docs/specs/INDEX.md` |
| Domain spec | `docs/specs/{domain}.md` |

## Product context (`docs/context/`)

Stable product-wide context — stack, design, brownfield notes, GitLab sync — lives
outside version folders so every implementer reads the same source.

| File | Purpose |
|------|---------|
| `stack-confirmed.md` | Confirmed stack, constraints, test environment |
| `design-brief.md` | UI/UX tokens, layout, component style |
| `brownfield-map.md` | Agent-dense module/gap map (stack via `architecture-rules.md`) |
| `system-reverse-spec.md` | Human-readable business reverse description |
| `system-reverse-spec.agent.md` | Agent-dense index of the reverse spec (prefer when both exist) |
| `gitlab-sync-config.md` | GitLab project ids, status labels, branches |
| `ci-cd-notes.md` | Pipeline and deployment notes |

Other `*.md` files in `docs/context/` (including subfolders) are valid — read
them when the task layer or filename suggests relevance.

### Implementation boot rule

Before writing code for any task (ad-hoc, handoff, slice, or GitLab issue):

1. If `docs/context/` exists, **list** its contents (including one level of
   subdirectories).
2. **Read** every file that applies to the task layer — at minimum
   `stack-confirmed.md` when present; add `design-brief.md` for UI work;
   `brownfield-map.md` when touching legacy areas; prefer
   `system-reverse-spec.agent.md` over the prose body when both exist;
   `gitlab-sync-config.md` when syncing with GitLab or choosing branches.
3. Do not skip this step because the active path is a version or subversion folder.

## Subversions (optional)

When a version is partitioned:

- Master roadmap: `docs/versions/{version_san}/version-roadmap.md`
- Slice folder: `docs/versions/{version_san}/subversions/{subversion_san}/`
- Slice requirements: excerpt under each subversion folder

See `ns-spec-driven` → `references/version-partitioner.md` and `core-subversions` rule when present in harness.

## Handoff rule

- Do not declare planning complete if tasks exist without `execution-handoff.md`.
- The handoff is the **single source of truth** for version progress — do not
  duplicate task status inside individual `task-NNN-*.md` files.
- Must include **Time tracking (seconds)** with `Total process time (s)`
  (planning → final delivery).
- Update timestamps and totals during execution, review, living specs, and closure.
- Generate and maintain via `ns-spec-driven` → `references/execution-handoff.md` (internal phase).

Slice handoff (partitioned versions):

- `docs/versions/{version_san}/subversions/{subversion_san}/execution-handoff.md`
- Master version may also hold a top-level handoff for aggregate closure.
