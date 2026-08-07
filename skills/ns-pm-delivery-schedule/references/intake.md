# Intake — mandatory inputs

If any required field is missing, send this fill-in once and **stop**. Do not invent FP, productivity, capacity, or start date.

```
[FILL IN — triple delivery schedule]

product_root: [path or "."]
version_san: [e.g. demanda-395-api-mppb]
persist_path: [default docs/versions/{version_san}/pm/]

# Productivity baseline (P100)
produtividade_atual_h_fp: [e.g. 6.94]

# Remaining work (FP)
fp_restante: [number]
# Optional: per-slice FP + what client gets per slice
# fp_slices: | slice | FP | entregável |

# Capacity
horas_por_dia: [e.g. 4]
dias_uteis_por_semana: [e.g. 5]
data_inicio: [YYYY-MM-DD — first business day of execution]
teto_dias_uteis: [optional integer or "none"]

# Remaining scope phases (exclude work already done)
# phase_id | phase_name | fp_or_hours_share | notes
# e.g. SDD | Spec-driven remaining | … |
#      IMP | Implementation | … |
#      VAL | Human validation | … |
#      DEP | Deploy | … |

# Three-point bands (same relative O/M/P across scenarios; absolute hours scale with h/FP)
# If omitted, ask — do not invent. Quick mode: mark [ASSUMPTION] with stated default bands.
# phase_id | O_factor | M_factor | P_factor
# (factors multiply the scenario's phase hours as O/M/P, or give absolute O/M/P hours for P100)

# Optional experiential estimate (human lived harness — separate block, not a productivity scenario)
estimativa_experiencial: [free text or "none"]
```

## Quick mode

On `quick mode` / `proceed with assumptions`:

- Still require: `produtividade_atual_h_fp`, `fp_restante`, capacity, `data_inicio`.
- Phase split + O/M/P may be `[ASSUMPTION]` — state them in the doc Premissas.
- Never invent R$ or commercial rates.

## Optional inputs

- Links to existing `commercial-budget-*.md` for Section 0 context (read if present; do not regenerate FP).
- Human override of acceleration factors (default 50% / 85% faster only).
- Explicit choice of official commitment scenario (default: calendar P85 of productivity P100).
