# Phase 5 — Forecast (PERT + Monte Carlo)

Quantitative PM. PERT/variance = reasoned. **Monte Carlo = script only, never LLM**.

**Nested workflow:** human want **triple productivity** schedule (current h/FP = P100, 50% faster = P85, 85% faster = P50) with FP remaining + capacity — read **`references/ns-delivery-schedule/workflow.md`**, not this phase. Phase 5 = story-level O/M/P only.

## Step 1 — Collect three-point estimates

Per story: O (optimistic), M (most likely), P (pessimistic), same unit (weeks or days). Single number only: ask three points — don't split one estimate yourself.

Missing three-points or parallelism: send template:

```
[FILL IN — three-point estimate per story, same unit]
ID | Title | O | M | P | Notes

Example:
US-01 | Speed Alerts           | 2 | 3 | 5 | Risk: GPS integration bug in rural areas
US-03 | Behavior Score         | 3 | 4 | 6 | New hardware (accelerometer) — higher uncertainty

[FILL IN — team parallelism]
People working in parallel: [X]
Effective parallelism factor (accounting for dependencies): [X]
Any track starting later (e.g. hardware-blocked): [start offset in weeks]
```

## Step 2 — PERT and variance (you calculate and explain)

Per story:
- `PERT = (O + 4M + P) / 6`
- `Variance = ((P - O) / 6)²`
- `StdDev = √Variance`

P < 1.5× M: question pessimistic bias. StdDev > 30% of PERT: "High Uncertainty", flag.

## Step 3 — Monte Carlo (always the script)

Ask parallel tracks: people in parallel, effective parallelism factor per track, start offsets (e.g. hardware-blocked).

Build config JSON, run:

```bash
python3 scripts/pert_montecarlo.py config.json
```

Example config:
```json
{
  "stories": [{"id": "US-01", "o": 2, "m": 3, "p": 5}],
  "tracks": [{"story_ids": ["US-01"], "parallelism_factor": 1.3, "start_offset": 0}],
  "simulations": 10000
}
```

Use P50/P85/P95/mean from script — never approximate.

## Output format

1. **PERT table** — Story, O, M, P, PERT, Variance, StdDev, Status.
2. **Top 3 highest-uncertainty stories** — recommended action cut uncertainty.
3. **Monte Carlo results** — P50/P85/P95/mean; **P85 = committed delivery date** for client.
4. **Audience translation** — four short paragraphs: Technical, Product, Executive, Client.

## Behavioral constraints

- Never Monte Carlo "in head" — always script.
- Never present percentile not from script output.
