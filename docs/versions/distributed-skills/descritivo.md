# Plano de Execução (v5.5) — Reestruturação do NextStage Skills

**Repositório:** `nextstage-brasil/skills` (único, permanece público)
**Decisão de arquitetura:** monorepo com pastas por domínio; `harness` como workspace npm publicável dentro do mesmo repo. Conteúdo de `business/` público como qualquer outro domínio.

---

## Decisão v5 — consolidar o pipeline SDD dentro de `ns-spec-driven`

**Uso real confirmado:** o operador aciona só `/ns-spec-driven`. A face retoma pelo disco (`docs/versions/`, `execution-handoff.md`, `references/session-continuity.md`). Ninguém invoca `ns-sdd-clarify-requirements`, `ns-sdd-requirements-generator`, `ns-sdd-analyze-consistency`, `ns-sdd-task-generator`, `ns-sdd-version-partitioner`, `ns-sdd-execution-handoff-generator` ou `ns-execution-orchestrator` como skill isolada.

**Consequência:** essas 7 unidades deixam de ser skills de catálogo. O corpo vira `references/` de `ns-spec-driven`. Matching granular por `description` de fase deixa de existir de propósito — o trigger único é `ns-spec-driven` (incluindo “continuar / retomar”).

**Permanecem skills** (consumidores fora do ciclo SDD completo):

| Skill atual | Por quê fica skill |
| ----------- | ------------------ |
| `ns-spec-driven` | Face / trigger único do ciclo |
| `ns-sdd-living-spec-consolidator` | `ns-code-coder` (ad-hoc), `ns-proto-creator`, `ns-proto-visual-guide`, preset `frontend-prototype` |
| `ns-code-coder` | Quick fix, C2, execução de handoff |
| `ns-code-reviewer` | MR/PR; `ns-execution-gitlab-issue`; close do ciclo |
| `ns-code-investigator` | Diagnóstico sem implementar |
| `ns-code-autonomous` | Motor local; GitLab issue |
| `ns-pm-unit-test-task-generator` / `ns-pm-e2e-test-task-generator` | Complementos de planning de teste; já entram no preset, não no núcleo das fases |

**Retomabilidade:** não depende de skill por fase. Estado já está em artefatos. `ns-spec-driven` lê `session-continuity.md` e o `references/` da fase correspondente.

**`depends` / `skills#861`:** some a cadeia de peers que só existiam para o pipeline (6 fases + orchestrator). `ns-spec-driven.depends` fica: harness, prepare, coder, autonomous, reviewer, living-spec, langgraph.

**Subagentes:** `task-writer-agent` permanece. O mapped skill deixa de ser `ns-sdd-task-generator`; o bridge carrega `ns-spec-driven/references/task-generator.md`. Clarify / specify / consistency / partition continuam in-session (já eram “no v1 bridge”).

**Limite de 500 linhas:** `SKILL.md` da face fica roteamento + tabela de fases. Corpos das fases não entram no `SKILL.md`.

**Ordem:** Fase 1.5 (consolidar no layout plano atual) **antes** de mover pastas — não mover 7 skills para depois apagá-las.

---

## Decisão v5.1 — execução fora de `sdd/`

**Grafo:** `ns-spec-driven` → coder / reviewer / investigator / autonomous. O inverso **não** existe. Quick fix, C2, GitLab issue e review de MR rodam sem `/ns-spec-driven`.

**Domínio `code/`:** `ns-coder`, `ns-reviewer`, `ns-investigator`, `ns-autonomous`. `sdd/` = face + living-spec.

**Preset `implementation`:** só `code/` (+ living-spec via `depends` do coder). Sem face. `--preset spec-driven` faz `extends: implementation` e acrescenta a face + geradores de task de teste.

---

## Decisão v5.2 — orchestrator entra na face

Mesmo critério das 6 fases: o operador nunca aciona `/ns-execution-orchestrator`. A face já despacha versão particionada quando existe `version-roadmap.md`.

Corpo + `references/slice-dispatch.md` → `ns-spec-driven/references/orchestrator.md` (+ slice-dispatch). `retired-skills.json`: `ns-execution-orchestrator` / `execution-orchestrator` → `ns-spec-driven`. Execute routing da face: **ler** o reference; slices continuam via `coder-agent` (MUST).

> O preset `implementation` antigo (2026-07-25) foi morto por ser quase-cópia do `spec-driven`. Este é outro contrato: execução **sem** a face SDD.

**`run-implementation.md`:** mora em `ns-coder/references/` (quem executa). A face SDD gera `execution-handoff.md` e aponta para esse arquivo. Instalar só `implementation` não exige a skill `ns-spec-driven`.

---

## Decisão v5.4 — `nsutil-mcp` sai do catálogo

Não é skill deste repositório. O artefato nasce **na aplicação** no uso (NsUtil MCP no produto). Não migrar para `labs/`.

Fase 1.5: apagar `skills/nsutil-mcp/`, remover de `catalog.json` e presets. **Não** criar retired-alias — `MIGRATION.md` registra remoção sem substituto.

---

## Decisão v5.5 — harness `1.x` (quebra `0.x`)

Pacote hoje: `@nextstage-brasil/harness@0.38.2`. Esta entrega publica **`1.0.0`**.

