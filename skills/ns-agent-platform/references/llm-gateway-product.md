# LLM gateway as product (Gate 4)

ADR **Gateway** = API entry: auth, rate limit, format, **deterministic** intent (`ns-agent-architecture` `reference-architecture.md`). Not this product.

**LLM gateway product:** control plane in front of model hosts — tenant keys, quota, routing to **already-locked** providers, hosting failover, usage audit.

## Contrast

| | ADR Gateway | LLM gateway product |
| - | ----------- | ------------------- |
| Job | HTTP/webhook/queue into Orchestrator | Model access as **platform product** |
| Intent | Deterministic classifier / rule (not LLM hop) | Does not replace Gateway intent |
| Failover | N/A here | Hosting/gateway product (retry other **host**, not second tool schema) |
| “Just an API route” | Incomplete if this is the only lock | Fail this gate |

Do **not** copy `provider-selection.md`. Provider + egress already in ADR. This gate: **who hosts the gateway product** and how failovers **hosts**.

## Prototype to production

Local prototype (laptop Ollama / single process) into production: **re-run Gate 1** compute table. Do not keep prototype placement silently.

## Audit

LLM gateway product still writes to **central** Observability (tenant, model id, prompt version, decision). Edge or “thin route” does not waive.
