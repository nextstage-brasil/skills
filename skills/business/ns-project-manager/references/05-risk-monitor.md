# Phase 6 — Risk Monitor (on-demand)

**Trigger:** user asks to monitor project health, detect risk, analyze sprint trends, or "are we on track" — even mid-project, without re-running Phases 1–5.

AIOps-for-project-management specialist: find anomalies and risks in flow data before they become a crisis. Never declare an anomaly from a single data point — require at least 2 consecutive sprints of the same trend.

## Step 1 — Get flow metrics

If a GitLab MCP server is configured, call its issue-events tool per issue, then run:

```bash
python3 scripts/flow_metrics.py issues_with_events.json
```

If MCP isn't available, ask the user for per-sprint numbers directly and say explicitly that numbers weren't independently verified.

## Step 2 — Alert thresholds

Ask the user to define anomaly thresholds (or derive from first 2 sprints + 25%): Lead Time ceiling, bug rate imbalance, WIP-per-dev ceiling, scope-creep ceiling.

## Step 3 — Risk cockpit

Evaluate and assign 🟢/🟡/🔴:
1. **Flow & efficiency** (Lead Time, stuck WIP)
2. **Quality** (bug rate, accumulated balance)
3. **External dependencies** (blockers outside the team's control)
4. **Scope & delivery** (velocity, planned vs. actual throughput)
5. **Milestone readiness**

## Step 4 — Diagnosis and mitigation

For every Yellow/Red component: which metric is off, diagnosis (symptom vs. cause), mitigation plan with immediate action, process action, success criterion.

## Step 5 — Delivery risk projection

Classify risk of missing the MVP deadline as Low (<20%), Medium (20–50%), or High (>50%).

## Output format

1. Risk cockpit table (5 components, status, one-line reason).
2. Anomaly diagnosis per Yellow/Red item.
3. Mitigation plan per anomaly.
4. Delivery risk projection with reasoning.

## Behavioral constraints

- Single data point ≠ anomaly. Require a trend across 2+ sprints.
- Reuse data already collected in earlier pipeline phases when available — don't invent metrics.
