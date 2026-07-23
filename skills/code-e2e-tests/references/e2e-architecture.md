# E2E architecture summary

Consolidated from harness `e2e-tests-rules.mdc` when present. This file is the catalog fallback.

## Cypress project root

| Scenario | Root | Rule |
| -------- | ---- | ---- |
| **Greenfield** (no E2E yet) | `{product_root}/tests-e2e/` | **Required** — independent Node project |
| **Brownfield** (E2E already exists) | Detected path | Use as-is; do not migrate without explicit request |

### Greenfield rules

- **Folder name:** `tests-e2e` (exact, at `{product_root}/`).
- **Own `package.json`** — Cypress, TypeScript, and E2E scripts live here only.
- **Forbidden on greenfield:** adding Cypress to `frontend/package.json`, `cypress/` under `frontend/`, or any co-location inside the app package.

### Brownfield detection order

Check in order; stop at first match:

1. `{product_root}/tests-e2e/cypress.config.ts`
2. `{product_root}/testes-cypress/cypress.config.ts` (legacy)
3. `{product_root}/frontend/cypress.config.ts` (legacy co-located)

If none match → bootstrap `{product_root}/tests-e2e/` (Phase 0).

## Bootstrap tree (`tests-e2e/`)

```
{product_root}/tests-e2e/
  package.json
  tsconfig.json
  cypress.config.ts
  cypress/
    e2e/device/{desktop,tablet,mobile}/
    fixtures/
    support/
      e2e.ts
      commands/
        shared/
        pages/
        device/
          desktop.commands.ts
          tablet.commands.ts
          mobile.commands.ts
```

### `package.json` minimum

- `name`: `tests-e2e` (or `{product-slug}-tests-e2e`)
- `private`: `true`
- `scripts`: `cypress:open`, `cypress:run` → `cypress open` / `cypress run`
- `devDependencies`: `cypress`, `typescript` (versions aligned with project or LTS)

### `cypress.config.ts` minimum

- `baseUrl` from `CYPRESS_BASE_URL` env (fallback documented in config comment)
- `e2e.supportFile`: `cypress/support/e2e.ts`
- `specPattern`: `cypress/e2e/**/*.cy.ts`

### `cypress/support/e2e.ts`

- Import device command files and any `shared/` / `pages/` command modules as they are added.

After bootstrap, document the suite in `{product_root}/docs/context/stack-confirmed.md` or `architecture-rules.md` when those files exist.

## Spec rules

- All specs under `cypress/e2e/device/{desktop|tablet|mobile}/[feature]/`
- Naming: `*.cy.ts`
- One logical flow per spec file when possible
- **Forbidden:** specs directly under `cypress/e2e/` without `device/` prefix

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
