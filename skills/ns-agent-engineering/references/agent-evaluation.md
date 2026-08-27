# Agent evaluation

Evaluation **before** adaptation (Step 2). Agent-specific metrics after Agent justified.

## Failure modes

| Mode | Symptom | Typical fix locus |
| ---- | ------- | ----------------- |
| **Planning failure** | Bad goal decomposition, illegal tool order, missing steps | Planning contract, validate-before-run, shorter plans |
| **Tool failure** | Wrong tool, wrong args, flaky API, unsafe write | Taxonomy, param reporting, Guardrails, tool reliability |

Separate scores. One blended "agent bad" metric hides root cause.

## Baseline first

Non-agent baseline (Prompt / RAG / single-shot) when possible. Agent must beat baseline on locked Evaluation criteria — or justify trade (coverage vs accuracy).

## Metrics (pick applicable)

| Metric | Notes |
| ------ | ----- |
| Valid plan % | Plans that pass schema/policy before execute |
| Steps per success | Shorter better if quality holds |
| Cost per task | Tokens + tool $ vs baseline |
| Latency | p50/p95 vs baseline |
| Task success / rubric pass | Functional correctness from Step 2 |
| Write safety | Unapproved writes = hard fail |

## Rubrics

- Binary functional checks where possible
- Graded rubrics for open-ended quality
- Golden tasks cover planning and tool paths separately

Link business metric when exists (conversion, ticket resolve time, error rate). Else lock usefulness threshold explicitly.