- `npm version major` — não `minor`.
- `requires_harness: ">=1.0.0"` no manifest das skills = major do pacote, não um contrato paralelo.
- Harness `0.n` **não** instala skills desta entrega. Sem ponte de upgrade automático: reinstall `npx @nextstage-brasil/harness@1`.
- Tag git da entrega: `v1.0.0` (substitui o `v2.0.0` das versões anteriores deste plano).

---

## 0. Diagnóstico

Problemas identificados no estado atual:

1. `packages/harness` contém lista hardcoded de skills/presets — acoplamento que exige tocar no CLI para qualquer mudança de catálogo.
2. Resolução de `depends` entre skills depende de `vercel-labs/skills#861` (ainda pendente). Até lá, instalação de peers é manual. Workaround explícito definido na Fase 2. A Fase 1.5 elimina os 6 `depends` internos do pipeline SDD.
3. `@nextstage-brasil/harness` não publicado no npm.
4. `skills/` é um nível plano de ~35 skills sem organização por domínio — dificulta instalação seletiva e navegação.
5. Sem CI que valide integridade das cadeias de `depends` após mudança de caminhos.
6. Artefato residual no README (`pull && push --staged --fix && sleep 30 && pull`) — não executar, remover na Fase 7.
7. Não há `MIGRATION.md` na raiz — após mover skills, instalações existentes quebram silenciosamente.
8. Sete workers SDD/execução-de-versão são skills de catálogo sem invocação standalone (`ns-sdd-*` + `ns-execution-orchestrator`).

---

## 1. Fase 1 — Contrato do harness (design, sem mover código)

Criar dois documentos de design e o índice de presets. Esta fase é só escrita — nenhum arquivo de código muda.

### 1.1 `docs/harness-contract.md`

Definir o manifest que toda skill usa para se registrar no harness. Campos obrigatórios:

```yaml
# Exemplo de manifest de skill (frontmatter do SKILL.md ou arquivo manifest.yaml separado)
requires_harness: ">=1.0.0" # major do pacote harness (1.x); rejeita 0.n
provides:
  - gate:requirements-consistency
  - artifact:docs/specs/requirements.md
consumes:
  - artifact:docs/specs/requirements.md
```

Regras do contrato:

- `requires_harness` usa semver do **pacote** `@nextstage-brasil/harness`. Skills desta entrega exigem `>=1.0.0`. Harness `0.n` recusa.
- `provides` lista capacidades/artefatos que a skill produz.
- `consumes` lista o que a skill espera encontrar antes de ser invocada.
- O campo `depends` existente nas skills segue o formato do Skills CLI (compatibilidade). O manifest acima é uma camada adicional, não substituto.
- Fases internas de `ns-spec-driven` **não** têm manifest próprio. Artefatos (`requirements.md`, `task-NNN-*.md`, `execution-handoff.md`) são `provides` da face.

### 1.2 `docs/preset-schema.md`

Schema declarativo de preset (monorepo — `includes` referencia caminhos internos, não `repo#skill`):

```json
{
  "name": "spec-driven",
  "requires_harness": ">=1.0.0",
  "description": "Ciclo completo SDD sem integrações externas",
  "extends": "implementation",
  "includes": [
    "skills/sdd/ns-spec-driven",
    "skills/testing/ns-pm-unit-test-task-generator",
    "skills/testing/ns-pm-e2e-test-task-generator"
  ]
}
```

`implementation` lista `code/*`. Face puxa living-spec, prepare, langgraph. Preset **não** lista as 7 unidades internas (6 fases + orchestrator).

### 1.3 `presets/index.json`

Índice central que o harness lê para descobrir presets. Mapeia nome → caminho do arquivo JSON no repo:

```json
{
  "implementation": "presets/implementation.json",
  "spec-driven": "presets/spec-driven.json",
  "spec-driven-gitlab": "presets/spec-driven-gitlab.json",
  "project-manager": "presets/business.json",
  "business": "presets/business.json",
  "frontend-prototype": "presets/frontend.json",
  "frontend": "presets/frontend.json",
  "full": "presets/full.json",
  "full-experimental": "presets/full-experimental.json"
}
```

O harness lê este arquivo em tempo de execução — nunca embute a lista no código do CLI.

> **Compatibilidade de presets:** `project-manager` e `frontend-prototype` são os nomes atuais e continuam funcionando — apontam para os mesmos arquivos JSON que os nomes novos (`business` e `frontend`). Nenhum usuário existente quebra. Os nomes novos coexistem como aliases.

**Critério de saída da Fase 1:** `docs/harness-contract.md`, `docs/preset-schema.md` e `presets/index.json` criados e revisados. Nenhum código alterado.

---

## 1.5 Fase 1.5 — Consolidar workers SDD (PR próprio, layout plano)

Executar **antes** da Fase 2. Não muda pastas de domínio.

### 1.5.1 Mover corpos → `skills/ns-spec-driven/references/`

