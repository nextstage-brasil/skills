---
name: create-e2e-tests
description: (NS) Create and maintain Cypress E2E tests with TypeScript using DRY device-aware command architecture (shared/pages/device). Use when writing or refactoring Cypress specs, custom commands, or implementing E2E tasks — not when planning E2E task markdown (use e2e-test-generator). Read harness e2e rules when present. Mandatory discovery before writing specs.
---

# Create E2E Tests

Execution-phase Cypress implementation. Planning-phase: `e2e-test-generator`.

## Harness discovery

Load `{harness}/rules/e2e-tests-rules.mdc` when present. See `references/e2e-architecture.md` for layout summary.

## Phase 1 — Discovery (before code)

1. **App under test** — routes, forms, API usage, existing `data-testid`
2. **Existing commands** — read all `cypress/support/commands/`; never duplicate
3. **Config** — `cypress.config.ts` baseUrl, env vars

## Phase 2 — Command architecture first

```
cypress/support/commands/
  shared/[feature].commands.ts   # business actions — all devices
  pages/[feature].commands.ts    # page structure
  device/mobile|tablet|desktop.commands.ts
```

| Behavior            | Location  |
| ------------------- | --------- |
| Same on all devices | `shared/` |
| Device-exclusive    | `device/` |
| Page DOM structure  | `pages/`  |

Specs: `describe`/`it`, `cy.visit()`, commands, assertions — **no DOM logic in specs**.

## Phase 3 — Spec layout

```
cypress/e2e/device/
  desktop/[feature]/[feature]-successful-flows.cy.ts
  tablet/...
  mobile/...
```

Viewports in `beforeEach`:

- Desktop: 1280×720
- Tablet: 768×1024
- Mobile: 375×812

Forbidden: specs directly under `cypress/e2e/` without `device/` prefix.

## Phase 4 — Implement

- Use `data-testid` from frontend task contract — do not invent
- No fixed `cy.wait(N)` — intercepts or assertion timeouts
- RBAC: menu hidden + direct URL denial
- Auth: login via UI or support session; tenant-aware fixtures

## Phase 5 — Run and report

Run project's Cypress command (`npx cypress run` or docker equivalent). Report failures with `code-investigator` if needed.

## References

| File                             | When                     |
| -------------------------------- | ------------------------ |
| `references/e2e-architecture.md` | Layout and rules summary |
| `e2e-test-generator`             | Task contract source     |

## Related skills

- `e2e-test-generator` — planning tasks with testid contract
- `code-investigator` — failing E2E debugging
