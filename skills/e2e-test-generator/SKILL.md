---
name: e2e-test-generator
description: Generate E2E test task markdown for Cypress/TypeScript during SDD planning after frontend tasks exist. Use when planning Cypress coverage per feature — not for writing specs (use create-e2e-tests). Requires data-testid contract from frontend task. Device-aware desktop/tablet/mobile structure.
---

# E2E Test Task Generator

Planning-phase skill: produce E2E task markdown. Execution-phase: `create-e2e-tests`.

## Boundary

| Phase | Skill |
|-------|-------|
| Planning (task file) | `e2e-test-generator` |
| Implementation (Cypress code) | `create-e2e-tests` |

## Harness discovery

Load `{harness}/rules/e2e-tests-rules.mdc` and `frontend-rules.mdc` when present.

## Inputs

- Feature to cover
- Frontend implementation task(s) with **data-testid contract**
- If contract missing → stop and request frontend task update

## Output highlights

Task file must include:

- Summary and detailed coverage strategy
- **data-testid contract table** (copied from frontend task — do not invent)
- Spec paths under `cypress/e2e/device/{desktop|tablet|mobile}/[feature]/`
- Command files: `shared/`, `pages/`, `device/`
- Success, error, and **RBAC by URL** scenarios
- Device coverage matrix
- Validation criteria: no fixed `cy.wait(N)`, commands not DOM in specs, `@smoke`/`@regression` tags

## Dependencies

Depends on frontend implementation task for the same feature.

## Docker note

When E2E runs in container: API URL via host gateway, not `localhost` inside container — per infra rules when present.

## Related skills

- `create-e2e-tests` — write/refactor Cypress code
- `task-generator` — frontend tasks with testid contract