| Origem (skill a retirar do catálogo) | Destino |
| ------------------------------------ | ------- |
| `ns-sdd-clarify-requirements/SKILL.md` (corpo) | `ns-spec-driven/references/clarify-requirements.md` |
| `ns-sdd-requirements-generator/SKILL.md` + `references/stacks/` | `ns-spec-driven/references/requirements-generator.md` + `references/stacks/` |
| `ns-sdd-analyze-consistency/SKILL.md` | `ns-spec-driven/references/analyze-consistency.md` |
| `ns-sdd-version-partitioner/SKILL.md` + `references/` | `ns-spec-driven/references/version-partitioner.md` + templates/workflow |
| `ns-sdd-task-generator/SKILL.md` + `references/task-schema.md` | `ns-spec-driven/references/task-generator.md` + `task-schema.md` |
| `ns-sdd-execution-handoff-generator/SKILL.md` + template | `ns-spec-driven/references/execution-handoff.md` + `execution-handoff.template.md` |
| `ns-sdd-execution-handoff-generator/references/run-implementation.md` | `ns-code-coder/references/run-implementation.md` |
| `ns-execution-orchestrator/SKILL.md` + `references/slice-dispatch.md` | `ns-spec-driven/references/orchestrator.md` + `slice-dispatch.md` |

Evals das 7 skills: fundir em `ns-spec-driven/evals/evals.json` como prompts de **retomada** (incluindo “versão particionada / continue as slices”). Não manter evals de invocação `/ns-sdd-*` nem `/ns-execution-orchestrator`.

### 1.5.2 Reescrever a face

`ns-spec-driven/SKILL.md`:

- Tabela de fases aponta para `references/<fase>.md`, não para `../ns-sdd-* /SKILL.md`.
- `depends` remove as 6 fases e `ns-execution-orchestrator`.
- `description` cobre retomada (“continue”, “resume version”, artefatos parciais em `docs/versions/`).
- Mandato: **ler** o reference da fase; Tasks: **MUST** `task-writer-agent` quando o bridge existir (corpo = `references/task-generator.md`).
- Cap 500 linhas no `SKILL.md`.

### 1.5.3 Atualizar consumidores do caminho antigo

| Arquivo | Mudança |
| ------- | ------- |
| `packages/harness/templates/catalog.json` | Apagar as 7 chaves `depends`; `retired-skills.json` aponta as 7 (+ aliases) → `ns-spec-driven` |
| `packages/harness/src/subagentsCatalog.js` + `templates/harness-README.md` | `task-writer-agent` → `ns-spec-driven` / `references/task-generator.md` |
| `packages/harness/src/generateAgentsMd.js` | Remover as 7 da lista de skills |
| `skills/ns-harness/references/subagent-dispatch.md` | Mapped skill da Tasks = reference da face |
| `skills/ns-harness/references/artifact-layout.md` | Autoria dos artefatos = fases internas da face |
| `skills/ns-harness/references/code-skill-routing.md` | Handoff de versão → `ns-coder/references/run-implementation.md` |
| `skills/ns-code-coder/SKILL.md` | `references/run-implementation.md` (arquivo move para o coder) |
| `skills/ns-code-autonomous/references/planning-decision.md` | Citar shape dos artefatos, não nomes de skills mortas |
| `skills/ns-harness-prepare/SKILL.md` | Próximo passo = `/ns-spec-driven` (não `ns-sdd-clarify-requirements`) |
| `skills/ns-harness-bootstrap-brownfield/SKILL.md` | Handoff para a face, não para generator |
| `skills/ns-pm-*-test-task-generator/SKILL.md` | Related → `ns-spec-driven` task-generator reference |
| `README.md`, `skills/_meta/MIGRATION.md` | Documentar retirement |

### 1.5.4 Apagar os 7 diretórios de skill

Só depois de grep zerado por `ns-sdd-clarify-requirements`, `ns-execution-orchestrator` (etc.) como **nome de skill instalável**. Menções históricas em `retired-skills.json` e `MIGRATION.md` são o único restante.

**Critério de saída da Fase 1.5:** `npx skills add` das 7 chaves redireciona via retired; `validate-catalog` passa; face < 500 linhas; evals de retomada na face; `task-writer-agent` carrega o reference.

---

## 2. Fase 2 — Reorganizar em pastas por domínio

### 2.1 Estrutura-alvo

```
skills/
├── sdd/
│   ├── ns-spec-driven/          ← 6 fases + orchestrator em references/
│   └── ns-living-spec/
├── code/
│   ├── ns-coder/                ← inclui run-implementation.md
│   ├── ns-reviewer/
│   ├── ns-investigator/
│   └── ns-autonomous/
├── gitlab/
│   ├── ns-gitlab-board-sync/
│   ├── ns-gitlab-ci-generator/
│   ├── ns-execution-gitlab-issue/
│   └── mcp-gitlab-usage/
├── testing/
│   ├── ns-pm-unit-test-task-generator/
│   ├── ns-pm-e2e-test-task-generator/
│   ├── ns-e2e-tests/            ← hoje ns-code-e2e-tests
│   └── ns-backend-tests/        ← hoje ns-code-backend-tests
├── frontend/
│   ├── ns-frontend-design/      ← hoje ns-code-frontend-design
│   ├── ns-proto-creator/
│   └── ns-proto-visual-guide/
├── docs/
│   ├── ns-agent-generator/
│   ├── ns-codebase-reverse-spec/
│   ├── ns-architecture-rules/
│   ├── ns-bootstrap-brownfield/
│   ├── ns-prepare/
│   ├── ns-docs-writer/
│   └── ns-best-practices/
├── business/
│   ├── README.md
│   ├── ns-project-manager/
│   ├── ns-delivery-schedule/    ← hoje ns-pm-delivery-schedule
│   ├── ns-commercial-budget/
│   └── ns-requirements-enricher/
└── labs/
    ├── README.md
    ├── ns-multi-agent-architect/
    └── ns-langgraph-agents/

packages/
└── harness/

presets/
├── index.json
├── implementation.json
├── spec-driven.json
├── spec-driven-gitlab.json
├── business.json
├── frontend.json
├── full.json
└── full-experimental.json

docs/
├── harness-contract.md
└── preset-schema.md

MIGRATION.md
```

