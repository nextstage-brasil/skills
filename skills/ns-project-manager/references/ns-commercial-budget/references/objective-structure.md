# Objetivo principal — three-block structure

Both `commercial-budget-internal.md` and `commercial-budget-costumer.md` share the **same Objetivo text** (client export copies internal — no engineering framing).

## Structure (mandatory)

Under `## Objetivo principal da versão`, exactly three subsections:

### O que buscamos

- **Paragraph 1:** Outcome pursued — the problem removed or capability unlocked, in product/commercial language.
- **Paragraph 2 (when context exists):** Who is affected, scale from brief, current workaround and why it does not scale.

No technology stack, no engineering-area framing.

### O que é ({short name for this version's concept})

- **Paragraph 1:** Plain definition of the mechanism or capability — what it does when the user or product interacts with it.
- **Optional:** `Camada | Papel` table when the solution spans multiple product layers — stakeholder-facing labels (admin screen, partner integration, rule store), not schemas, class names, or endpoints.
- **Optional:** Concrete example grounded in persona from brief — same shared asset, different visibility, etc.

Use a partner or platform name only when it is the **product concept** the buyer recognizes. Prefer product labels over implementation detail.

### O que entregamos

- **Paragraph:** End-to-end scope in this version — what ships and how the pieces connect in product terms.
- **`Resultado esperado:`** One labeled sentence — organizational outcome (scale onboarding, reduce support load per user × app, self-service for client admin after training, etc.).

## Voice

Same narrative rules as `product-voice.md`. **O que é** may include one `Camada | Papel` table; avoid raw schema, field lists, or API paths.

## Anti-patterns

- Single blob paragraph under Objetivo without the three subsections
- Engineering backlog framing ("implementar módulo X", "criar tabela Y")
- Duplicating the Feature list under **O que entregamos**
- **Resultado esperado** buried inside a paragraph without the label
- Second **O que é** or **Valor agregado** disguised as Objetivo — keep decision-maker pitch in `sales-value-speech.md` only
