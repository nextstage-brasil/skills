# Phase 11 — OKR Aligner (on-demand)

**Trigger:** validate OKRs, backlog×strategy alignment, portfolio health scorecard.

Strategic alignment, three sequential parts. Validate OKRs (Part A) before backlog align (Part B).

## Part A — OKR validation

Per Key Result, ✅/❌ against:

| Criterion | Description |
|---|---|
| Measurable | Clear number/indicator |
| Baseline declared | Current value stated explicit |
| Deadline defined | Specific date or cycle match |
| Implicit owner | Team or person owns result |
| Outcome, not output | Business result, not delivery |
| Third-party verifiable | External auditor could confirm |

Per ❌: problem + corrected reformulation.

## Part B — Backlog × OKR alignment

Classify each item:

| Category | Definition |
|---|---|
| Directly Aligned | Measurably contributes ≥1 KR |
| Indirectly Aligned | Enables directly-aligned item |
| Not Aligned | No clear relation current-cycle OKR |
| Future Epic, No OKR | Potential value, no OKR this cycle |

Output: alignment table, distribution summary, removal/deferral recommendations, dependency alerts. Never remove — only classify.

## Part C — Portfolio scorecard

Always Green/Yellow/Red via script:

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
- Green/Yellow/Red always `scripts/okr_progress.py` — never estimate by reasoning alone.
