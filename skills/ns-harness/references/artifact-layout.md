# Artifact layout (SDD)

Canonical paths for SDD planning/delivery. `{version_san}` / `{subversion_san}` = sanitized ids (e.g. `1.0.0`).

## Isolation

- Version planning under `docs/versions/{version_san}/`.
- SDD face outputs under `docs/versions/{version_san}/sdd/` — PM under `pm/` (sibling, not inside `sdd/`).
- No product specs at repo root `/docs/` unless explicitly documented.
- Living specs under `docs/specs/` — see `ns-living-spec`.

## Minimum tree (create before writing)

```
docs/versions/{version_san}/
docs/versions/{version_san}/sdd/
docs/versions/{version_san}/pm/   # ns-project-manager deliverables
docs/context/
docs/specs/          # first living-spec delivery
```

New versions: create SDD artifacts only under `sdd/`.

## Standard artifacts

| Artifact | Path |
|----------|------|
| Requirements | `docs/versions/{version_san}/sdd/requirements.md` (trailing `## Consistency` from `ns-spec-driven` Consistency — `references/analyze-consistency.md`) |
| Clarify contract | `docs/versions/{version_san}/sdd/clarify-contract.md` (`ns-spec-driven` Clarify-Strict) |
| Unknowns register | `docs/versions/{version_san}/sdd/unknowns-register.md` |
| Immutable source | `docs/versions/{version_san}/sdd/source/{slug}.md` — verbatim; anchors `S1`, `S3.1`, `S10.4`; never edit after Gate 1 |
| Spec coverage | `docs/versions/{version_san}/sdd/spec-coverage.md` |
| UI contract | `docs/versions/{version_san}/sdd/ui-contract.md` — only when version has UI |
| Tasks | `docs/versions/{version_san}/sdd/tasks/task-NNN-*.md` |
| Delivery units | `docs/versions/{version_san}/sdd/delivery-units.md` (opt-in — after Gate 4 publish/parallel or resume; `ns-spec-driven` → `references/delivery-units.md`) |
| Execution handoff | `docs/versions/{version_san}/sdd/execution-handoff.md` |
| Graph spec | `docs/versions/{version_san}/sdd/graph-spec.md` (optional agent-runtime stack) |
| Execution plan | `docs/versions/{version_san}/sdd/execution-plan.md` (`ns-autonomous` only) |
| Commercial budget (internal) | `docs/versions/{version_san}/pm/{version_san}-commercial-budget-internal.md` (header: Sequência + Gerado em) |
| Commercial budget (client) | `docs/versions/{version_san}/pm/{version_san}-commercial-budget-costumer.md` (optional; header: `{version_san}-costumer`) |
| Living spec index | `docs/specs/INDEX.md` |
| Domain spec | `docs/specs/{domain}.md` |
| Agent architecture ADR | `docs/specs/agent-architecture.md` (`ns-multi-agent-architect`; living + Changelog — not under `docs/versions/`) |

## Legacy path resolution (read)

Readers resolve `docs/versions/{version_san}/sdd/<artifact>` first. If missing and a classic copy exists at version root (same basename or `tasks/`, `source/`, `subversions/`), read the legacy path — do **not** dual-write.

## Legacy nest migration (first SDD read/write per version)

On first SDD read/write for a version when classic artifacts still sit at version root (not under `sdd/`):

1. **STOP once.** Propose move `version root → sdd/` for every SDD artifact found at root.
2. Search repo refs (at least `docs/`, `README*`, handoff/task files). List referencing files.
3. Ask one closed question: **confirm move + ref fix** or **decline** — same discipline as PM misplaced gate (`ns-project-manager` → `pm-persist.md`). Forbidden: `proceed`, silence, or continuing in the same turn.
4. **On confirm:** create `sdd/`, move artifacts, fix every ref, re-search until clean.
5. **On decline or no answer:** read legacy paths only; no dual-write; no silent second tree.

New versions: write under `sdd/` only.

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
| `reference-sources.md` | Pointers to version `sdd/source/` trees (not a dump of source) |

Other `docs/context/**/*.md` valid — read when task layer/filename relevant.

### Implementation boot rule

Before writing code (ad-hoc, handoff, slice, GitLab issue):

1. `docs/context/` exists → **list** contents (+ one level of subdirs).
2. **Read** every file for task layer — at min `stack-confirmed.md` when present; `design-brief.md` for UI; `brownfield-map.md` for legacy; prefer `system-reverse-spec.agent.md` over prose body; `gitlab-sync-config.md` for GitLab/branches; **`reference-sources.md`** when present (then open cited `docs/versions/{version_san}/sdd/source/` sections).
3. Do not skip because path is version/subversion folder.

## Subversions (optional)

- Master roadmap: `docs/versions/{version_san}/sdd/version-roadmap.md`
- Slice: `docs/versions/{version_san}/sdd/subversions/{subversion_san}/`
- Slice requirements: excerpt under each subversion folder

See `ns-spec-driven` → `references/version-partitioner.md` + `core-subversions` when present.

## Handoff rule

- Planning incomplete if tasks exist without resolved `execution-handoff.md` (`sdd/` first, else legacy version root per **Legacy path resolution** above).
- Handoff = **single SoT** for version progress — no task-status duplicate in `task-NNN-*.md`.
- Must include **Time tracking (seconds)** with `Total process time (s)`.
- Update timestamps/totals during execution, review, living specs, closure.
- Maintain via `ns-spec-driven` → `references/execution-handoff.md`.

Slice handoff:

- `docs/versions/{version_san}/sdd/subversions/{subversion_san}/execution-handoff.md`
- Master may hold top-level handoff for aggregate closure.

## GitLab MCP publishing

SDD/GitLab steps pass explicit path `docs/versions/{version_san}/sdd/requirements.md` — not MCP default at version root. Server-side default alignment tracked in `skills/_meta/MIGRATION.md`.
