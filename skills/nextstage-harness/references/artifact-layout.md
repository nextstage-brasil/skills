# Artifact layout (SDD)

Canonical paths for spec-driven planning and delivery artifacts.

## Canonical variables

- **`{product_slug}`** — Product folder name in kebab-case.
- **`{product_root}`** — Path where the product lives (monorepo subfolder or repo root).
- **`{version_san}`** — Sanitized version id (e.g. `1.0.0`).
- **`{specs_root}`** — Default `{product_root}/docs/specs/` (living domain specs).
- **`{context_root}`** — Default `{product_root}/docs/context/` (product-wide context for planning and implementation).

## Isolation

- All version planning artifacts live under `{product_root}/docs/versions/{version_san}/`.
- Do not save product specs at repo root `/docs/` unless explicitly documented.
- Living specs live under `{specs_root}/` — see `living-spec-consolidator` skill.

## Minimum tree (create before writing)

```
{product_root}/docs/versions/{version_san}/
{product_root}/docs/versions/{version_san}/tasks/
{product_root}/docs/context/
{product_root}/docs/specs/          # created on first living-spec delivery
```

## Standard artifacts

| Artifact | Path |
|----------|------|
| Requirements | `{product_root}/docs/versions/{version_san}/requirements.md` |
| Tasks | `{product_root}/docs/versions/{version_san}/tasks/task-NNN-*.md` |
| Consistency report | `{product_root}/docs/versions/{version_san}/consistency-report.md` |
| Code review report | `{product_root}/docs/versions/{version_san}/code-review-report.md` |
| Execution handoff | `{product_root}/docs/versions/{version_san}/execution-handoff.md` |
| Living spec index | `{specs_root}/INDEX.md` |
| Domain spec | `{specs_root}/{domain}.md` |

## Product context (`{context_root}`)

Stable product-wide context — stack, design, brownfield notes, GitLab sync — lives
outside version folders so every implementer reads the same source.

| File | Purpose |
|------|---------|
| `stack-confirmed.md` | Confirmed stack, constraints, test environment |
| `design-brief.md` | UI/UX tokens, layout, component style |
| `brownfield-map.md` | Existing modules, gaps, legacy constraints |
| `gitlab-sync-config.md` | GitLab project ids, status labels, branches |
| `ci-cd-notes.md` | Pipeline and deployment notes |

Other `*.md` files in `{context_root}/` (including subfolders) are valid — read
them when the task layer or filename suggests relevance.

### Implementation boot rule

Before writing code for any task (ad-hoc, handoff, slice, or GitLab issue):

1. If `{context_root}/` exists, **list** its contents (including one level of
   subdirectories).
2. **Read** every file that applies to the task layer — at minimum
   `stack-confirmed.md` when present; add `design-brief.md` for UI work;
   `brownfield-map.md` when touching legacy areas; `gitlab-sync-config.md` when
   syncing with GitLab or choosing branches.
3. Do not skip this step because the active path is a version or subversion folder.

## Subversions (optional)

When a version is partitioned:

- Master roadmap: `{product_root}/docs/versions/{version_san}/version-roadmap.md`
- Slice folder: `{product_root}/docs/versions/{version_san}/subversions/{subversion_san}/`
- Slice requirements: excerpt under each subversion folder

See `version-partitioner` skill and `core-subversions` rule when present in harness.

## Handoff rule

- Do not declare planning complete if tasks exist without `execution-handoff.md`.
- The handoff is the **single source of truth** for version progress — do not
  duplicate task status inside individual `task-NNN-*.md` files.
- Must include **Time tracking (seconds)** with `Total process time (s)`
  (planning → final delivery).
- Update timestamps and totals during execution, review, living specs, and closure.
- Generate and maintain via `execution-handoff-generator` skill.

Slice handoff (partitioned versions):

- `{product_root}/docs/versions/{version_san}/subversions/{subversion_san}/execution-handoff.md`
- Master version may also hold a top-level handoff for aggregate closure.
