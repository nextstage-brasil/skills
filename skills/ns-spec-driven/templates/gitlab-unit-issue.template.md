# {unit_title}

**Delivery unit:** `{unit_id}` — version `{version_san}`
**Milestone:** {milestone_title}
**Depends on units:** {dependent_units_or_none}

---

## Summary

{observable_delivery_summary}

After implementation, this unit delivers:

{after_implementation_bullets}

---

## Homologation

{homologation_steps}

---

## Execution checklist

Tasks for implementer (`task-NNN` = agent how-cards in repo — not separate tickets):

{execution_checklist}

---

## Review checklist

Observable criteria for MR reviewer — **no** `task-*.md` required:

{review_checklist}

---

## Links

| Item | Value |
|------|-------|
| Version requirements | `docs/versions/{version_san}/requirements.md` |
| Delivery units | `docs/versions/{version_san}/delivery-units.md` |
| SOURCE_BRANCH (MR target) | `{source_branch}` |
| Work branch | `work/{unit_id}-{unit_slug}` |
| Dependent unit issues | {dependent_issue_links_or_none}
