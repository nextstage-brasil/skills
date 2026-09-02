# Version execution handoff — {{VERSION_NAME}}

**Version:** {{VERSION_SAN}}
**Last updated:** {{DATE}}
**Sequência:** {{SEQUENCIA}}

---

## Version identity

| Field | Value |
|-------|-------|
| Version / epic | {{VERSION_NAME}} |
| OKR / objective | {{OKR_OBJECTIVE}} |
| MVP / deadline pressure | {{DEADLINE_OR_MVP}} |

---

## Scope

### In scope

{{SCOPE_IN_BULLETS}}

### Out of scope

{{SCOPE_OUT_BULLETS}}

---

## Dependency graph (DAG)

### Mermaid

```mermaid
{{DAG_MERMAID}}
```

### Layer table

| Layer | Items | Status |
|-------|-------|--------|
| {{LAYER_ROW}} | {{LAYER_ITEMS}} | {{LAYER_STATUS}} |

Status values: `pending`, `in_progress`, `done`.

### Edges with technical reasons

| From | To | Reason |
|------|-----|--------|
| {{EDGE_FROM}} | {{EDGE_TO}} | {{EDGE_REASON}} |

### Critical path

{{CRITICAL_PATH_SUMMARY}}

---

## Layer → sprint map

(Phase 4 — use `—` when schedule not yet built.)

| Layer | Sprint(s) | Notes |
|-------|-----------|-------|
| {{LAYER_SPRINT_ROW}} | {{SPRINT_IDS}} | {{SPRINT_NOTES}} |

---

## Delivery forecast

(Phase 5 — use `—` when forecast not yet run.)

| Metric | Date |
|--------|------|
| P50 | {{P50_DATE}} |
| P85 | {{P85_DATE}} |

---

## Risks and blockers

{{RISKS_BLOCKERS_BULLETS}}

---

## Open decisions

{{OPEN_DECISIONS_BULLETS}}

---

## How to update

1. Re-run Phase 3 when backlog deps or narrative scope change — refresh DAG Mermaid and layer table.
2. After Phase 4 schedule: update layer→sprint map; do not schedule a layer before all predecessor layers complete.
3. After Phase 5 forecast: fill P50/P85; P85 = committed date for stakeholders.
4. Persist only at `docs/versions/{{VERSION_SAN}}/pm/execution-handoff.md`. Do not edit spec-driven `docs/versions/{{VERSION_SAN}}/execution-handoff.md` at version root.
5. Spec-driven `docs/versions/{{VERSION_SAN}}/execution-handoff.md` at version root is not misplaced — never STOP/move/delete it (`pm-persist.md` exception). STOP only for other `execution-handoff.md` paths outside `pm/`.

---

⚠️ Requires human review before entering a sprint.
