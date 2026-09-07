# Provider and hosting selection

`model_id` / cascade tier ≠ provider or hosting lock. ADR names vendor + local vs API.

## Decision axes

| Axis | Local | Paid API |
| ---- | ----- | -------- |
| Cost model | Zero marginal token (hardware/ops) | Per-token |
| **Data egress** | Corpus never leaves machine | Data to provider API |
| Rate limits | Hardware / concurrent load | Provider quotas |
| Answer quality ceiling | Local model ceiling | Provider tier ceiling |
| Local resource | GPU/CPU/RAM required | Network + API key |
| Intended context | Prototyping vs production — **record which** | Same |

## Hard rules

1. **Prototype ≠ production.** Local model for prototype is not a production lock. ADR records which of the two + **change signal** that forces the swap.
2. **Data egress = compliance lock**, not preference. Corpus cannot leave boundary → decide provider/hosting **before** cost.
3. **Provider fragmentation.** Same tool declared three ways (`input_schema` / `parameters` / nested `function`). Providers differ on **who owns conversation history**. Provider swap ≠ config change. MCP normalizes tool surface; **not** history ownership.
4. **Failover** = design row here: second provider exists? Tool surface survives switch? Runtime retry/backoff stays in `ns-langgraph-agents`.

## Anti-patterns

| Anti-pattern | Fix |
| ------------ | --- |
| Bench local prototype; promise production quality | Separate prototype vs production locks + swap signal |
| Treat provider swap as config change | Re-lock tool surface + history ownership |
| Ignore data egress ("just summarizing") | Egress first when compliance named |
