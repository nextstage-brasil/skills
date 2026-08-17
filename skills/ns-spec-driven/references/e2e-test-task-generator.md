# E2E Test Task Generator

Planning: produce E2E task markdown. Execution: `ns-e2e-tests`.

Face **MUST** read this file after frontend UI tasks exist (`task-generator.md`). Not catalog skill.

## Boundary

| Phase                         | Source         |
| ----------------------------- | -------------- |
| Planning (task file)          | this reference |
| Implementation (Cypress code) | `ns-e2e-tests` |

## Session boot

Load `.nextstage-harness/rules/e2e-tests-rules.mdc` and `frontend-rules.mdc` when present.

## Inputs

- Feature to cover
- Frontend implementation task(s) with **data-testid contract**
- Contract missing then stop; request frontend task update

## E2E project location

Default (greenfield): **`tests-e2e/`** — independent Node package; paths below relative to that root.

Brownfield: use detected Cypress root (`tests-e2e/`, legacy `testes-cypress/`, or `frontend/`). Do not plan new specs under `frontend/cypress/` when no E2E exists yet.

## Output highlights

Task file must include:

- Summary and detailed coverage strategy
- **E2E root** — `tests-e2e/` (or detected brownfield path)
- **data-testid contract table** (copied from frontend task — do not invent)
- Spec paths under `tests-e2e/cypress/e2e/device/{desktop|tablet|mobile}/[feature]/` (adjust prefix if brownfield)
- Command files under `tests-e2e/cypress/support/commands/` — `shared/`, `pages/`, `device/`
- Bootstrap note when project has no E2E yet: executor must run `ns-e2e-tests` Phase 0 before specs
- Success, error, and **RBAC by URL** scenarios
- Device coverage matrix
- Validation criteria: no fixed `cy.wait(N)`, commands not DOM in specs, `@smoke`/`@regression` tags

## Dependencies

Depends on frontend implementation task for same feature.

## Docker note

E2E in container: API URL via host gateway, not `localhost` inside container — per infra rules when present.

## Related

- `task-generator.md` — frontend tasks with testid contract
- `ns-e2e-tests` — write/refactor Cypress code
