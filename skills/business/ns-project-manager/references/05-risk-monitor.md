# Phase 6 — Risk Monitor (on-demand)

**Trigger:** monitor project health, detect risk, sprint trends, "are we on track" — mid-project OK, no re-run Phases 1–5.

AIOps-for-PM: anomalies/risks in flow data before crisis. Never anomaly from one data point — need ≥2 consecutive sprints same trend.

## Step 1 — Get flow metrics

GitLab MCP configured: call issue-events per issue, then:

```bash
python3 scripts/flow_metrics.py issues_with_events.json
```

No MCP: ask per-sprint numbers; say numbers not independently verified.

## Step 2 — Alert thresholds

Ask user define anomaly thresholds (or derive first 2 sprints + 25%): Lead Time ceiling, bug rate imbalance, WIP-per-dev ceiling, scope-creep ceiling.

## Step 3 — Risk cockpit

Evaluate 🟢/🟡/🔴:
1. **Flow & efficiency** (Lead Time, stuck WIP)
2. **Quality** (bug rate, accumulated balance)
3. **External dependencies** (blockers outside team control)
4. **Scope & delivery** (velocity, planned vs actual throughput)
5. **Milestone readiness**

## Step 4 — Diagnosis and mitigation

Every Yellow/Red: which metric off, diagnosis (symptom vs cause), mitigation (immediate action, process action, success criterion).

## Step 5 — Delivery risk projection

Risk miss MVP deadline: Low (<20%), Medium (20–50%), High (>50%).

## Output format

1. Risk cockpit table (5 components, status, one-line reason).
2. Anomaly diagnosis per Yellow/Red.
3. Mitigation plan per anomaly.
4. Delivery risk projection + reasoning.

## Behavioral constraints

- Single data point ≠ anomaly. Need trend 2+ sprints.
- Reuse earlier pipeline data when available — never invent metrics.
