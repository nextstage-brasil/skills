# Artifact layout (SDD)

Canonical paths for spec-driven planning and delivery artifacts.

## Canonical variables

- **`{product_slug}`** — Product folder name in kebab-case.
- **`{product_root}`** — Path where the product lives (monorepo subfolder or repo root).
- **`{version_san}`** — Sanitized version id (e.g. `1.0.0`).
- **`{specs_root}`** — Default `{product_root}/docs/specs/` (living domain specs).

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
