# Evals and quality gates

Ship three eval types before calling an agent production-ready.

## 1. Architecture benchmark (full graph)

**Measures:** end-to-end task completion on a fixed dataset.

| Metric | Meaning |
| ------ | ------- |
| `completion_rate` | Tasks finished successfully |
| `tool_coverage` | Required tools were invoked |
| `avg_tokens` | Cost per run |
| `planning_tokens` | Tokens in planner-heavy architectures |
| `p95_latency_ms` | Slow path |

**When:** comparing ReAct vs plan-execute vs reflection.

## 2. Tool-selection eval (planner-only)

**Measures:** model picks correct tool + args **without** executing tools.

| Metric | Meaning |
| ------ | ------- |
| `tool_selection_accuracy` | Correct tool name |
| `argument_accuracy` | Required args present |
| `unnecessary_calls_rate` | Extra tools proposed |
| `wrong_tool_rate` | Similar tool confusion |

**When:** many overlapping MCP tools (GitLab + Jira + internal APIs).

Cheaper than full benchmark — run in CI on every prompt change.

## 3. Memory impact eval

**Measures:** A/B with memory on vs `MEMORY_DISABLED=1`.

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

Block merge when thresholds in suite fail.

## MCP contract gates (when MCP in scope)

| Gate | Requirement |
| ---- | ----------- |
| Golden `tools/list` | Fixture in tests/mock declares real tool names + schema shape from live or pinned MCP |
| Mock alignment | Mock server `items` match golden fixture — CI fails on drift |
| Schema-derived Zod | Prefer codegen from golden `tools/list` over hand-transcribed prompt tables |

## Browser / dev-chat gate (`streaming_sse`)

When `interaction_mode: streaming_sse`:

- **Greenfield MUST:** at least one Playwright (or equivalent) conversational suite against `GET /dev-chat` — same SSE contract as production
- Brownfield: recommend before major prompt/topology change
- Unit green ≠ agent answers — browser path catches stream sanitize, composer-only output, tool progress UX

Do **not** conflate with Cypress `ns-code-e2e-tests` — agent-api browser evals live in project `agent-api/evals/` per this skill.

## LangSmith / external evals

Optional: export datasets to LangSmith for regression. Postgres audit remains canonical for tenant data.

## Contracts for eval-friendly agents

Structured planner JSON (see `templates/contracts/planner-contract.md`) enables automatic grading without LLM-as-judge.

## Pre-release checklist

- [ ] At least one architecture benchmark suite green
- [ ] Tool-selection suite if >10 tools
- [ ] Memory suite if long-term memory enabled
- [ ] Golden `tools/list` + mock alignment if MCP bound
- [ ] Playwright/dev-chat suite if `streaming_sse` (greenfield MUST)
- [ ] No eval relies on live secrets — use mocks or staging MCP
