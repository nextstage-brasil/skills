# Q2 Acceptance criteria

Turn intake into testable `AC-n` with criticality + origin. Output `<run_dir>/acceptance.yml` (shape: `../templates/qa-acceptance.schema.json`). Never stop for missing ACs — derive + mark (autonomy rule).

## Sources (priority)

| # | Source | `source` |
| - | ------ | -------- |
| 1 | `qa-handoff.md` from dev flow (intake `Dev handoff`; `stale` still usable for ACs) — reuse AC ids verbatim; its criticality suffix = hint, QA may re-rate | `issue` |
| 2 | Issue description AC section / checklist | `issue` |
| 3 | AC synthesis of `ns-execution-gitlab-issue` (`--ac-file`: checkbox lines under `#### Acceptance criteria:`) | `issue` |
| 4 | Version requirements when issue maps to a version: `docs/versions/<version_san>/sdd/requirements.md` `#### Acceptance criteria:` | `issue` |
| 5 | Human comments amending scope (intake) — later comment wins; cite it | `issue` |
| 6 | Issue intent + MR diff + bug "expected vs actual" when 1–5 silent | `derived` |

Same behavior in two sources → one AC; `origin` cites both.

## Rules

- One observable behavior per AC. Split compound ("save and notify" → 2 ACs).
- Ids `AC-1..n` in source order; stable across resumed runs.
- `text`: expected behavior as observable outcome (screen/API/data), not implementation.
- Bug report: AC = expected behavior + "defect no longer reproduces" with original steps.
- `ambiguity: ambiguous` when wording admits >1 test outcome. Pick most literal reading → `assumption`.
- `source: derived` or `ambiguity: ambiguous` → `assumption` REQUIRED (gate checks).
- Derived **critical** AC → verdict cap With reservations (`verdict-rubric.md`); report names the assumption.
- Do not invent product rules absent from all sources. No evidence → no AC; note gap in report §7.

## Criticality

| Level | Use when failure means |
| ----- | ---------------------- |
| `critical` | Core flow blocked, data loss/corruption, money, security, permissions |
| `high` | Main path of the change wrong |
| `medium` | Secondary path, edge case, recoverable error |
| `low` | Copy, cosmetic, non-blocking UX |

Weights (verdict confidence, judge coverage/depth): profile `verdict.criticality_weights`.

## Shape

```yaml
acceptance_version: 1
issue: <group/project>#<iid>
criteria:
  - id: AC-1
    text: "<observable expected behavior>"
    source: issue            # issue | derived
    criticality: critical    # critical | high | medium | low
    ambiguity: clear         # clear | ambiguous
    origin: "<issue section / comment / file>"
  - id: AC-2
    text: "<observable expected behavior>"
    source: derived
    criticality: medium
    ambiguity: clear
    assumption: "<what was assumed and why>"
```

YAML subset: `profile-schema.md` → YAML subset. Quote any `text` containing `: ` or `#`.

## Gate

Schema valid + unique ids + assumptions present. Checked with plan: `qa_gate.py --check-plan <run_dir>` (Q4).
