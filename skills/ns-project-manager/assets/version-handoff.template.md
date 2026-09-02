# Version execution handoff — {version_name}

**Version:** {version_san}
**Last updated:** {date}
**Sequência:** {sequencia}

---

## Version identity

| Field | Value |
|-------|-------|
| Version / epic | {version_name} |
| OKR / objective | {okr_objective} |
| MVP / deadline pressure | {deadline_or_mvp} |

---

## Scope

### In scope

{scope_in_bullets}

### Out of scope

{scope_out_bullets}

---

## Dependency graph (DAG)

### Mermaid

```mermaid
{dag_mermaid}
```

### Layer table

| Layer | Items | Status |
|-------|-------|--------|
| {layer_row} | {layer_items} | {layer_status} |

Status values: `pending`, `in_progress`, `done`.

### Edges with technical reasons

| From | To | Reason |
|------|-----|--------|
| {edge_from} | {edge_to} | {edge_reason} |

### Critical path

{critical_path_summary}

---

## Layer → sprint map

(Phase 4 — use `—` when schedule not yet built.)

| Layer | Sprint(s) | Notes |
|-------|-----------|-------|
| {layer_sprint_row} | {sprint_ids} | {sprint_notes} |

---

## Delivery forecast

(Phase 5 — use `—` when forecast not yet run.)

| Metric | Date |
|--------|------|
| P50 | {p50_date} |
| P85 | {p85_date} |

---

## Risks and blockers

{risks_blockers_bullets}

---

## Open decisions

{open_decisions_bullets}

---

## How to update

1. Re-run Phase 3 when backlog deps or narrative scope change — refresh DAG Mermaid and layer table.
2. After Phase 4 schedule: update layer→sprint map; do not schedule a layer before all predecessor layers complete.
3. After Phase 5 forecast: fill P50/P85; P85 = committed date for stakeholders.
4. Persist only at `docs/versions/{version_san}/pm/execution-handoff.md`. Do not edit spec-driven `docs/versions/{version_san}/execution-handoff.md` at version root.
5. Spec-driven `docs/versions/{version_san}/execution-handoff.md` at version root is not misplaced — never STOP/move/delete it (`pm-persist.md` exception). STOP only for other `execution-handoff.md` paths outside `pm/`.

---

⚠️ Requires human review before entering a sprint.
