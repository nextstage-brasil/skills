# Risk and safety margin (commercial budget)

Safety margin % grounded in explicit risks — never silent round-up.

## Deliverable section (mandatory)

### Riscos e margem de segurança

1. **Risks table** (3–8 rows):

| Risco | Impacto na estimativa | Mitigação / premissa | Responsável |
|-------|----------------------|----------------------|-------------|
| {risk} | {why hours/FP may drift} | {mitigation or lacuna} | Cliente / Empresa / Ambos |

**Responsável** = who leads assess + mitigate:
- **Cliente** — decision, access, homologação, contract, data
- **Empresa** — delivery, architecture, implementation risk
- **Ambos** — shared dependency

2. **Margem de erro estimada:** `{p}%` — uncertainty on base effort.
3. **Margem de segurança aplicada:** `{s}%` — buffer on base hours: `base × (1 + s/100)`.
4. Short rationale: risks justify `{s}%` (and `{p}%` vs `{s}%` if different).

## Pick percentages

| Driver | Higher margin |
|--------|---------------|
| Many `[LACUNA]` / vague scope | ↑ |
| No reverse-spec / brownfield map | ↑ |
| Greenfield or unknown modules | ↑ |
| Junior / low product tenure | ↑ |
| External integration undefined | ↑ |
| Homologation / requester availability unclear | ↑ |
| Senior + clear reverse-spec + tight scope | ↓ |

**Suggested bands** (`[ASSUMPTION]` if not negotiated):

| Profile | Safety `{s}%` | Error `{p}%` |
|---------|---------------|--------------|
| Low | 10–15% | ±10–15% |
| Medium (default) | 20–25% | ±20–25% |
| High | 30–40% | ±30–40% |

- `{p}%` = how wrong base might be.
- `{s}%` = contingency baked into budgeted hours.
- Do not stack opaque buffers (inflate productivity **and** 40% without stating).

## Application

```
hours_base = Total FP × productivity (h/PF)   # or stated h/CFP rule
hours_budget = hours_base × (1 + s/100)
```

Allocate `hours_budget` across macro rows. Custo only when rates given.

## Forbidden

- Hour total without risk section.
- Catastrophic risks unrelated to scope.
- Profit margin disguised as segurança.