`ns-skill-creator` e `ns-harness`: destino na Fase 2 conforme tabela 2.2 (`docs/` ou permanecer na raiz do catálogo harness — registrar em `MIGRATION.md` se não forem para `docs/`).

### 2.2 Renomes a aplicar (Fase 6 integrada aqui)

Regra geral: quando a pasta de domínio já comunica a categoria, remover o prefixo de categoria no nome da skill. Manter prefixo quando nomeia tecnologia externa.

Nomes **atuais do repo** (não os nomes inventados na v4.2).

#### Skills que continuam (mover + rename)

| Nome atual | Nome novo |
| ---------- | --------- |
| `skills/ns-spec-driven` | `skills/sdd/ns-spec-driven` |
| `skills/ns-sdd-living-spec-consolidator` | `skills/sdd/ns-living-spec` |
| `skills/ns-code-coder` | `skills/code/ns-coder` |
| `skills/ns-code-reviewer` | `skills/code/ns-reviewer` |
| `skills/ns-code-investigator` | `skills/code/ns-investigator` |
| `skills/ns-code-autonomous` | `skills/code/ns-autonomous` |
| `skills/ns-gitlab-board-sync` | `skills/gitlab/ns-gitlab-board-sync` _(prefixo: tecnologia externa)_ |
| `skills/ns-gitlab-ci-generator` | `skills/gitlab/ns-gitlab-ci-generator` |
| `skills/ns-execution-gitlab-issue` | `skills/gitlab/ns-execution-gitlab-issue` |
| `skills/mcp-gitlab-usage` | `skills/gitlab/mcp-gitlab-usage` |
| `skills/ns-pm-unit-test-task-generator` | `skills/testing/ns-pm-unit-test-task-generator` |
| `skills/ns-pm-e2e-test-task-generator` | `skills/testing/ns-pm-e2e-test-task-generator` |
| `skills/ns-code-e2e-tests` | `skills/testing/ns-e2e-tests` |
| `skills/ns-code-backend-tests` | `skills/testing/ns-backend-tests` |
| `skills/ns-code-frontend-design` | `skills/frontend/ns-frontend-design` |
| `skills/ns-proto-creator` | `skills/frontend/ns-proto-creator` |
| `skills/ns-proto-visual-guide` | `skills/frontend/ns-proto-visual-guide` |
| `skills/ns-harness-agents-md` | `skills/docs/ns-agent-generator` |
| `skills/ns-harness-codebase-reverse-spec` | `skills/docs/ns-codebase-reverse-spec` |
| `skills/ns-harness-architecture-rules` | `skills/docs/ns-architecture-rules` |
| `skills/ns-harness-bootstrap-brownfield` | `skills/docs/ns-bootstrap-brownfield` |
| `skills/ns-harness-prepare` | `skills/docs/ns-prepare` |
| `skills/ns-code-docs-writer` | `skills/docs/ns-docs-writer` |
| `skills/ns-code-best-practices` | `skills/docs/ns-best-practices` |
| `skills/ns-project-manager` | `skills/business/ns-project-manager` |
| `skills/ns-pm-delivery-schedule` | `skills/business/ns-delivery-schedule` |
| `skills/ns-commercial-budget` | `skills/business/ns-commercial-budget` |
| `skills/ns-requirements-enricher` | `skills/business/ns-requirements-enricher` |
| `skills/ns-multi-agent-architect` | `skills/labs/ns-multi-agent-architect` |
| `skills/ns-langgraph-agents` | `skills/labs/ns-langgraph-agents` _(prefixo: tecnologia externa)_ |

#### Skills retiradas na Fase 1.5 (não mover)

| Nome atual | Destino |
| ---------- | ------- |
| `ns-sdd-clarify-requirements` | `ns-spec-driven/references/clarify-requirements.md` |
| `ns-sdd-requirements-generator` | `ns-spec-driven/references/requirements-generator.md` |
| `ns-sdd-analyze-consistency` | `ns-spec-driven/references/analyze-consistency.md` |
| `ns-sdd-version-partitioner` | `ns-spec-driven/references/version-partitioner.md` |
| `ns-sdd-task-generator` | `ns-spec-driven/references/task-generator.md` |
| `ns-sdd-execution-handoff-generator` | face: `execution-handoff.md`; coder: `run-implementation.md` |
| `ns-execution-orchestrator` | `ns-spec-driven/references/orchestrator.md` + `slice-dispatch.md` |
| `nsutil-mcp` | **Removida** — não é skill de catálogo; gerada na aplicação |

`retired-skills.json`: cada uma (e aliases `pm-*`, short names) → `ns-spec-driven`.

### 2.3 Workaround para `depends` com `vercel-labs/skills#861` pendente

