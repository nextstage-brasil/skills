# E2E architecture summary

Consolidated from common harness `e2e-tests-rules` — apply full harness rule when present.

## Valid Cypress roots

- `{product_root}/frontend/cypress/`
- Separate `tests-e2e/` repo

## Spec rules

- All specs under `cypress/e2e/device/{desktop|tablet|mobile}/[feature]/`
- Naming: `*.cy.ts`
- One logical flow per spec file when possible

## Commands

- Business behavior → `shared/[feature].commands.ts`
- Page structure → `pages/[feature].commands.ts`
- Device-only → `device/*.commands.ts`

## Selectors

- Prefer `data-testid` from frontend contract
- Avoid fragile CSS selectors for critical actions

## API setup

- Use API for setup/teardown when faster than UI
- Assert standard response shape when stubbing (project-specific envelope)

## Flows to cover (when in scope)

- Login valid/invalid
- CRUD happy and error paths
- Navigation and RBAC by URL
- File upload flows if applicable

## Docker

`CYPRESS_API_URL` must reach backend from container (host gateway, not container localhost).
