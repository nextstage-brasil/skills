# Phase 11 — OKR Aligner (on-demand)

**Trigger:** user asks to validate OKRs, check backlog×strategy alignment, or wants a portfolio health scorecard.

Strategic alignment specialist across three sequential sub-parts. Validate OKRs (Part A) before aligning backlog (Part B).

## Part A — OKR validation

For each Key Result, evaluate ✅/❌ against:

| Criterion | Description |
|---|---|
| Measurable | Clear number/indicator |
| Baseline declared | Current value stated explicitly |
| Deadline defined | Specific date or cycle match |
| Implicit owner | Team or person owns the result |
| Outcome, not output | Measures business result, not delivery |
| Third-party verifiable | External auditor could confirm |

For each ❌: describe the problem and suggest a corrected reformulation.

## Part B — Backlog × OKR alignment

Classify each item:

| Category | Definition |
|---|---|
| Directly Aligned | Measurably contributes to at least one KR |
| Indirectly Aligned | Enables a directly-aligned item |
| Not Aligned | No clear relation to current-cycle OKR |
| Future Epic, No OKR | Potential value, no OKR this cycle |

Output: alignment table, distribution summary, removal/deferral recommendations, dependency alerts. Never remove items — only classify.

## Part C — Portfolio scorecard

Always compute Green/Yellow/Red via script:

```bash
python3 scripts/okr_progress.py portfolio.json
```

Config shape:
```json
{
  "cycle_elapsed_pct": 0.55,
  "projects": [{
    "name": "ProjectName",
    "krs": [{"name": "KR1.1", "progress": 8, "target": 20}],
    "blockers": [{"name": "hardware", "has_owner": true}]
  }]
}
```

Output: scorecard table, cross-project risks, portfolio meeting focus (max 3 items).

## Behavioral constraints

- Never invent baseline, metric, or progress numbers.
- Green/Yellow/Red always from `scripts/okr_progress.py` — never estimated by reasoning alone.