1. Após mover cada skill restante, atualizar `depends` para o novo caminho interno.
2. O harness, ao instalar, tenta Skills CLI; se falhar, registra instalação manual no output de `harness init`.
3. README: peers manuais até `#861`. Exemplo pós-v5 (pipeline SDD **não** precisa das 7 unidades internas):

```bash
npx skills add nextstage-brasil/skills --skill skills/sdd/ns-spec-driven
npx skills add nextstage-brasil/skills --skill skills/code/ns-coder
```

4. `docs/dependency-graph.md` — grafo **após** Fase 1.5 (sem as 6 fases).

### 2.4 Arquivos a atualizar além do `SKILL.md`

- `AGENTS.md` (raiz)
- `.nextstage-harness/rules/*.md` e `.claude/rules/*.md` se existirem
- `packages/harness` (hardcoded — limpar na Fase 3)
- `presets/*.json`
- `docs/dependency-graph.md`
- Referências a `run-implementation.md` (coder, autonomous, harness routing)

### 2.5 Ordem de migração (um PR por domínio)

1. `labs/`
2. `business/`
3. `frontend/`
4. `testing/`
5. `gitlab/`
6. `docs/`
7. `code/` — execução; referenciada por gitlab e sdd
8. `sdd/` — por último; só face + living-spec

**Regra de ouro:** nunca remover o caminho antigo antes de validar o novo. Commit atômico por PR.

**Critério de saída da Fase 2:** skills restantes nos novos caminhos, `MIGRATION.md` completo (moves + retirements da 1.5), `depends` atualizado, nenhuma referência interna quebrada.

---

## 3. Fase 3 — Reduzir `packages/harness` e publicar

### 3.1 Remover lógica hardcoded

Localizar e remover de `packages/harness`:

- Qualquer array ou objeto literal com lista de skills (`const skills = [...]`)
- Qualquer mapa de presets embutido no código
- Importações de paths específicos de skills

Substituir por: leitura de `presets/index.json` (caminho relativo à raiz do repo ou `HARNESS_PRESETS_PATH`).

### 3.2 API mínima do CLI pós-redução

```
harness init
  → descobre tipo de projeto, gera AGENTS.md e adaptadores de agente
  → (.cursor/rules/*.mdc, .claude/rules/*.md, etc.)
  → lê harness-contract.md para saber versão do contrato a declarar

harness --preset <nome> [--yes]
  → lê presets/index.json
  → resolve alias se aplicável (ex. project-manager → business.json)
  → carrega presets/<nome>.json
  → resolve lista de skills (caminhos internos)
  → delega instalação ao Skills CLI para cada skill
  → para cada skill com `depends`, avisa se a dependência não está instalada

harness sync
  → relê AGENTS.md do projeto atual
  → regenera adaptadores de agente
  → PRESERVADO SEM MUDANÇA DE COMPORTAMENTO — não alterar esta lógica durante a refatoração
  → task-writer-agent deve apontar ao reference da face (já definido na 1.5)

harness list [--presets] [--skills] [--domain <domínio>]
  → lê presets/index.json e a estrutura de pastas em skills/

harness validate
  → verifica integridade do grafo de depends
```

### 3.3 CI — GitHub Actions

