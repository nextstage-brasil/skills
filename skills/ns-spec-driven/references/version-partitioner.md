# Version Partitioner

Split master `requirements.md` into subversions. Sequential planning.

## Session boot

See `../../../ns-harness/references/artifact-layout.md` and `../../../ns-harness/references/session-boot.md`. Read `core-subversions` rule from harness when present.

## Scope

- **Read only:** master requirements — `docs/versions/{version_san}/sdd/requirements.md` first; legacy `docs/versions/{version_san}/requirements.md` if unmigrated (`artifact-layout.md` **Legacy path resolution**)
- **Do not:** generate tasks, execution-handoff, or re-run Gate 1
- **Do not load** product backend/frontend rules — structural partition only

## Algorithm

1. **Parse master** — Features, precedences, data model hints, layer tags
2. **Build DAG** — default: schema then API then FE then tests; honor explicit precedence
3. **Group by bounded context** — cluster by domain/entity
4. **Split oversized groups** when:
   - \> 12 features with cross-dependencies, or
   - ~50 estimated tasks, or
   - ~600k token heuristic
5. **Consolidate undersized** — merge adjacent slices below ~4 tasks when safe; **slice size target 4–7 tasks** (not classic dispatch batch). Task unit = **1 Feature × 1 impl layer** + capped test tasks (`task-generator.md` Decomposition) — `tasks est.` MUST use that unit so slice target holds
6. **Topological sort** — folders `01-slug`, `02-slug`, …
7. **Nest gate:** classic SDD only at version root → nest migration STOP (`session-continuity.md`) before first emit. On confirm: emit under `sdd/` (step 8). On decline: emit beside legacy master at version root; slice link `../requirements.md#Feature-ID` — no dual tree.
8. **Emit artifacts** (canonical under `docs/versions/{version_san}/sdd/` after nest confirm; legacy root only on decline):
   - `version-roadmap.md` — set `{master_requirements_path}` to resolved master path (confirm → `sdd/requirements.md`; decline → version-root `requirements.md`)
   - `subversions/{subversion_san}/requirements.md` — **excerpt** + link master `../../requirements.md#Feature-ID` when under `sdd/`; `../requirements.md#Feature-ID` when declined beside legacy root
   - Empty `subversions/{subversion_san}/tasks/` per slice

## Roadmap table columns

| NN | slug | Features | deps | tasks est. | tokens est. | status |

Start `status` as `pending`.

## Output checklist

- [ ] `docs/versions/{version_san}/sdd/version-roadmap.md` saved (legacy root only on nest decline)
- [ ] All subversion folders with excerpt requirements + empty `tasks/`
- [ ] No `task-*.md` created
- [ ] Human review before slice planning loop

## References

| File                          | When                              |
| ----------------------------- | --------------------------------- |
| `../templates/version-roadmap.template.md` | Roadmap structure                 |
| `partition-workflow.md`       | Orchestrator loop after partition |

## Integration

Partition then Gate Roadmap (human confirms) then plan each slice (Gates 2–3, tasks). Do not repeat Gate 1.

**Delivery units:** slice folder = **candidate grouping only** for later `delivery-units.md`. Never merge tasks across slices into one unit. Slice may **split** into multiple units when task graph shows independence — `delivery-units.md` authoritative for GitLab publish.
