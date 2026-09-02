# Feature — Descrição detalhada

**Purpose:** client Features feed an **acceptance contract**. Descrição = clauses (object, conditions, limits). Critérios de aceite = checkboxes the contract signs. Not a tutorial, not sales copy, not a second Objetivo.

**Content bar (both docs):** every contractual fact the Feature needs — who, where, what, rules that bind acceptance, what this delivery excludes. Missing object, condition, or boundary fails. Padding fails. Same facts in both docs; client is a structured rewrite, not a shorter summary.

| Document | Format |
|----------|--------|
| `commercial-budget-internal.md` | Compact prose **or** the same subsections as client. Same facts. No extra adjectives. |
| `commercial-budget-costumer.md` | **Structured** — never a run-on paragraph. Follow structure below. |

## Contract map

| Acceptance-contract field | Where it lives |
|---------------------------|----------------|
| Object (what is accepted) | Feature title + **O quê** / **Objeto e condições** |
| Conditions (where, who, how, calibration) | Lead-term bullets under **Objeto e condições** |
| Signed checks | **Critérios de aceite** only |
| Exclusions / future decisions / mandatory procedures | **Limites desta entrega** |

Descrição does not repeat critérios verbatim. Critérios do not restate the title.

## Client export structure (mandatory)

Under `**Descrição detalhada:**` in `commercial-budget-costumer.md`, use **1–3** subsections:

1. **Bold subsection title** = contract block, not a magazine heading.
2. Optional one-sentence intro **only** if it adds a fact the bullets do not (usually omit).
3. Bullets: **Bold lead term:** then one fact. Lead term = field name (**Onde**, **O quê**, **Quem**, **Calibração**, **Atualização**).

Blank line between subsections.

### Subsection titles

Pick only blocks the Feature needs. Do not invent filler.

| Contract block | Title |
|----------------|--------|
| Object + conditions | **Objeto e condições** |
| Extra binding rules not already in objeto | **Regras** |
| Exclusions, deferred decisions, mandatory procedures | **Limites desta entrega** |

Use **1** subsection when the Feature is a single campaign or check. Use **2–3** when object, extra rules, and limits all exist. Never more than 3.

Do **not** use tutorial titles (**Como funciona na prática**, **Resumo do fluxo de trabalho**) unless the Feature is an operator journey **and** those labels still map 1:1 to contract fields (prefer **Objeto e condições**).

## Density rules

- One contractual fact per bullet. Cut the restatement of the Feature title.
- No adjective without a test that will appear in critérios (drop “confiável”, “empírica”, “na prática” unless the criterion defines it).
- Numbers from a descritivo that will be **re-measured** are starting points — say so once under **Calibração**; do not treat them as contracted production values.
- Internal: same facts; do not inflate to look “richer” than client.

## Anti-patterns

- Client Descrição as a single dense paragraph.
- Tutorial / linguiça: restating the title, “como funciona na prática”, process narration, examples that do not bind acceptance.
- Vague or incomplete Descrição (missing object, condition, or limit when the brief has them).
- Client shorter or less complete than internal for the same Feature.
- Generic titles (**Detalhes**, **Descrição**, **Informações**).
- Bullets without bold lead terms when listing distinct facts (client).
- Critérios copied into Descrição, or Descrição copied into critérios.
- Technical leaks (classes, schemas, endpoints) — same list as `product-voice.md`.

## Canonical example — client export (PT-BR)

**Before (forbidden):** tutorial paragraph or padded “Como funciona na prática” restating the title.

**After — operator journey:**

**Objeto e condições**

* **Onde:** mesma aplicação de chat já entregue.
* **Estados:** chat centralizado (diálogo e envio); visão dividida após arquivo (chat à esquerda, Lista de Ações à direita); somente leitura após “de acordo”.
* **Lista de Ações:** cartão com destino, verbo (Criar, Atualizar, Vincular, Anexar), estado e origem no documento.
* **Quem:** operador, mesmas permissões do cadastro manual.

**Regras**

* **Ajuste:** conversa ou cartão; mesmo efeito.
* **Gravação:** só com confirmação “de acordo”; “ok” não grava.
* **Anexo:** arquivo vincula só se o item for aceito.
* **Consistência:** consultas, relatórios e vínculos iguais ao cadastro após efetivação.

**After — homologation / campaign (narrow Feature, two blocks):**

**Objeto e condições**

* **Onde:** equipamento do órgão, 100% offline.
* **O quê:** homologação dos três papéis do descritivo.
* **Calibração:** contexto e memória medidos no hardware; valores do descritivo são ponto de partida, não valor de produção.

**Limites desta entrega**

* **Atualização de modelos:** mídia segura e procedimento documentado (obrigatório nesta entrega).
* **GPU extra:** fora de cotação se a carga simultânea não atingir o throughput; decisão futura.

#### Critérios de aceite (same Feature — not in Descrição)

- [ ] Os três papéis passam nos testes no equipamento do órgão, sem rede.
- [ ] Português nativo, chamada de ferramentas e saída estruturada nos papéis homologados.
- [ ] Relatório de calibração registra contexto e memória medidos (não os valores do descritivo).
- [ ] Procedimento de carga de modelos por mídia segura está documentado e foi seguido.

Internal may state the same facts as short prose.