Criar `.github/workflows/ci.yml` com path-based triggers:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  harness:
    if: |
      contains(github.event.head_commit.modified, 'packages/harness/') ||
      github.event_name == 'pull_request' && contains(join(github.event.pull_request.changed_files.*.filename, ','), 'packages/harness/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci --workspace=packages/harness
      - run: npm test --workspace=packages/harness
      - run: node packages/harness/bin/harness.js list

  validate-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validar grafo de depends
        run: node scripts/validate-depends.js

  skills-sdd:
    if: "contains(github.event.head_commit.modified, 'skills/sdd/')"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validar manifests sdd/
        run: node scripts/validate-manifests.js skills/sdd/
```

Repetir job de manifests por domínio: gitlab, testing, frontend, docs, business, labs, code.

Criar `scripts/validate-depends.js` que percorre skills restantes e valida que caminhos em `depends` existem. Não deve exigir os 6 workers retirados.

### 3.4 Publicação no npm

```bash
cd packages/harness
npm version major   # 0.38.2 → 1.0.0
npm publish --access public
```

Não publicar `0.39.x`. `1.0.0` é a primeira linha incompatível com `0.n`.

Publicar assim que `harness init` e resolução básica de preset funcionarem — não esperar migração completa das skills.

**Critério de saída da Fase 3:** `npx @nextstage-brasil/harness init` funciona a partir do pacote publicado. CI rodando. `validate-depends.js` não reporta erros.

---

## 4. Fase 4 — `business/` como domínio público normal

1. Cada skill em `skills/business/` segue o mesmo padrão:
   - `SKILL.md` com frontmatter de manifest (`requires_harness`, `provides`, `consumes`)
   - `references/` quando aplicável
   - `evals/` com ao menos um caso representativo quando aplicável

2. Criar `skills/business/README.md` — descritivo, sem tom de aviso:

```markdown
# business/

Skills de metodologia comercial: estimativa de orçamento (Function Points / COSMIC),
cronograma de entrega com análise probabilística (Monte Carlo P50/P85/P95),
gestão de projeto e enriquecimento de requisitos para contexto comercial.

Instalação isolada:

npx @nextstage-brasil/harness --preset business --yes
```

3. Declarar no manifest qualquer dependência cruzada de domínio.

4. Criar `presets/business.json`:

```json
{
  "name": "business",
  "requires_harness": ">=1.0.0",
  "description": "Metodologia comercial: orçamento, cronograma, PM e enriquecimento de requisitos",
  "includes": [
    "skills/business/ns-project-manager",
    "skills/business/ns-delivery-schedule",
    "skills/business/ns-commercial-budget",
    "skills/business/ns-requirements-enricher"
  ]
}
```

**Critério de saída da Fase 4:** `--preset business --yes` instala apenas as 4 skills de `business/`.

---

## 5. Fase 5 — Presets

### 5.1 Arquivos a criar em `presets/`

**`presets/implementation.json`** — execução autônoma, **sem** face SDD:

```json
{
  "name": "implementation",
  "requires_harness": ">=1.0.0",
  "description": "Coder, review, investigator, autonomous — sem ciclo spec-driven",
  "includes": [
    "skills/code/ns-coder",
    "skills/code/ns-reviewer",
    "skills/code/ns-investigator",
    "skills/code/ns-autonomous"
  ]
}
```

Living-spec entra via `depends` de `ns-coder`. Nenhuma skill de `code/` declara `depends: ns-spec-driven`.

**`presets/spec-driven.json`** — `extends` implementation + face + geradores de task de teste:

```json
{
  "name": "spec-driven",
  "requires_harness": ">=1.0.0",
  "description": "Ciclo completo SDD sem integrações externas",
  "extends": "implementation",
  "includes": [
    "skills/sdd/ns-spec-driven",
    "skills/testing/ns-pm-unit-test-task-generator",
    "skills/testing/ns-pm-e2e-test-task-generator"
  ]
}
```

**`presets/spec-driven-gitlab.json`:**

```json
{
  "name": "spec-driven-gitlab",
  "requires_harness": ">=1.0.0",
  "description": "Ciclo SDD com integração GitLab (issues, board, CI)",
  "extends": "spec-driven",
  "includes": [
    "skills/gitlab/ns-gitlab-board-sync",
    "skills/gitlab/ns-gitlab-ci-generator",
    "skills/gitlab/ns-execution-gitlab-issue",
    "skills/gitlab/mcp-gitlab-usage"
  ]
}
```

**`presets/frontend.json`:**

```json
{
  "name": "frontend",
  "requires_harness": ">=1.0.0",
  "description": "Design, prototipação e guia visual",
  "includes": [
    "skills/frontend/ns-frontend-design",
    "skills/frontend/ns-proto-creator",
    "skills/frontend/ns-proto-visual-guide",
    "skills/sdd/ns-living-spec"
  ]
}
```

Living-spec entra no preset frontend (appearance mode). Não puxa `ns-spec-driven`.

**`presets/full.json`:**

```json
{
  "name": "full",
  "requires_harness": ">=1.0.0",
  "description": "Catálogo completo (exceto experimental)",
  "extends": ["spec-driven-gitlab", "implementation", "frontend", "business"],
  "includes": [
    "skills/testing/ns-e2e-tests",
    "skills/testing/ns-backend-tests",
    "skills/docs/ns-agent-generator",
    "skills/docs/ns-codebase-reverse-spec",
    "skills/docs/ns-architecture-rules",
    "skills/docs/ns-bootstrap-brownfield",
    "skills/docs/ns-prepare",
    "skills/docs/ns-docs-writer",
    "skills/docs/ns-best-practices"
  ]
}
```

`implementation` já entra via `extends` de `spec-driven`. Não duplicar `code/*` em `includes` de `full`. Se `depends` ainda for manual na Fase 3, listar living-spec e langgraph explicitamente.

**`presets/full-experimental.json`:**

```json
{
  "name": "full-experimental",
  "requires_harness": ">=1.0.0",
  "description": "Catálogo completo incluindo skills experimentais (sem garantia de estabilidade)",
  "extends": "full",
  "includes": [
    "skills/labs/ns-multi-agent-architect",
    "skills/labs/ns-langgraph-agents"
  ],
  "warnings": [
    "Skills de labs/ são experimentais: sem eval, API instável, podem quebrar sem aviso."
  ]
}
```

### 5.2 Suporte a `extends` no harness

```
1. Carregar preset solicitado
2. Se tem `extends`, carregar preset(s) listado(s) recursivamente
3. Mesclar todos os `includes` (deduplicar)
4. Instalar a lista final
```

### 5.3 Smoke tests dos presets

```bash
mkdir /tmp/test-harness && cd /tmp/test-harness
npx @nextstage-brasil/harness init
npx @nextstage-brasil/harness --preset implementation --yes
npx @nextstage-brasil/harness --preset spec-driven --yes
npx @nextstage-brasil/harness --preset spec-driven-gitlab --yes
npx @nextstage-brasil/harness --preset business --yes
npx @nextstage-brasil/harness --preset project-manager --yes
npx @nextstage-brasil/harness --preset frontend --yes
npx @nextstage-brasil/harness --preset frontend-prototype --yes
npx @nextstage-brasil/harness --preset full --yes
npx @nextstage-brasil/harness --preset full-experimental --yes
npx @nextstage-brasil/harness sync
```

`--preset implementation` **não** instala `ns-spec-driven`. `--preset spec-driven` **não** instala os 6 workers mortos.

**Critério de saída da Fase 5:** presets resolvem; `harness list` lê `presets/index.json`.

---

## 6. Fase 6 — `MIGRATION.md` e compatibilidade

Criar `MIGRATION.md` na raiz com:

1. Mapa completo (tabela 2.2) **e** tabela de retirement da Fase 1.5
2. Instruções para usuários existentes:

```markdown
## Atualizando de harness 0.x para 1.x

`@nextstage-brasil/harness@0.n` não lê este catálogo. Reinstalar:

npx @nextstage-brasil/harness@1 init
npx @nextstage-brasil/harness@1 --preset spec-driven --yes
```

3. **Compatibilidade temporária:** aliases/redirects nos caminhos antigos se o Skills CLI suportar; senão só `retired-skills.json` + `MIGRATION.md`. As 6 skills mortas redirecionam para `ns-spec-driven`, não para um novo nome de worker.

**Critério de saída da Fase 6:** `MIGRATION.md` cobre 100% dos renames e retirements.

---

## 7. Fase 7 — Revisão final e publicação

1. **Remover artefato residual** do README:

```
pull && push --staged --fix && sleep 30 && pull
```

2. **Atualizar README raiz** com árvore, presets, instalação seletiva, `labs/`, `business/`.

Instalação seletiva de fase SDD **não existe**. Exemplo correto:

```bash
npx @nextstage-brasil/harness init
npx @nextstage-brasil/harness --preset implementation --yes
npx @nextstage-brasil/harness --preset spec-driven --yes
```

Tabela de domínios:

| Domínio | Descrição | Preset |
| ------- | --------- | ------ |
| `sdd/` | Face SDD + living spec | `spec-driven` |
| `code/` | Coder, review, investigator, autonomous | `implementation` |
| `gitlab/` | Issues, board, CI | `spec-driven-gitlab` |
| `testing/` | Tasks de teste + Cypress/PHPUnit | incluso em `spec-driven` / `full` |
| `frontend/` | Design, prototipação, guia visual | `frontend` |
| `docs/` | Agent generator, reverse-spec, arquitetura | incluso em `full` |
| `business/` | Orçamento, cronograma, PM, requisitos | `business` |
| `labs/` | Experimental | `full-experimental` |

3. Revisão humana de README e `MIGRATION.md` antes de `main`.
4. Tag `v1.0.0` após merge de todas as PRs (`@nextstage-brasil/harness@1.0.0`).

**Critério de saída da Fase 7:** README limpo, `MIGRATION.md` publicado, tag `v1.0.0`, harness npm `1.0.0`.

---

## 8. Checklist do agente

### Fase 1 — Contrato

- [ ] Criar `docs/harness-contract.md`
- [ ] Criar `docs/preset-schema.md`
- [ ] Criar `presets/index.json` (índice vazio, preenchido nas fases seguintes)
- [ ] Revisar contrato antes de prosseguir

### Fase 1.5 — Consolidar pipeline SDD (PR próprio, antes das pastas)

- [ ] Mover corpos + `references/` das 7 skills (6 fases + orchestrator) para `ns-spec-driven/references/`
- [ ] Reescrever `ns-spec-driven/SKILL.md` (roteamento; `depends` sem as 7; cap 500)
- [ ] Fundir evals na face (prompts de retomada)
- [ ] Atualizar `catalog.json`, `retired-skills.json`, `subagentsCatalog.js`, `generateAgentsMd.js`
- [ ] Atualizar `subagent-dispatch.md`, `artifact-layout.md`, `code-skill-routing.md`
- [ ] Atualizar coder, autonomous, prepare, bootstrap-brownfield, pm-*-task-generator
- [ ] Grep zerado por nomes das 7 como skill instalável
- [ ] Apagar os 7 diretórios SDD
- [ ] Apagar `skills/nsutil-mcp/` e remover de `catalog.json` (sem retired-alias)
- [ ] `node packages/harness/scripts/validate-catalog.js` passa

### Fase 2 — Reorganização (um PR por domínio, nesta ordem)

- [ ] Migrar `labs/`
- [ ] Migrar `business/`
- [ ] Migrar `frontend/`
- [ ] Migrar `testing/`
- [ ] Migrar `gitlab/`
- [ ] Migrar `docs/`
- [ ] Migrar `code/`
- [ ] Migrar `sdd/` (por último; só face + living-spec)
- [ ] Atualizar `depends` em todos os `SKILL.md` migrados
- [ ] Atualizar `AGENTS.md` e referências internas
- [ ] Criar `docs/dependency-graph.md`
- [ ] Criar `MIGRATION.md` (moves + retirements 1.5)

### Fase 3 — Harness

- [ ] Remover lógica hardcoded de `packages/harness`
- [ ] Implementar leitura de `presets/index.json` e resolução de manifest
- [ ] Implementar aliases (`project-manager` → `business.json`, `frontend-prototype` → `frontend.json`)
- [ ] Preservar `harness sync` (exceto mapping `task-writer-agent` já na 1.5)
- [ ] Implementar `harness validate`
- [ ] Criar `scripts/validate-depends.js`
- [ ] Criar `.github/workflows/ci.yml`
- [ ] Publicar `@nextstage-brasil/harness` no npm
- [ ] Smoke: `npx @nextstage-brasil/harness init`
- [ ] Smoke: `harness sync`
- [ ] Smoke: aliases de preset

### Fase 4 — business/

- [ ] Manifest em cada skill de `business/`
- [ ] Criar `skills/business/README.md`
- [ ] Criar `presets/business.json`
- [ ] Atualizar `presets/index.json`
- [ ] Smoke: `--preset business` instala só as 4

### Fase 5 — Presets

- [ ] Criar os JSON de preset (`implementation` sem a face; `spec-driven` extends)
- [ ] Atualizar `presets/index.json`
- [ ] Implementar `extends`
- [ ] Smoke de todos os presets; spec-driven não instala workers mortos

### Fase 6 — Compatibilidade

- [ ] `MIGRATION.md` cobre renames + retirements
- [ ] Aliases/redirects se o Skills CLI suportar
- [ ] Workaround de `depends` no README

### Fase 7 — Publicação final

- [ ] Remover linha `pull && push --staged --fix && sleep 30 && pull` do README
- [ ] README: estrutura, presets, sem instalação seletiva de fase SDD
- [ ] Revisão manual
- [ ] Tag `v1.0.0`
- [ ] Publicar `@nextstage-brasil/harness@1.0.0`

---

## Apêndice — Histórico de diferenças

### v3 → v4

| Item | v3 | v4 |
| ---- | -- | -- |
| Ordem de migração | Não especificada | 7 domínios em ordem explícita |
| Workaround `depends` / `skills#861` | Mencionado como problema | Estratégia concreta + `dependency-graph.md` |
| CI | Conceitual | YAML + `validate-depends.js` |
| Renomes | Regra sem lista | Tabela skill-a-skill |
| `extends` em presets | Não mencionado | Algoritmo especificado |
| `harness validate` | Não mencionado | Comando + CI |

### v4 → v4.1

| Item | v4 | v4.1 |
| ---- | -- | ---- |
| Preset `project-manager` | Rename quebraria usuários | Alias → `business.json` |
| Preset `frontend-prototype` | Rename quebraria usuários | Alias → `frontend.json` |
| `harness sync` | Ausente | Preservado na API |

### v4.1 → v4.2

Renames `ns-harness-*` em `docs/` (`ns-agent-generator`, `ns-prepare`, etc.).

### v4.2 → v5

| Item | v4.2 | v5 |
| ---- | ---- | -- |
| 6 workers SDD | Skills em `sdd/` + `depends` da face | `references/` de `ns-spec-driven`; retired → face |
| Living-spec | Skill SDD como as outras | **Permanece skill** (coder + proto + preset frontend) |
| Retomada | Implícita via matching de skill de fase | Explícita: disco + `session-continuity.md` + `description` da face |
| `task-writer-agent` | Mapped a `ns-sdd-task-generator` | Mapped a `ns-spec-driven/references/task-generator.md` |
| Preset `spec-driven` | Listava as 6 fases como `includes` | Face + 2 geradores de task de teste; execução via `depends` |
| Nomes atuais no repo | Errados (`ns-sdd-spec-driven`, `ns-code-orchestrator`, `ns-unit-test-task-generator`) | Corrigidos (`ns-spec-driven`, `ns-execution-orchestrator`, `ns-pm-*`) |
| Ordem | Mover pastas primeiro | **Fase 1.5** consolida no plano; depois pastas |
| Cadeia `depends` SDD | 6 peers só para o pipeline | Eliminada; alívio parcial de `#861` |

### v5 → v5.1

| Item | v5 | v5.1 |
| ---- | -- | ---- |
| Coder / reviewer / investigator / autonomous | Pasta `sdd/` | Pasta `code/` |
| Orchestrator | Com os executores | Fica em `sdd/` — só `version-roadmap.md` |
| Preset só execução | Não existia (só via face) | `implementation` — sem face, sem orchestrator |
| `spec-driven` | `includes` da face; peers via `depends` | `extends: implementation` + face + test task generators |
| `run-implementation.md` | Dentro da face | Dentro de `ns-coder` (executor não depende da skill da face) |
| Preset `implementation` de 2026-07 | Removido por duplicar SDD | Reintroduzido com contrato oposto (execução sem face) |

### v5.1 → v5.2

| Item | v5.1 | v5.2 |
| ---- | ---- | ---- |
| `ns-execution-orchestrator` | Skill em `sdd/` | `ns-spec-driven/references/orchestrator.md` + slice-dispatch; retired → face |

### v5.2 → v5.3

| Item | v5.2 | v5.3 |
| ---- | ---- | ---- |
| Living spec skill | `ns-living-spec-consolidator` | `ns-living-spec` (continua skill; só o nome) |

### v5.3 → v5.4

| Item | v5.3 | v5.4 |
| ---- | ---- | ---- |
| `nsutil-mcp` | `skills/labs/nsutil-mcp` | Removida do catálogo; gerada na aplicação |

### v5.4 → v5.5

| Item | v5.4 | v5.5 |
| ---- | ---- | ---- |
| Harness npm | implícito / `npm version minor` / tag `v2.0.0` | `0.38.2` → **`1.0.0`**; incompatível com `0.n`; tag `v1.0.0` |
