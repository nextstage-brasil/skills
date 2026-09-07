# NextStage Skills — guia do repositório

Este arquivo é para **maintainers deste repositório**. Diz aos agents como trabalhar no catálogo de skills e no pacote harness.

Projetos consumidores recebem outro `AGENTS.md` — gerado a partir de `packages/harness/templates/AGENTS.md` quando rodam `npx @nextstage-brasil/harness`. Não copie regras de projeto consumidor para cá.

## Idioma

**Somente inglês — sem exceções.**

Todos os artefatos neste repositório devem ser escritos em inglês:

- `AGENTS.md`, `README.md` e todo outro arquivo markdown (exceto este).
- Instruções de skill (`SKILL.md`), references, checklists e scripts
- Mensagens de commit, descrições de PR e texto de issue
- Respostas de agent e entregáveis produzidos ao trabalhar neste repositório

## Layout do repositório

```
skills/
├── <name>/             # Fonte canônica da skill (SKILL.md + references/, scripts/, evals/)
├── ns-harness/         # Skill base do harness (alwaysInstall)
└── _meta/              # Notas de migração
packages/harness/       # CLI @nextstage-brasil/harness (wizard de install, catálogo, templates)
.cursor/skills/         # Skills só de maintainer (não entram no catálogo do harness)
```

Skill ID = nome do diretório (`ns-coder`). Caminho de install: `skills/<name>/` — ver `skills/_meta/MIGRATION.md`.

Ver `README.md` para o catálogo de skills e instruções de install voltadas a usuários finais.

## Criar ou editar uma skill

Antes de rascunhar ou alterar qualquer coisa em `skills/`, **leia e siga** a skill `skill-creator` do usuário:

`~/.agents/skills/skill-creator/SKILL.md`

Use para estrutura, frontmatter, description (triggering), recursos empacotados, evals e iteração. Salve skills de catálogo em `skills/<name>/` e atualize `packages/harness/templates/catalog.json` conforme as convenções abaixo.

### Convenções (resumo)

| Item                   | Regra                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Diretório              | `skills/<kebab-case-name>/`                                                                      |
| Frontmatter `name`     | Deve bater com o nome do diretório                                                               |
| `SKILL.md`             | Menos de 500 linhas; workflow no body, detalhes em `references/`                                 |
| Templates / checklists | `references/`                                                                                    |
| Scripts                | `scripts/`                                                                                       |
| Evals                  | `evals/evals.json` — 2–3 prompts realistas                                                       |
| Acoplamento harness    | Declare `depends: ns-harness` ao referenciar `./skills/ns-harness/`                              |
| Catálogo               | Adicione ou atualize `depends` em `packages/harness/templates/catalog.json` para cada skill nova |

Regras completas de migração e caminhos: `skills/_meta/MIGRATION.md`.

## Pacote harness

`packages/harness/` publica `@nextstage-brasil/harness`. Ao mudar comportamento de install, presets ou scaffolding:

- Mantenha `templates/catalog.json` sincronizado com `skills/` (validado pelo CI).
- O `AGENTS.md` do consumidor é gerado por `packages/harness/src/generateAgentsMd.js` (`harness agents-md`) — mantenha esse gerador alinhado com `ns-harness` → `references/agents-md/`. Não edite à mão um `AGENTS.md` de consumidor neste repo.
- Rode `npm test` em `packages/harness` antes de abrir um PR.

Ver `packages/harness/README.md` para flags da CLI e release notes.

## Validação

CI (`.github/workflows/validate-skills.yml`) roda em mudanças sob `skills/` e `packages/harness/`:

- Sem referências legacy a `_shared` ou `harness-init`
- Skill `ns-harness` presente
- References do harness declaram `depends` no frontmatter
- Catálogo bate com diretórios de skill (`node packages/harness/scripts/validate-catalog.js`)
- Smoke tests da CLI harness

Rode o validador de catálogo localmente antes de push ao adicionar ou renomear skills.

## Skills de projeto só de maintainer

Skills sob `.cursor/skills/` guiam trabalho **neste repositório** apenas. **Não** entram em `catalog.json` e **não** são instaladas pelo harness. Exemplo: `code-routing-diagram` — atualize o Mermaid de code routing depois de mudar routing nas skills `ns-code-`\*.

## Sinal de conclusão

Quando a tarefa estiver totalmente concluída, termine a resposta final exatamente com `Fatto!` para o humano saber que o trabalho terminou (não mid-step / waiting).
