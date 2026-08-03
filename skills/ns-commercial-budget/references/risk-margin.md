# Risk and safety margin (commercial budget)

Every commercial budget must state an **error-margin / safety-margin percentage** grounded in explicit risks — never a silent round-up.

## Deliverable section (mandatory)

### Riscos e margem de segurança

1. **Risks table** (3–8 rows max) — only risks that affect estimate accuracy for this scope:

| Risco | Impacto na estimativa | Mitigação / premissa |
|-------|----------------------|----------------------|
| {risk} | {why hours/FP may drift} | {what reduces it, or open lacuna} |

2. **Margem de erro estimada:** `{p}%` — expected uncertainty band on the **base** effort (judgment; cite drivers).
3. **Margem de segurança aplicada ao orçamento:** `{s}%` — buffer **added** to base hours (and to Custo when rates exist) so the committed total is `base × (1 + s/100)`.
4. Short rationale linking risks → chosen `{s}%` (and why `{p}%` may differ from `{s}%` if it does).

## How to pick percentages

Start from uncertainty drivers (stack; do not invent fake risks):

| Driver | Toward higher margin |
|--------|----------------------|
| Many `[LACUNA]` / vague scope | ↑ |
| No reverse-spec / brownfield map | ↑ |
| Greenfield or unknown modules | ↑ |
| Junior / low product tenure | ↑ |
| External integration contract undefined | ↑ |
| Homologation environment / requester availability unclear | ↑ |
| Senior + deep product knowledge + clear reverse-spec + tight scope | ↓ |

**Suggested bands for safety margin `{s}%`** (mark `[ASSUMPTION]` if not negotiated):

| Profile | Safety margin `{s}%` | Typical error band `{p}%` |
|---------|----------------------|---------------------------|
| Low uncertainty | 10–15% | ±10–15% |
| Medium (default) | 20–25% | ±20–25% |
| High uncertainty | 30–40% | ±30–40% |

- `{p}%` = estimated **error margin** (how wrong the base might be).
- `{s}%` = **safety margin** baked into the budgeted hours (usually ≈ `{p}%` or slightly below if mitigations are strong).
- Do **not** stack multiple opaque buffers (e.g. inflate productivity **and** add 40% without saying so).

## Application

```
hours_base = from FP/CFP × productivity
hours_budget = hours_base × (1 + s/100)
```

Allocate `hours_budget` across macro activities (`references/macro-activities.md`), or allocate `hours_base` then scale each row by `(1 + s/100)` — same result if uniform.

When Custo is filled: `custo_budget = hours_budget × R$/h` (or FP × R$/PF per house rule) — still **never invent** rates.

## Forbidden

- Publishing a single hour total with no risk section.
- Inventing catastrophic risks unrelated to the scope.
- Commercial profit margin disguised as “segurança” — safety margin here is **estimate contingency**, not sales markup.
