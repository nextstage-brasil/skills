---
name: ns-gitlab-ci-generator
description: (NS) Generate and adapt .gitlab-ci.yml for SaaS products with backend and frontend — test, build, E2E gate, deploy by branch. Use when the user asks for GitLab CI, pipeline setup, or CI/CD bootstrap for a monorepo product. Uses references/templates/gitlab-ci.template.yml as baseline. Out of scope for pure agent-runtime repos without backend+frontend layout.
license: Apache-2.0
metadata:
  author: nextstage-brasil
  version: "1.0"
---

# GitLab CI Generator

Produce `.gitlab-ci.yml` for backend + frontend SaaS layouts.

## Session boot

Load `.nextstage-harness/rules/infra-rules.mdc`, `backend-tests-rules.mdc`, `e2e-tests-rules.mdc` when present. Read `docker-compose.yml`.

## When to use

- Create or adjust `.gitlab-ci.yml`
- `product_class` saas or intelligent_saas (backend + frontend required)
- Branch-based test/build/deploy

## Out of scope

- `agent_runtime`-only pipelines
- Cloud provisioning beyond template contract

## Inputs

- Target branches (minimum: develop, homolog, main)
- E2E folder name (`testes-cypress`, `tests-e2e`, or `frontend/cypress`)

## Workflow

### A — Copy baseline

Copy `references/templates/gitlab-ci.template.yml` to `.gitlab-ci.yml`

Paths are repo-relative (`backend/`, `frontend/`).

### B — Mandatory adaptations

| Item            | Action                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| E2E folder      | Match product folder in `changes:` and job `cd`                        |
| PHP image       | Align to backend Dockerfile                                            |
| Test commands   | Match `composer.json` / `package.json`                                 |
| Lockfile        | `yarn.lock` vs `package-lock.json` in cache key                        |
| Deploy branches | Adjust regex if not main/homolog/develop                               |
| E2E disabled    | Remove e2e jobs from deploy `needs` or document `RUN_REMOTE_E2E=false` |

Do not copy another product's CI file — use this template only.

### C — GitLab CI variables

Document in optional `docs/context/ci-cd-notes.md`:

- `ENV_BACKEND`, `ENV_FRONTEND`, test DB vars, `RUN_REMOTE_E2E`, GCP keys — names only, no secret values

### D — Validate

Lint YAML; confirm jobs match repo layout.

## References

| File                                          | When              |
| --------------------------------------------- | ----------------- |
| `references/templates/gitlab-ci.template.yml` | Baseline pipeline |

## Related skills

- `ns-e2e-tests` — E2E folder conventions
- `ns-spec-driven` `references/e2e-test-task-generator.md` — planning E2E scope
