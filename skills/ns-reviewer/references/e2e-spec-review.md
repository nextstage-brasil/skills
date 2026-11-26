# E2E spec review mode (`e2e-spec`)

Caller: `ns-qa-homologation` Q8 (generated E2E specs before commit). Input: spec files (worktree paths), lint JSON (`findings[]` file:line + rule), covered `@S-n` / `@AC-n`, scenario text. Read-only. Same **Score gate** + output format as `../SKILL.md`; no GitLab comment. Caller enforces max 3 rounds.

## Order

1. Lint JSON first: every finding = **Critical** (score ≤ 6). Never approve with findings; never re-judge a finding away.
2. Read each spec + support code it calls (page objects, commands, fixtures).
3. Score vs table; fix map rows per `review-fix-map.template.md`.

## Lint rules (caller script)

| Rule | Meaning |
| ---- | ------- |
| `raw-selector` | CSS/XPath in locator call |
| `fixed-wait` | `cy.wait(<number>)` / `waitForTimeout` |
| `force-action` | `force: true` |
| `cypress-env` | `Cypress.env(` in spec |
| `spec-intercept` | intercept/route in spec (when forbidden) |
| `focused-or-skipped` | `.only` / `.skip` / `.fixme` / `x-` / `f-` |
| `uncaught-exception` | `uncaught:exception` handler |

## Criteria

| Finding | Severity / cap |
| ------- | -------------- |
| Assertion weakened, removed, or asserts nothing observable for a tagged `@AC-n` | **Critical** |
| Test passes regardless of product behavior (no assertion after action, catch-all, conditional skip) | **Critical** |
| Depends on data another spec/run created; no run-unique prefix; no cleanup of own data | **Critical** |
| Secret / credential / personal data literal in spec | **Critical** |
| Real third-party call not stubbed outside live tier | **Critical** |
| Missing `@S-n` / `@AC-n` tag, or tag not matching what spec proves | Warning, cap 8 |
| Selector below hierarchy (role/label/text → test id → other) when better exists | Warning, cap 8 |
| DOM logic / repeated steps in spec instead of page object or command | Warning, cap 8 |
| Duplicates existing command / page object / fixture | Warning, cap 8 |
| Waits on implicit timing instead of element, request alias, or web-first assertion | Warning, cap 7 |
| Order-dependent tests (shared state across `it`/`test`) | Warning, cap 7 |
| E2E repo `AGENTS.md` / rules convention broken | Warning, cap 8 |

E2E repo own rules win on conflict (generic list = floor). Score 10 = zero findings above + lint clean.

## Output

Executive Summary (score, one sentence vs table, two-line assessment) → fix map when not Approved → last line `Code Review: {Approved|Rejected|Blocked}`. Caller records verdict + score.
