---
name: pm-requirements-copilot
description: End-to-end PM workflow skill — from raw transcript to committed delivery date. Runs a gated phase pipeline (clarification → structuring → RICE/WSJF prioritization → sprint scheduling → PERT/Monte Carlo forecast) and on-demand modes (risk monitor, status report, meeting digest, compliance checklist, NL-to-issue parsing, OKR aligner). Use whenever the user pastes a discovery transcript, asks to structure requirements, prioritize a backlog, build a sprint schedule, forecast delivery (P50/P85/P95), monitor project health, write a status report, digest a meeting, create a deploy checklist, parse a Slack message into a ticket, or validate OKRs — even if they don't name the phase or framework. Never dumps all phases at once; stops at each gate for confirmation. Deterministic math always via scripts/, never in the LLM. GitLab MCP when real project data is needed.
---

# PM Requirements Copilot

Unified project-management skill with a **gated phase pipeline** (Phases 0–5) and **on-demand modes** (Phases 6+). One phase per turn unless the user explicitly asks to continue.

## Router — which phase to run

| User signal | Phase | Reference |
|---|---|---|
| Raw transcript, briefing, "structure requirements", "extract stories" | **0 → 1** (Intake → Clarification) | `references/00-clarification.md` |
| Clarification done / user confirms / "proceed with assumptions" | **2** Structuring | `references/01-structuring.md` |
| "Prioritize", "rank backlog", RICE, WSJF, "what to build first" | **3** Prioritization | `references/02-prioritization.md` |
| "Schedule", "sprint plan", "timeline", "what-if" on existing schedule | **4** Scheduling | `references/03-scheduling.md` |
| "Forecast", "when do we deliver", P85/P95, Monte Carlo, three-point estimate | **5** Forecast | `references/04-forecast.md` |
| "Are we on track", risk monitor, sprint health, flow metrics | **6** Risk Monitor | `references/05-risk-monitor.md` |
| "Status report", "write up for manager/board/leadership" | **7** Status Report | `references/06-status-report.md` |
| Meeting transcript pasted mid-project, "meeting notes", "action items" | **8** Meeting Digest | `references/07-meeting-digest.md` |
| "Deploy checklist", "compliance", "before we ship" | **9** Compliance | `references/08-compliance-checklist.md` |
| Informal Slack/email message → task/ticket | **10** NL to Workflow | `references/09-nl-to-workflow.md` |
| "Validate OKRs", backlog×strategy alignment, portfolio scorecard | **11** OKR Aligner | `references/10-okr-aligner.md` |

**On-demand modes (6+) skip the pipeline** — they run directly when triggered, reusing context from earlier phases when available.

## Phase 0 — Intake

When the user pastes unstructured input (transcript, email, voice note):

1. Acknowledge what you received (1–2 sentences).
2. **Do not structure yet.** Route immediately to Phase 1 (Clarification).
3. Read `references/00-clarification.md` and ask the batched questions, including the artifact-persistence question (see `references/11-artifact-persistence.md`).

## Gate protocol (mandatory between phases)

After completing any pipeline phase (1–5):

1. **Compact summary** — 5–10 bullets of key outputs.
2. **Persist** — if artifact persistence is enabled (Phase 0/1 answer), write/update the matching `docs/<project-slug>/*.md` file and `roadmap.md` with the same content as the summary (`references/11-artifact-persistence.md`).
3. **Gate question** — one explicit ask, e.g.:
   - After Phase 1: "Ready to structure requirements, or should I clarify anything else?"
   - After Phase 2: "Confirm to proceed to prioritization, or adjust stories?"
   - After Phase 3: "Confirm ranking to build the sprint schedule?"
   - After Phase 4: "Confirm schedule to run the delivery forecast?"
   - After Phase 5: "P85 delivery date is [X]. Anything to adjust?"
4. **Wait** for user confirmation before starting the next phase.

