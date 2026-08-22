# Decision pillars — probing guide

Use **one** of these as the basis for the next question when a pillar is under-specified. Always pair with a recommended answer — do not read this list verbatim.

## Decision tree order

Walk depth-first. Typical branch order after objective is locked:

```
Objective → end-to-end journey
└── Reference architecture — five blocks (references/reference-architecture.md)
    └── Subtask decomposition (references/task-decomposition.md)
        └── Per-row classification: P1 → P2 → P3 → component
            └── Trade-off budget per canonical component
                └── Architecture change signal (one sentence)
                    └── Input / output shape
                        └── Integrations & data sources
                            └── Error handling & governance
                                ├── Control vs autonomy
                                ├── State complexity
                                ├── Human-in-the-loop
                                └── Scope & team
```

Skip branches already resolved by the user's prior answers.

## Agent vs code

Applied **per subtask row** — see `task-decomposition.md` for the grid and the classification loop. Never score the whole process as one task.

For each question, name a **real instance from this use case** (a payload, tool, or failure the user already described). The example is what is being scored — not a tutorial definition.

- Finite rule cover >90% of real cases? → stay deterministic (code/schema), not an agent.
- Error costly and irreversible? → agent may draft; HITL before the action (sync if undo is impossible).
- Logic change with context? → agent. Long but fixed trees stay code.
- Revisit with logs later: a stable pattern can become a rule; growing exceptions can become an agent.

Same input always same logic → **tool**, not an agent. Agent interprets, asks, or refuses.

Locked answers per row go in the report **Subtask Decomposition** grid.

## One vs many agents

Applies only to rows already classified as agents. Split only if **two or more** of these diverge (regulatory/risk alone may suffice):

- Vocabulary / audience
- Tool set
- Risk / reflection depth

One generalist is cheaper to coordinate, harder to audit. Specialists cost protocol and shared state.

## Error handling & governance

Ask only if still open after integrations:

- Per-turn token/latency cap — hard stop vs degrade-to-partial?
- Must a third party reconstruct route + tool + reason from logs (regulated → yes)?

## 1. Control vs autonomy

- Must every request follow the same steps, or can agents reroute dynamically?
- Are there compliance rules that forbid certain paths?
- Who decides the next step — code, a manager agent, or the worker agents?

## 2. State complexity

- Does a failed step require retry from an earlier point, or just rerun the step?
- Does step B need **A's output**, or only a calendar order? Calendar-only → parallel; real data dependence → sequential. Lock this as **Concurrency / orchestration** in the report (example: “extract cannot start until fetch returns the PDF”).
- Do downstream steps depend on accumulated context from many prior steps?
- Is there branching based on intermediate results (e.g. approve / reject / escalate)?

## 3. Human-in-the-loop

- Must a human approve before money is moved, data is deleted, external messages, or high-cost-of-error recommendations?
- Can humans edit agent state mid-run, or only approve/reject at checkpoints?
- What happens while waiting for human input — timeout, queue, notification?

## 4. Scope and team

- MVP in weeks or production system over months?
- Who consumes the agent output, and what does a wrong or late answer cost them?
- How will you know in production that this architecture worked (one metric — not exact LLM text)?
- Expected request volume and uptime requirements?
- Team familiarity with Python graph frameworks vs rapid crew prototyping?

## Framework quick reference

| Dimension | LangGraph | CrewAI |
|-----------|-----------|--------|
| Flow control | Explicit graph nodes and edges | Role-based crews and tasks |
| State | First-class checkpointed state | Task outputs passed between agents |
| Human gates | Native interrupt / resume patterns | Custom or lightweight checkpoints |
| Time to MVP | Higher setup cost | Lower for sequential specialist flows |
| Best fit | Regulated, cyclic, stateful workflows | Research, content, multi-specialist pipelines |

## LangGraph + MCP probe

When user locks **LangGraph** and scope includes **MCP or many external tools**:

- **Suggest** `plan_execute` (`guard → context_manager → mcp_catalog → analyst ⇄ executor → composer → respond`) as the usual start for MCP — not a rule; lock in the ADR / `graph-spec.md`. Do not invent `intent_classify` unless spec says so
- Sequential only when the next worker needs the previous **output** — calendar order is not a reason to serialize
- Note greenfield MUST items from `ns-langgraph-agents`: dev-chat, tool budgets, evidence channels, JSON-planner `userFacingIntent` + SSE `thinking` when the gather/analyst hop is structured plan (no `bindTools`)
- Simple local-tools MVP may still use open ReAct — do not over-prescribe topology for trivial tool count
