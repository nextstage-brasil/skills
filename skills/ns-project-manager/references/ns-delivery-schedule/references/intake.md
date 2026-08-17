# Intake — mandatory inputs

Ask human **only** for capacity and start date when missing. Infer rest
(ceiling, remaining phases, O/M/P bands). Do not invent FP, productivity, or
start date / hours-per-day / business-days-per-week.

Never dump `[FILL IN]` / YAML / key-value form as main reply.

## Ask human (only these)

If missing, numbered questions in human's language (pt_BR default):

1. Quantas horas por dia você aloca neste trabalho? (ex.: 4)
2. Quantos dias úteis por semana? (ex.: 5)
3. Qual a data de início? (AAAA-MM-DD — primeiro dia útil de execução)

Also ask once if missing from budget/context: `produtividade_atual_h_fp`,
`fp_restante`, `version_san`.

Show compact **already known** table, then **only** unanswered questions
above. Stop and wait.

### Example shape (pt_BR — omit answered items)

```
Já tenho do orçamento: version_san, produtividade, FP restante.
Falta só capacidade e início.

Já preenchido
| Campo | Valor |
|-------|-------|
| … | … |

Perguntas
1. Quantas horas por dia você aloca? (ex.: 4)
2. Quantos dias úteis por semana? (ex.: 5)
3. Qual a data de início? (AAAA-MM-DD)
```

## Infer (do not ask)

Mark inferred values `[ASSUMPTION]` in Premissas.

| Field | How to infer |
|-------|----------------|
| `teto_dias_uteis` | Default `none` (no ceiling) unless human already stated one |
| Remaining phases | From commercial budget macros / remaining scope — group into short phase list (e.g. SDD, implementation+auto tests, UAT, deploy) with FP or % shares that sum to `fp_restante` |
| O/M/P bands | Default factors **0.8 / 1.0 / 1.4** on each phase's P100 hours |
| `persist_path` | `docs/versions/{version_san}/pm/` |
| `estimativa_experiencial` | Omit — do not ask; include only if human volunteers unprompted |

Never invent R$ or commercial rates. Never invent `produtividade_atual_h_fp`,
`fp_restante`, `horas_por_dia`, `dias_uteis_por_semana`, or `data_inicio`.

## Required from human or budget (internal)

| Field | Source |
|-------|--------|
| `version_san` | Budget / ask once |
| `produtividade_atual_h_fp` | Budget / ask once |
| `fp_restante` | Budget / ask once |
| `horas_por_dia` | **Ask** |
| `dias_uteis_por_semana` | **Ask** |
| `data_inicio` | **Ask** |

## Optional inputs (never lead with these)

- Human override of ceiling, phase split, O/M/P, or acceleration factors — only if they volunteer.
- Explicit choice of official commitment scenario (default: calendar P85 of productivity P100).
- Links to `commercial-budget-*.md` (read if present; do not regenerate FP).

## Forbidden in intake reply

- Asking about teto, fases, O/M/P, or estimativa experiencial by default
- Leading with `[FILL IN — …]` code block
- Presenting inferred capacity/start as facts without human answers
