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

## Product decisions (version or multi-capability scope)

The checklist above covers **delivery context**. It does not cover the **product decisions** developers will need. When the input is a version, an epic or more than one capability, also run the coverage scan in `references/decision-coverage.md` (dimensions D1–D14 + rule probes) in the same batch. A single small change only uses the dimensions it touches.

## How to ask

- Context checklist: batch **5–7 numbered questions** in one message. No drip.
- Product decisions: every question carries a **recommended answer** (`decision-coverage.md` Step 4). No open "how should X work?".
- Frame why: "Need OKR to anchor Phase 3 prioritization — without it, ranking = opinion."
- Context checklist: max **2 rounds** of follow-up. Product decisions: keep asking only what is still open; never re-ask answered items. Answered items move to the register.

## Exit criteria

Advance Phase 2 only when:

1. Checklist substantially filled, **or**
2. User say **"proceed with assumptions"** / **"skip questions"** / **"quick mode"**.

Gaps: mark `[ASSUMPTION: …]` inline — never silent invent.

Moving on to Phase 2 does **not** close product decisions. Items still `open` or `assumed` stay in the register (`decision-coverage.md` Step 5). They block **Ready for build**, not structuring.

## Quick mode shortcut

User ask "quick mode" or "just the stories":

- Ask only 1 (OKR) + 4 (deadline) if missing.
- Rest `[ASSUMPTION]`. Proceed Phase 2 **quick structuring** (User Stories + Open Questions + GitLab cards — `references/01-structuring.md`).

## What NOT to do

- No Domain Map / Epics / User Stories until exit.
- No dump all 5 pipeline phases one response.
- No block forever — 2 rounds max, then offer "proceed with assumptions."
- No infer template answers from raw transcript alone — transcript may *suggest* OKR/constraint; confirm explicit before Phase 3 scoring.
- No scanning only the text for ambiguity. What nobody wrote down (plan, roles, defaults for existing customers, rounding, ties, calendar, export of unreviewed items, undo, data privacy, priority) is still a decision to ask about.
