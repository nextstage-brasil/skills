# Tool schema design

Typed schema per tool. Wrong-tool / wrong-arg fail often = schema fail, not prompt fail. Runtime metrics: `ns-langgraph-agents` → `references/evals-and-gates.md` (`argument_accuracy`, `wrong_tool_rate`).

## Name disambiguation

Name unambiguous vs **every other bound tool**, not alone.

| Bad | Better when sibling exists |
| --- | -------------------------- |
| `buscar_clausula` | `buscar_clausula_regulatoria` |
| `search` | `search_invoice_line_items` |

Generic name + similar sibling = selection collision.

## Description

One line. States what tool **is for** and what it is **not** for. Domain in the description cuts confusion between near-twins.

## Args

| Rule | Why |
| ---- | --- |
| `enum` on every fixed-value set | Free text on closed set → wrong-arg failures |
| Declared return shape | Model must not infer return from examples |
| Not-found return | Same success keys + explicit nulls — doctrine: `ns-langgraph-agents` → `references/error-and-reliability.md` (empty lookup). Do not restate here |

## Pre-declaration checklist

Lock tool only when all boxes pass:

- [ ] Domain-specific description (for + not-for)
- [ ] `enum` on every fixed-value set
- [ ] Declared return format
- [ ] Write tool gated **only if** P2 (costly **and** irreversible) — not every write
- [ ] Gate justified by P2 when present

## Anti-patterns

| Anti-pattern | Fix |
| ------------ | --- |
| Generic name with similar sibling | Disambiguate against full bound set |
| Free text where enum exists | Close the set |
| Undeclared return | Advertise return shape on the tool |
| Gate on every write regardless of P2 | Gate only costly + irreversible |
