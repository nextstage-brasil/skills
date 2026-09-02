# Skill dependency graph (post Phase 1.5 + Phase 2)

Skill IDs match directory names. Install paths: `skills/<name>/` — see `skills/_meta/MIGRATION.md`.

## Core execution (no SDD face required)

```
ns-harness
├── ns-coder ──┬── ns-investigator
│              ├── ns-frontend-design
│              ├── ns-best-practices
│              ├── ns-backend-tests
│              ├── ns-e2e-tests
│              ├── ns-docs-writer
│              ├── ns-reviewer
│              ├── ns-autonomous
│              └── ns-living-spec
├── ns-autonomous ── ns-reviewer
├── ns-reviewer
└── ns-investigator
```

## SDD face (optional delivery orchestrator)

```
ns-spec-driven
├── ns-harness
├── ns-coder
├── ns-autonomous
├── ns-reviewer
└── ns-living-spec
```

Internal SDD phases (clarify, requirements, consistency, partition, tasks, handoff, orchestrator) live in `ns-spec-driven/references/` — not separate catalog skills.

## Brownfield / docs chain

Folded into `ns-harness` references: `prepare.md`, `architecture-rules-generator.md`, `bootstrap-brownfield.md`, `codebase-reverse-spec.md`, `agents-md.md`. Invoke `/ns-harness prepare this repo` (or a single worker prompt).

## GitLab

```
ns-gitlab-board-sync ── (runtime) mcp-gitlab-usage [MCP-provisioned]
ns-execution-gitlab-issue ──┬── ns-harness
                              ├── ns-reviewer
                              ├── ns-autonomous
                              └── ns-coder
ns-requirements-enricher ── ns-harness
```

`mcp-gitlab-usage` is not a catalog skill; GitLab MCP writes it on first use.

## Frontend prototype

```
ns-proto-creator ──┬── ns-harness
                   ├── ns-frontend-design
                   ├── ns-best-practices
                   ├── ns-living-spec
                   └── ns-proto-visual-guide
ns-proto-visual-guide ──┬── ns-harness
                        └── ns-living-spec
```

## Business (standalone preset)

```
ns-project-manager ── ns-harness
```

Nested (not catalog skills): `references/ns-commercial-budget`, `references/ns-delivery-schedule`.

## Labs

```
ns-multi-agent-architect
ns-langgraph-agents ── ns-harness
```

## Manual peer install (until skills#861)

When `depends` is not resolved by the Skills CLI, install peers explicitly:

```bash
npx skills add nextstage-brasil/skills --skill ns-spec-driven --full-depth -y
npx skills add nextstage-brasil/skills --skill ns-coder --full-depth -y
```

Harness `init` warns when declared `depends` peers are missing.
