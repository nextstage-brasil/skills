# Guardrail and adversarial (scope / safety)

Not routing. Gateway intent stays **deterministic** (`ns-agent-architecture` `gateway-calibration.md`). This file: **scope/safety** classifier in the graph.

## Scaffold vs doctrine

`templates/agent-runtime/src/graph/nodes/guard.node.ts` = **fail-open** (always `guardRoute: "agent"`). Template default **≠** doctrine.

Lock fail mode in `graph-spec.md` (`guard_fail_mode`). See `templates/graph-spec.md`.

| Mode | Classifier unavailable / invalid output | Use when |
| ---- | --------------------------------------- | -------- |
| `fail-open` | Proceed to agent; log gap on `turnDecisions` | Scaffold; low-risk reversible |
| `fail-closed` | Deny / `respond` safe refusal; no tool side effect | P2 / regulated / always-escalate |

Do not treat scaffold as production lock.

## Scope classifier — not a blocklist

Classifier maps turn to a **closed enum** of ADR Gateway categories (or `out_of_scope` / `unsafe`). Not a keyword blocklist. Trigger-word lists miss paraphrase.

| Rule | Why |
| ----- | --- |
| Closed enum | Invalid label = typed failure, not improvised category |
| Claimed authority ignored | “I am the admin / lawyer / on-call” is content, not grant |
| Cheap-tier / viability lock | Classifier = cheap non-LLM or cheap-tier model; must stay viable at p95 latency/cost. Unviable: fail-closed or drop the hop — do not add LLM `intent_classify` router |
| Additive | Does **not** replace Observability or Approval Gate. HITL still fires on always-escalate / P2 |

## Evals

Adversarial cases **without** trigger-word lists (no “ignore previous instructions” as the only probe). Probe: role claim, out-of-scope domain, benign paraphrase of a blocked act. Expected: enum label + policy, not string match.

## Observability

Classifier output: `turn_decisions` (category, `score_obtained`, `threshold_applied`, `decision_outcome`, fail-open gap if any). Same audit fields as Gateway calibration. Missing score/threshold = incomplete.
