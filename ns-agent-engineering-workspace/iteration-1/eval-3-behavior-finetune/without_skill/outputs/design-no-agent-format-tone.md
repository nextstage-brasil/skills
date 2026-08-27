# Design note: format + tone compliance (no agent)

## Problem

Model returns correct factual content from docs but:

1. JSON does not match the required response shape.
2. Free-text fields ignore the tone guide.

## Decision

**Do not build an agent.** Treat this as output-contract and style compliance.

## Approach

1. **Structured outputs** — bind generation to a JSON Schema (provider constrained decoding / `response_format` when available).
2. **Prompt** — short tone rules + 2–3 few-shot examples that demonstrate both schema and voice.
3. **Validate + single repair** — programmatic schema check; on failure, one retry with validation errors.
4. **Escalate to SFT** only if schema pass rate or tone rubric stay below target after (1)–(3).
5. **Agent** only if later requirements need tools, multi-step side effects, or durable orchestration.

## Success metrics

- Schema validity rate
- Tone rubric score (independent of schema)
- Factual accuracy (no regression)
- p50/p95 latency and cost vs. baseline

## Non-goals

- Multi-agent debate, planners, or tool routers for this failure mode
- Replacing docs retrieval (facts are already correct)
