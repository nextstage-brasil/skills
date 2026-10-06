# Suggested Function Point unit price

Use when the human **asks** the PF unit price, says they **do not know** it, or asks for a **market suggestion** (preço do ponto de função, quanto custa o PF, valor médio do PF, não sei o R$/PF). Do not volunteer this inside a budget that never mentioned price.

Human-supplied R$/h or R$/PF always wins. "Ignore pricing" / "sem preço" → Custo stays `—`.

## Frozen anchor (USD only)

Floripa private-market band on the anchor day: **BRL 550–850 per PF** (top of the private market; broader Brazil private quotes that day were about BRL 255–1,000, with a national mean near BRL 480–500 — context only, not the suggestion).

**Suggested mean** = midpoint of the Floripa band = **BRL 700.00 / PF**.

Frozen with Banco Central do Brasil **PTAX venda** on **2026-10-06 13:03:21** (`cotacaoVenda` **4.96980** BRL per 1 USD):

| Anchor | USD per PF |
|--------|------------|
| Band low (BRL 550) | 110.668437 |
| **Suggested mean (BRL 700)** | **140.850738** |
| Band high (BRL 850) | 171.033040 |

`usd = brl / 4.96980`, rounded half-up to 6 decimal places. **Runtime never reuses BRL 700** or this PTAX. Only the USD column is canonical.

## Convert on the day you answer

1. Read the USD row above. Do not skip the fetch because a previous turn already converted.
2. **BRL:** Banco Central PTAX do dia — `CotacaoDolarDia` for today's date (`MM-DD-YYYY`). Use `cotacaoVenda`. If today's bulletin is not published yet, use the latest published PTAX and say that date.
3. **Other local currency:** a same-day public web converter (central bank or a public FX API). Record source, pair, rate, and timestamp.
4. `local_per_pf = usd_per_pf × local_units_per_1_usd`. Round the **offer** to 2 decimal places. Show mean and the converted band.

## Offer (before any Custo cell)

Reply in the human's language. State: market suggestion (Florianópolis private midpoint), USD anchor, today's source + rate + timestamp, local mean and band. Ask whether to use it.

- **Accept** → that local mean is the R$/PF (or local/PF) rate. Premise: `[ASSUMPTION: PF unit price = Floripa market suggestion converted on {date} — {amount} {currency}/PF ({usd} USD × {rate} {source})]`. Then fill Custo = row FP × that rate (even if Esforço is `—`).
- **Own number** → use theirs; do not blend with the suggestion.
- **Decline** → `—` and `_pending rates_`.

A price-only question does **not** start a commercial budget.
