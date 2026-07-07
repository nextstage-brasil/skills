# Decision pillars — probing guide

Use **one** of these as the basis for the next question when a pillar is under-specified. Always pair with a recommended answer — do not read this list verbatim.

## Decision tree order

Walk depth-first. Typical branch order after objective is locked:

```
Objective
└── Input / output shape
    └── Integrations & data sources
        └── Error handling & governance
            ├── Control vs autonomy
            ├── State complexity
            ├── Human-in-the-loop
            └── Scope & team
```

Skip branches already resolved by the user's prior answers.

## 1. Control vs autonomy

- Must every request follow the same steps, or can agents reroute dynamically?
- Are there compliance rules that forbid certain paths?
- Who decides the next step — code, a manager agent, or the worker agents?

## 2. State complexity

- Does a failed step require retry from an earlier point, or just rerun the step?
- Do downstream steps depend on accumulated context from many prior steps?
- Is there branching based on intermediate results (e.g. approve / reject / escalate)?

## 3. Human-in-the-loop

- Must a human approve before money is moved, data is deleted, or external messages are sent?
- Can humans edit agent state mid-run, or only approve/reject at checkpoints?
- What happens while waiting for human input — timeout, queue, notification?

## 4. Scope and team

- MVP in weeks or production system over months?
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