**Never** output Phases 2–5 in a single response. **Never** skip Phase 1 when the user pastes a raw transcript for the first time (unless they say "quick mode" / "proceed with assumptions"). **Never** infer hard structured data (team composition/capacity, backlog effort, three-point estimates) — each phase reference has a fill-in template for this; send it and stop instead of guessing.

## Core pipeline (Phases 1–5)

```
Intake → Clarification → Structuring → Prioritization → Scheduling → Forecast
              ↑ gate        ↑ gate         ↑ gate          ↑ gate        ↑ gate
```

| Phase | What happens | Script |
|---|---|---|
| 1 Clarification | Batched questions on OKR, scale, constraints, deadline, stakeholders | — |
| 2 Structuring | Domains, stakeholders, epics, INVEST+Gherkin stories, GitLab cards | — |
| 3 Prioritization | RICE + WSJF anchored to Phase 1 OKR | `scripts/rice_wsjf.py` |
| 4 Scheduling | Sprint-by-sprint plan, critical path, what-if | — |
| 5 Forecast | PERT + Monte Carlo → P50/P85/P95 committed date | `scripts/pert_montecarlo.py` |

Read the corresponding `references/0N-*.md` file at the start of each phase.

## On-demand modes (Phases 6+)

Triggered by distinct user phrases (see router table). Each mode is self-contained — read its reference file and execute. Reuse data from earlier pipeline phases when the conversation already has it; never invent metrics.

| Mode | Script (if applicable) |
|---|---|
| Risk Monitor | `scripts/flow_metrics.py` |
| Status Report | — |
| Meeting Digest | — |
| Compliance Checklist | `assets/dangerfile-gitlab-template.js` |
| NL to Workflow | — (JSON output; GitLab MCP for issue creation) |
| OKR Aligner | `scripts/okr_progress.py` |

## Quick mode

When the user says "quick mode", "skip questions", or "proceed with assumptions":

- Phase 1: ask only OKR + deadline; mark rest `[ASSUMPTION]`.
- Phase 2: quick structuring mode (stories + open questions + GitLab cards only).
- Phase 4 (Scheduling) is exempt from quick mode — team/capacity is always requested via its fill-in template (`references/03-scheduling.md`), never assumed.
- Still respect gates between phases unless user says "run the full pipeline without stopping."

## Anti-patterns reference

Read `references/anti-patterns.md` before structuring any User Story in Phase 2.

## GitLab MCP

Use the GitLab MCP server already configured in this environment. If unavailable, say so and proceed with user-provided data. Never invent tool names or setup steps. No mutation (`create_issue`/`update_issue`) without explicit human confirmation.

## Global behavioral constraints

- Never invent stakeholders, systems, integrations, SLAs, or metrics not in the input.
- Never infer team composition/capacity, backlog effort, or three-point estimates — send the phase's fill-in template (`references/0N-*.md`) and stop.
- Never compute RICE, WSJF, Monte Carlo, flow metrics, or OKR rubric in the LLM — always run the script.
- Never dump multiple pipeline phases in one response.
- Gold plating forbidden: every output line traces back to input or prior phase data.
- Close analytical drafts with: "⚠️ Requires human review before entering a sprint."

## File index

| File | Phase |
|---|---|
| `references/00-clarification.md` | 1 |
| `references/01-structuring.md` | 2 |
| `references/anti-patterns.md` | 2 (helper) |
| `references/02-prioritization.md` | 3 |
| `references/03-scheduling.md` | 4 |
| `references/04-forecast.md` | 5 |
| `references/05-risk-monitor.md` | 6 |
| `references/06-status-report.md` | 7 |
| `references/07-meeting-digest.md` | 8 |
| `references/08-compliance-checklist.md` | 9 |
| `references/09-nl-to-workflow.md` | 10 |
| `references/10-okr-aligner.md` | 11 |
| `references/11-artifact-persistence.md` | all (docs/ output) |
| `scripts/rice_wsjf.py` | 3 |
| `scripts/pert_montecarlo.py` | 5 |
| `scripts/flow_metrics.py` | 6 |
| `scripts/okr_progress.py` | 11 |
| `assets/dangerfile-gitlab-template.js` | 9 |
