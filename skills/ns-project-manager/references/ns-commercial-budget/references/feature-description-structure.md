# Feature — Descrição detalhada

**Content bar (both docs):** every Descrição detalhada must be **rich in detail** — states, rules, actors, boundaries, what the product allows/blocks. Thin one-liners fail the dual-audience test (`product-voice.md`). Descrição = narrative scope; critérios de aceite = verifiable checks (do not duplicate verbatim).

**Presentation differs by document.**

| Document | Format |
|----------|--------|
| `commercial-budget-internal.md` | Continuous prose OK (one or more dense paragraphs). Same richness as client. |
| `commercial-budget-costumer.md` | **Structured** — never a single run-on paragraph. Follow structure below. |

Same product voice. Client text is a **structured rewrite** of the same scope facts — not a shorter summary.

## Client export structure (mandatory)

Under `**Descrição detalhada:**` in `commercial-budget-costumer.md`, use **1–3 thematic subsections**:

1. **Bold subsection title** in product language (e.g. **Resumo do fluxo de trabalho**, **Regras de gravação e consistência**).
2. Optional one-sentence intro after the title when it orients the reader.
3. Bulleted list — each item starts with **Bold lead term:** followed by the explanation.

Separate subsections with a blank line.

### Subsection selection

Pick titles that match what the Feature actually delivers — do not invent filler sections.

| Dominant theme | Example subsection title |
|----------------|--------------------------|
| Journey, UI states, operator steps | **Resumo do fluxo de trabalho** / **Como funciona na prática** |
| Business rules, validation, persistence | **Regras de gravação e consistência** / **Regras de validação** |
| Roles, permissions, who acts | **Quem usa e como** |
| Boundaries within this Feature | **Limites desta entrega** |

Use **1 subsection** when the Feature is narrow; **2–3** when it spans flow + rules + actors. Never more than 3.

## Internal (allowed)

Prose paragraphs covering the same facts. Prefer readable density over wall-of-text when possible, but **structure is not required**. Do not strip detail to make internal shorter than client.

## Anti-patterns

- Client Descrição as a single dense run-on paragraph (forbidden on client export only).
- Vague or thin Descrição on either doc (missing states, rules, or boundaries).
- Client shorter / less complete than internal for the same Feature.
- Generic subsection titles on client (**Detalhes**, **Descrição**, **Informações**).
- Bullets without bold lead terms when listing distinct states, rules, or roles (client).
- Technical leaks (classes, schemas, endpoints) — same forbidden list as `product-voice.md`.

## Canonical example — client export (PT-BR)

**Before (forbidden on client):**

> Na mesma aplicação de chat já entregue, o operador vê três estados: chat centralizado; depois do arquivo, chat à esquerda e Lista de Ações à direita …

**After (required on client):**

**Resumo do fluxo de trabalho**

Seguindo a mesma arquitetura do modelo de chat entregue, a interface se estrutura em três estados operacionais contínuos:

* **Chat centralizado:** Interface focada no diálogo inicial e no envio de documentos.
* **Visão dividida (pós-arquivo):** O chat permanece à esquerda para ajustes conversacionais, enquanto a direita exibe a Lista de Ações. Os cartões organizam os destinos, verbos de ação (Criar, Atualizar, Vincular, Anexar), estado do item e a origem exata no documento.
* **Modo somente leitura (pós-de acordo):** A conversa é congelada e o sistema exibe o progresso de execução item a item, finalizando com um relatório dos resultados e links diretos para o cadastro.

**Regras de gravação e consistência**

* **Controle de ajustes:** As modificações priorizam a conversa, mas correções pontuais diretamente no cartão geram o mesmo efeito.
* **Validação formal:** A gravação exige a confirmação explícita ("de acordo"); interações informais como "ok" não acionam o registro. O consentimento fica auditável e reconstituível.
* **Permissões e anexos:** A gravação utiliza as mesmas regras e permissões do cadastro manual, realizada em nome do operador. O arquivo enviado só é vinculado como anexo se o item correspondente for aceito.
* **Integridade dos dados:** Consultas, relatórios e vínculos da lista mantêm total coerência com o sistema de cadastro após a efetivação.

Internal may keep the same facts as continuous prose.
