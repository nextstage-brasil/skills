# Phase 1 — Clarification Loop

Run before structuring. Answers feed Phase 3 (RICE/WSJF). No declared OKR = Business Value / Time Criticality = guess.

## Minimum context checklist

Collect (user or prior chat):

| # | Topic | Need |
| --- | --- | --- |
| 1 | Business objective / OKR | Measurable outcome + deadline (e.g. "reduce dispatch response time by 30% by Q3") |
| 2 | Scale / reach | Users, transactions, or assets affected per month |
| 3 | Constraints | Compliance (LGPD, GDPR, SOC2), hardware, external APIs, other teams |
| 4 | Deadline pressure | Hard dates, milestones, contractual commitments |
| 5 | Stakeholders | Key roles, who champions what, known conflicts |
| 6 | Domain context | Product name, personas, legacy systems, glossary |

## Structured input template (send this, don't just narrate)

Send fill-in with batched questions:

```
[FILL IN — business & delivery context]
1. Business objective / OKR: [metric] from [baseline] to [target] by [date]
2. Scale / reach: [users / transactions / assets] affected per [period]
3. Constraints: [compliance standard] / [hardware or API dependency] / [other teams]
4. Deadline pressure: [hard date, milestone, or contractual commitment]
5. Stakeholders: [name — role — what they champion]
6. Domain context: [product name] / [personas] / [legacy systems] / [ambiguous terms]

Example:
1. Reduce dispatch response time from 12min to 8min by Q3 2026
2. 200 dispatchers, ~4,000 alerts/month
3. LGPD applies (driver location data); accelerometer hardware not yet purchased, 60-day lead time
4. Board demo end of Sprint 3
5. Carlos — Ops Director — champions speed alerts; Priya — Infra — owns hardware procurement
6. RouteWise fleet platform, personas: dispatcher + fleet manager, legacy Jira board being retired
```

Same message: ask where save markdown artifacts — `references/11-artifact-persistence.md` (default `docs/<project-slug>/`, or "skip docs" = chat-only).

## How to ask

- Batch **5–7 numbered questions** one message — no drip.
- Frame why: "Need OKR to anchor Phase 3 prioritization — without it, ranking = opinion."
- Max **2 rounds** follow-up on still-ambiguous points.

## Exit criteria

Advance Phase 2 only when:

1. Checklist substantially filled, **or**
2. User say **"proceed with assumptions"** / **"skip questions"** / **"quick mode"**.

Gaps: mark `[ASSUMPTION: …]` inline — never silent invent.

## Quick mode shortcut

User ask "quick mode" or "just the stories":

- Ask only 1 (OKR) + 4 (deadline) if missing.
- Rest `[ASSUMPTION]`. Proceed Phase 2 **quick structuring** (User Stories + Open Questions + GitLab cards — `references/01-structuring.md`).

## What NOT to do

- No Domain Map / Epics / User Stories until exit.
- No dump all 5 pipeline phases one response.
- No block forever — 2 rounds max, then offer "proceed with assumptions."
- No infer template answers from raw transcript alone — transcript may *suggest* OKR/constraint; confirm explicit before Phase 3 scoring.
