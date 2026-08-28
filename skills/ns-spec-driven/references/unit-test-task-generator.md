# Unit Test Task Generator

Emit `task-NNN-*.md` for backend unit + HTTP integration covering Feature.

Face **MUST** read after backend implementation tasks exist (`task-generator.md`). Not catalog skill.

## Boundary

- **Planning:** this reference (task markdown)
- **Execution:** `ns-backend-tests` or implementation workflow

## Session boot

Load `.nextstage-harness/rules/backend-tests-rules.mdc` and `backend-rules.mdc` when present.

## Inputs

- Feature to cover
- Backend implementation tasks already generated
- `requirements.md` data model

## Test pyramid (backend)

| Layer | Owner |
| ----- | ----- |
| E2E | `e2e-test-task-generator.md` |
| Integration | Controller/HTTP tests |
| Unit | Service, FormRequest, Model, Rules |

## What to test

| Component    | Type        | Focus                                         |
| ------------ | ----------- | --------------------------------------------- |
| FormRequest  | Unit        | Valid/invalid fields, tenant FK rules         |
| Service      | Unit        | Business logic, mocks                         |
| Model        | Unit        | Scopes, casts, relations                      |
| Controller   | Integration | Status, response shape, auth, 401/403         |
| Tenant scope | Integration | Cross-tenant P0 — never 200 for other company |

## Output structure

- Summary + detailed test plan (not duplicate)
- **Backend root** — `backend/` (monorepo) or detected brownfield path
- Files under `tests/Unit/` and `tests/Feature/`
- Scenario checklists per component
- Mandatory patterns: RefreshDatabase, factories, response shape, cross-tenant cases
- **Run command** — `vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error` in Docker, 120s timeout (`ns-backend-tests`)
- No `tests/` yet: executor runs `ns-backend-tests` Phase 0 before test classes

## Dependencies

Reference `task-NNN.md` of backend implementation covered.

## Rules

- Happy-path-only for tenant-scoped CRUD **incomplete** without cross-tenant P0
- Do not point tests at production database
- Match project test runner — PHPUnit: `vendor/bin/phpunit --testdox --stop-on-failure --stop-on-error` in Docker, 120s timeout

## Related

- `task-generator.md` — implementation tasks first
- `e2e-test-task-generator.md` — UI coverage
- `ns-backend-tests` — execution and bootstrap
