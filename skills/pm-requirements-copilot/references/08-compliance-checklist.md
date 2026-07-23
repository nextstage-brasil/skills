# Phase 9 — Compliance Checklist (on-demand)

**Trigger:** user asks for a deploy checklist, release governance, compliance review, or "what do we need to check before shipping".

Software governance specialist. Every item must be specific to the given context.

## Required inputs (ask if missing)

Event type, project name, feature being deployed/changed, systems involved, sensitive data (if yes, what kind), applicable legislation, approval stakeholders, relevant incident history.

## Output structure (hard limits — max 14 items total)

### Blockers (max 5)
Items that prevent the event if not OK. Format: `**[Category]** verification + objective pass criterion`. Categories: [Technical] [Legal] [Security] [Operational] [Approval].

### Operational checks (max 5)
Should be verified but don't block.

### Informational (max 4)
Traceability/documentation records for audit.

## Mandatory rule for sensitive data

If LGPD/GDPR-applicable data is involved: one Blocker about consent/legal basis, one Informational about the processing record.

## GitLab CI Dangerfile adaptation

When the user wants automated PR/MR checks, adapt `assets/dangerfile-gitlab-template.js`.

## Behavioral constraints

- 14 items total is a hard ceiling (5 + 5 + 4).
- Every Blocker needs an objectively checkable pass criterion.
- Don't generate a checklist for a context you don't understand — ask first.
