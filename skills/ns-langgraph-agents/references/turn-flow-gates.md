# Turn flow gates

Trigger: prompt change, repeated hops, loop, "fixed" claim without log proof.

## Flow first

Prompt change → also check `routeAfterAnalyst` + `routeAfterExecutor`. Prompt alone never "fixes" a loop.

## Terminal gate

Every turn ends `completed | failed | cancelled | interrupted` inside `TURN_LATENCY_BUDGET_MS`. No silent hang.

## Repetition gate

Same input → no unbounded identical hops. Cap (`AGENT_MAX_ANALYST_ITERATIONS`, default 3) + reason per hop in `turnDecisions`.

## Retry gate

Model-compat JSON-mode fallback **memoized per process** (`json-output.ts`). No double call forever.

## Evidence gate

Delivery claiming fixed loop **MUST** include log excerpt: full analyst user payload, node transitions, terminal SSE event.

## Tool-error gate

Tool result `error` → analyst `complete` + `actions: []`; composer explains. **No** blind re-plan.

## DoD (seven)

1. Current user message in analyst/composer payloads
2. Catalog entries carry `inputSchema` (truncated)
3. Prior results evolve across hops
4. Both routers cover no-action → composer (no analyst self-loop)
5. Terminal SSE always emitted
6. Finite LLM calls per turn (cap + memo)
7. Route + loop regression tests green

## Incident protocol

1. Classify repetition: prompt / retry / routing
2. Map state per hop
3. Prove the edge (`routeAfter*`)
4. Deterministic fix + regression test
5. Replay same input; require real log proof
