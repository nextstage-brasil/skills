# Calculations — productivity scenarios and calendar Monte Carlo

## Productivity scenarios (h/FP)

Given `produtividade_atual` (hours per FP):

| Scenario | Role | h/FP |
|----------|------|------|
| P100 | Current baseline (not a goal) | `produtividade_atual` |
| P85 | Goal: 50% faster | `produtividade_atual × 0.50` |
| P50 | Goal: 85% faster | `produtividade_atual × 0.15` |

General rule: `X% faster` ⇒ multiply hours by `(1 − X/100)`.

Hours remaining (per scenario):

```
horas_restantes = fp_restante × h_fp_scenario
```

If phases have FP shares, allocate hours proportionally; keep the **same** phase list in all three scenarios.

## Effort days and calendar

```
dias_esforco = horas / horas_por_dia
```

Calendar dates use **business days only** (Mon–Fri) starting at `data_inicio`. State in notes whether holidays were **not** subtracted (default: holidays not subtracted unless human supplied a calendar).

`dias_uteis_por_semana` documents capacity intensity; when mapping effort days to calendar, walk forward one business day per effort day at the stated hours/day (serial single-track by default).

## O / M / P bands

- Same structure and same relative O/M/P bands in all three scenarios.
- Scale absolute O/M/P hours with the scenario's hour total (or scale from P100 absolutes by `h_fp_scenario / h_fp_p100`).
- If StdDev exceeds ~30% of PERT for a phase, flag High Uncertainty in notes — do not silently tighten P.

PERT (explain in doc; LLM may compute):

```
PERT = (O + 4M + P) / 6
```

## Monte Carlo (mandatory script)

Build one JSON config **per productivity scenario**. Units in the config must be **effort days** (hours ÷ `horas_por_dia`) so MC percentiles are effort days:

```json
{
  "stories": [
    {"id": "SDD", "o": 1.2, "m": 2.0, "p": 3.5},
    {"id": "IMP", "o": 4.0, "m": 6.0, "p": 9.0}
  ],
  "tracks": [
    {"story_ids": ["SDD", "IMP"], "parallelism_factor": 1.0, "start_offset": 0}
  ],
  "simulations": 10000
}
```

Use sequential phases in one track unless human specifies parallel tracks.

Run:

```bash
python3 ../../ns-project-manager/scripts/pert_montecarlo.py pert-config-p100.json
```

Map `monte_carlo.p50` / `p85` / `p95` (effort days) → calendar dates from `data_inicio`.

**Never** approximate percentiles. **Never** present a P50/P85/P95 delivery date not taken from script output for that scenario.

## Ceiling check

If `teto_dias_uteis` is set: for each scenario, compare calendar span (or effort days) at each percentile to the ceiling; fill "Cabe no teto?" with Sim/Não for the summary rows (use calendar P85 as the primary commitment check unless human says otherwise).

## Official commitment

Default client/internal commitment date = **calendar P85 of productivity scenario P100**. Document clearly if human selects P85 or P50 productivity scenario instead.
