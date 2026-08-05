# Evals and quality gates

Three eval types before production-ready.

## 1. Architecture benchmark (full graph)

**Measures:** end-to-end task completion on fixed dataset.

| Metric | Meaning |
| ------ | ------- |
| `completion_rate` | Tasks finished successfully |
| `tool_coverage` | Required tools invoked |
| `avg_tokens` | Cost per run |
| `planning_tokens` | Planner-heavy architectures |
| `p95_latency_ms` | Slow path |

**When:** ReAct vs plan-execute vs reflection.

## 2. Tool-selection eval (planner-only)

**Measures:** correct tool + args **without** executing tools.

| Metric | Meaning |
| ------ | ------- |
| `tool_selection_accuracy` | Correct tool name |
| `argument_accuracy` | Required args present |
| `unnecessary_calls_rate` | Extra tools proposed |
| `wrong_tool_rate` | Similar tool confusion |

**When:** overlapping MCP tools (GitLab + Jira + internal).

Cheaper than full benchmark — CI on every prompt change.

## 3. Memory impact eval

**Measures:** A/B memory on vs `MEMORY_DISABLED=1`.

| Metric | Meaning |
| ------ | ------- |
| `retrieval_precision` | Retrieved memory relevant |
| `decision_improvement` | Better action with memory |
| `hallucination_from_memory` | False facts from stale memory |

**When:** long-term or episodic memory enabled.

## Suite format

YAML under `agent-api/evals/suites/`:

```yaml
name: tool-selection-gitlab
thresholds:
  tool_selection_accuracy: 0.85
  wrong_tool_rate: 0.05
cases:
  - prompt: "List open issues assigned to me in project 42"
    expect_tool: mcp__gitlab__list_issues
    expect_args:
      project_id: "42"
      assignee: me
```

## CI gates

| Gate | Command |
| ---- | ------- |
| Unit | `npm test` |
| Build | `npm run build` |
| Eval | `npm run eval` (project script) |

Block merge on threshold fail.

## MCP contract gates (MCP in scope)

| Gate | Requirement |
| ---- | ----------- |
| Golden `tools/list` | Test/mock fixture: real tool names + schema from live or pinned MCP |
| Mock alignment | Mock `items` match golden — CI fails on drift |
| Schema-derived Zod | Codegen from golden `tools/list` over hand-transcribed prompt tables |

## Browser / dev-chat gate (`streaming_sse`)

`interaction_mode: streaming_sse`:

- **Greenfield MUST:** Playwright (or equivalent) conversational suite on `GET /dev-chat` — same SSE as production
- Brownfield: recommend before major prompt/topology change
- Unit green ≠ agent answers — browser catches stream sanitize, composer-only output, tool progress UX

Not Cypress `ns-code-e2e-tests` — agent-api browser evals in project `agent-api/evals/` per this skill.

## LangSmith / external evals

Optional LangSmith datasets. Postgres audit canonical for tenant data.

## Contracts for eval-friendly agents

Structured planner JSON (`templates/contracts/planner-contract.md`) — auto grade without LLM-as-judge.

## Pre-release checklist

- [ ] Architecture benchmark suite green
- [ ] Tool-selection if >10 tools
- [ ] Memory suite if long-term memory enabled
- [ ] Golden `tools/list` + mock alignment if MCP bound
- [ ] Playwright/dev-chat if `streaming_sse` (greenfield MUST)
- [ ] No eval uses live secrets — mocks or staging MCP
