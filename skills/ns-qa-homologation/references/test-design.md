# Q4 Test design

ACs + impact → risk-ordered scenarios. Output `<run_dir>/plan.yml` (shape: `../templates/qa-plan.schema.json`). Gate: `python3 scripts/qa_gate.py --check-plan <run_dir>`.

## Scenario types (ledger enum)

| Type | Proves |
| ---- | ------ |
| `positive` | AC behavior with valid input / happy path |
| `negative` | Invalid input, missing permission, error path handled |
| `business_rule` | Rule boundary (limits, states, calculations, role variants) |
| `regression` | Impact area still works (smoke) |

## Minimum coverage

| Criticality | Required types per AC |
| ----------- | --------------------- |
| `critical`, `high` | `positive` + `negative` + `business_rule` |
| `medium`, `low` | `positive` |

Type truly not applicable → `waivers: [{ac, type, reason}]` (`negative` / `business_rule` only). Waivers listed in report §5; judge counts a waived type as missing depth (not actionable, `homologation-judge.md`).

Every AC ≥1 scenario. Every area ≥1 scenario. Unlimited scenario count (`budget.max_scenarios`).

## Risk order

Scenario list order = execution order. Rank = highest criticality among `covers`. List MUST be non-increasing by rank (critical first) — gate rejects otherwise. Same rank: direct areas before indirect; `automate: false` exploratory last.

## Lane

| Condition | Lane |
| --------- | ---- |
| `execution.runner` ≠ `none`; deterministic assertion possible | `runner` |
| Usability, visual, responsive, exploratory | `browser` |
| `runner: none` | `browser` only (critical AC verdict cap, `verdict-rubric.md`) |

Browser tool + capability detection: `browser-tools.md`.

## Data

`data`: precondition in one line, or `none`. Created later (Q5) with `data.run_prefix` + run id in disposable env only. Hard-to-create data → note mock candidate following `data.mock.order` (most real first); scenario `data_source` recorded at execution.

## Existing coverage (no free grep)

Under `execution.e2e_root`:

1. **Tag:** spec titles containing exact token `@AC-n` or `@S-n` (dev-flow tag convention). Token match only.
2. **Route → spec map:** list navigations per spec (`cy.visit(` / `page.goto(` targets) → route; map routes of direct areas to specs.

Record hits in `existing` as `"<spec path> (@AC-n)"` or `"<spec path> (route <path>)"`. Hit ≠ coverage proof: scenario stays in plan (reuse candidate at execution). No feature-word text search.

`automate: true` → runner-lane scenario with no `existing` hit (input to Q8 at L3: `automation-handoff.md`).

## Shape

```yaml
plan_version: 1
areas:
  - { id: IA-1, kind: direct, summary: "<surface>" }
scenarios:
  - id: S-1
    title: "<what is verified>"
    covers: [AC-1]
    areas: [IA-1]
    type: positive
    lane: runner
    data: "<precondition or none>"
    existing: []
    automate: true
waivers: []
```

## Gate loop

`--check-plan` exit 2 → fix plan per `errors`, re-run. Same error twice with no plan change → stall rule (stop + ask). Exit 3 → artifact missing/unparseable: rewrite file.
