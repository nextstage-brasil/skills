# Stack signal detection

Use manifests and folder names to classify the stack. **Never assume** a profile without evidence — several stacks can coexist (e.g. Laravel + React monorepo).

## PHP / Laravel family

| Signal | Likely stack |
| ------ | ------------ |
| `artisan`, `composer.json` with `laravel/framework` | Laravel |
| `app/Modules/`, `app/Generated/`, `.build.config.json` | Grogoo-style modular Laravel |
| `library/SistemaLibrary`, `src/controller/*Controller.class.php` | Legacy PHP + builder |
| `vendor/nextstage-brasil/ns-util` or `NsUtil\` imports | NsUtil consumer — link `nsutil-architecture-rules.mdc`, do not inline |
| `public/api/swoole.php` | Swoole runtime — note FPM vs Swoole split |

## JavaScript / TypeScript

| Signal | Likely stack |
| ------ | ------------ |
| `react` in `package.json` | React |
| `vue` in `package.json` | Vue |
| `next` in `package.json` | Next.js |
| `mobx`, `zustand`, `redux` | State library — one line in stack table |
| `cypress` or `testes-cypress/` | Cypress E2E |
| `vitest` / `jest` | Unit/integration frontend tests |

## Infrastructure

| Signal | Note in constitution |
| ------ | -------------------- |
| `docker-compose.yml` with `app`, `app_test` | Separate dev vs test containers |
| `redis` service | Cache/queue; note facade vs direct client if enforced in code |
| `postgres` / `mysql` service | DB + port from compose or `.env.example` |
| `queue` / `worker` service | Queue worker must run for async features |

## Monorepo layouts

| Pattern | Product root |
| ------- | ------------ |
| `apps/{slug}/backend` + `frontend` | `apps/{slug}/` |
| `backend/` + `frontend/` at repo root | Repo root |
| Single `src/` tree | Repo root |

Document inconsistency if `AGENTS.md` points to a different root than manifests.

## When to suggest sibling rules

| Detection | Suggested sibling `.mdc` |
| --------- | ------------------------ |
| Grogoo (`Generated/`, `.build.config.json`) | `grogoo-instructions.mdc` |
| NsUtil dependency | `nsutil-architecture-rules.mdc` |
| Laravel backend conventions | `backend-rules.mdc` |
| React/Tailwind frontend | `frontend-rules.mdc` |
| Pest/PHPUnit patterns | `backend-tests-rules.mdc` or `test-pest-rules.mdc` |
| Cypress | `e2e-tests-rules.mdc` |

Offer to generate siblings only when user asks — this skill focuses on the root constitution.
