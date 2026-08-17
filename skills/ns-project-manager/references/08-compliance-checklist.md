# Phase 9 — Compliance Checklist (on-demand)

**Trigger:** deploy checklist, release governance, compliance review, "what check before shipping".

Software governance. Every item specific to given context.

## Required inputs (ask if missing)

Event type, project name, feature deployed/changed, systems involved, sensitive data (if yes, what kind), applicable legislation, approval stakeholders, relevant incident history.

## Output structure (hard limits — max 14 items total)

### Blockers (max 5)
Prevent event if not OK. Format: `**[Category]** verification + objective pass criterion`. Categories: [Technical] [Legal] [Security] [Operational] [Approval].

### Operational checks (max 5)
Should verify; don't block.

### Informational (max 4)
Traceability/docs for audit.

## Mandatory rule for sensitive data

LGPD/GDPR-applicable data: one Blocker consent/legal basis; one Informational processing record.

## GitLab CI Dangerfile adaptation

User want automated PR/MR checks: adapt `assets/dangerfile-gitlab-template.js`.

## Behavioral constraints

- 14 items hard ceiling (5 + 5 + 4).
- Every Blocker needs objectively checkable pass criterion.
- Don't checklist context you don't understand — ask first.
