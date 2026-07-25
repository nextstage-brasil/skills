# Phase 1 — Clarification Loop

Run this phase **before** structuring requirements. The answers here feed Phase 3 (RICE/WSJF) — without a declared OKR, Business Value and Time Criticality are guesses, not reasoned prioritization.

## Minimum context checklist

Collect answers (from the user or from prior conversation) for each item:

| #   | Topic                    | What you need                                                                     |
| --- | ------------------------ | --------------------------------------------------------------------------------- |
| 1   | Business objective / OKR | Measurable outcome + deadline (e.g. "reduce dispatch response time by 30% by Q3") |
| 2   | Scale / reach            | Users, transactions, or assets affected per month                                 |
| 3   | Constraints              | Compliance (LGPD, GDPR, SOC2), hardware dependencies, external APIs, other teams  |
| 4   | Deadline pressure        | Hard dates, milestones, contractual commitments                                   |
| 5   | Stakeholders             | Key roles, who champions what, known conflicts                                    |
| 6   | Domain context           | Product name, personas, legacy systems, glossary of ambiguous terms               |

## Structured input template (send this, don't just narrate)

Send this fill-in block alongside the batched questions — a bullet list of topics is easy to skim past, a template with an example is not:

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

Also ask once, in the same message: where to save this project's markdown artifacts — see `references/11-artifact-persistence.md` (default `docs/<project-slug>/`, or "skip docs" to stay chat-only).

## How to ask

- Batch up to **5–7 numbered questions** in a single message — don't drip one question at a time.
- Frame why it matters: "I need the OKR to anchor prioritization in Phase 3 — without it, ranking is opinion, not reason."
- Maximum **2 rounds** of follow-up on points still ambiguous after the first answer.

## Exit criteria

Advance to Phase 2 (Structuring) only when:

1. The checklist above is substantially filled, **or**
2. The user explicitly says **"proceed with assumptions"** / **"skip questions"** / **"quick mode"**.

When proceeding with gaps, mark each missing item inline as `[ASSUMPTION: …]` — never silently invent values.

## Quick mode shortcut

When the user asks for "quick mode" or "just the stories":

- Ask only items 1 (OKR) and 4 (deadline) if missing.
- Mark everything else `[ASSUMPTION]` and proceed to Phase 2 in **quick structuring mode** (User Stories + Open Questions + GitLab cards only — see `references/01-structuring.md`).

## What NOT to do

- Do not start Domain Map / Epics / User Stories until this phase exits.
- Do not dump all 5 pipeline phases in one response.
- Do not block forever — 2 rounds max, then offer "proceed with assumptions."
- Do not infer the answers to the template above from the raw transcript alone — a transcript can *suggest* an OKR or a constraint, but confirm it explicitly before it anchors Phase 3 scoring.
