---
name: ns-project-manager
description: >
  (NS) Gated PM workflow — clarify, structure, RICE/WSJF, DAG sequencing, sprint plan,
  PERT/Monte Carlo forecast; version handoff / version card; risk, status, meeting, OKR.
  Also commercial budget (orçamento, Function Points, proposta comercial; COSMIC/CFP only
  if asked), triple productivity delivery schedule (cronograma P100/P85/P50, prazo, when we
  deliver). Use on transcripts, backlog, timeline, delivery date, status, orçamento,
  cotação, cronograma, handoff, fecha a versão — even if PM is unnamed. On "help" /
  "exemplos", list example prompts only. Do NOT use for coding, SDD requirements generation,
  GitLab issue execution, or per-issue grill-me / requirements enrichment
  (`/ns-requirements-enricher`).
license: Apache-2.0
requires_harness: ">=1.0.0"
provides:
  - gate:pm-clarification
  - artifact:pm/backlog
  - artifact:commercial-budget
  - artifact:delivery-schedule
consumes: []
metadata:
  author: nextstage-brasil
  version: "1.2"
depends:
  - ns-harness
---

# Project Manager

Gated PM pipeline (Phases 0–5) + on-demand modes (6+). One phase per turn unless user say continue.

## Router

| User signal | Phase | Reference |
|---|---|---|
| "help", "o que posso fazer", "examples", "exemplos" | **Help** — example prompts only; no phase | **Help** below |
| Raw transcript, briefing, "structure requirements", "extract stories" | **0 then 1** Intake then Clarification | `references/00-clarification.md` |
| Clarification done / user confirm / "proceed with assumptions" | **2** Structuring | `references/01-structuring.md` |
| "Prioritize", "rank backlog", RICE, WSJF, "what to build first", activity list with effort | **3** Prioritization + Sequencing | `references/02-prioritization.md` |
| Version narrative, no activity list — "sequence the version", epic deps only | **3** DAG-only sequencing (no RICE) | `references/02-prioritization.md` narrative path |
| "card de versão", "handoff", "fecha a versão", "o que entregar para execução", version card | **version-handoff** | `references/12-version-handoff.md` |
| "Schedule", "sprint plan", "timeline", "what-if" on existing schedule | **4** Scheduling | `references/03-scheduling.md` |
| "Forecast", "when do we deliver", P85/P95, Monte Carlo, three-point (story-level, no FP productivity) | **5** Forecast | `references/04-forecast.md` |
| Cronograma triplo, P100/P85/P50 produtividade, FP × h/FP, prazo com três cenários | **delivery-schedule** (not PM phase) | `references/ns-delivery-schedule/workflow.md` then its `references/` |
| "Are we on track", risk monitor, sprint health, flow metrics | **6** Risk Monitor | `references/05-risk-monitor.md` |
| "Status report", "write up for manager/board/leadership" | **7** Status Report | `references/06-status-report.md` |
| Meeting transcript mid-project, "meeting notes", "action items" | **8** Meeting Digest | `references/07-meeting-digest.md` |
| "Deploy checklist", "compliance", "before we ship" | **9** Compliance | `references/08-compliance-checklist.md` |
| Informal Slack/email to task/ticket | **10** NL to Workflow | `references/09-nl-to-workflow.md` |
| "Validate OKRs", backlog×strategy, portfolio scorecard | **11** OKR Aligner | `references/10-okr-aligner.md` |
| Commercial budget, orçamento, proposta comercial, Function Points, ponto-função, cotação R$ (COSMIC/CFP only if named) | **commercial-budget** (not PM phase) | `references/ns-commercial-budget/workflow.md` then its `references/` + `assets/` |

Modes 6+ skip pipeline. Run direct. Reuse prior phase context when present.

## Help

On **help** / what-can-I-do / examples:

1. Match human language (**Language matching**).
2. Example prompts only — no phase, no clarification, no artifacts.
3. Catalog below (adapt wording; keep skill/acronym names):

| Capability | Example prompt |
|---|---|
| Clarify + structure from transcript | `Here's our discovery call transcript: [...]. Structure the requirements.` |
| Prioritize backlog (RICE/WSJF + DAG) | `Prioritize this backlog with RICE/WSJF against OKR: [...].` |
| Sequence version narrative (DAG only) | `Version narrative only — sequence deliverables by technical deps, no RICE: [...].` |
| Version handoff card | `Fecha a versão — handoff card for execution: version orcamento-api-v1.` |
| Sprint schedule | `We've confirmed ranking. Build the sprint schedule.` |
| Delivery forecast (story-level) | `When do we deliver? Three-point estimates: [...].` |
| Triple productivity schedule | `I have FP and productivity — give me P100/P85/P50 delivery dates.` |
| Commercial budget | `Need a commercial budget / orçamento for: [...].` |
| Risk / sprint health | `Are we on track? Here's velocity and WIP: [...].` |
| Status report | `Write a status report for the board — sprint N, …` |
| Meeting digest | `Meeting notes — just the action items: '[…transcript…]'` |
| Compliance checklist | `Deploy checklist before we ship.` |
| NL to ticket | `Turn this Slack message into a GitLab issue: […]` |
| OKR alignment | `Validate OKRs against this backlog: […]` |
| Quick mode | `quick mode: [short messy brief]` |

Close: one line — paste input or pick row.

**Nested workflows:** router hit `references/ns-commercial-budget/` or `references/ns-delivery-schedule/` `workflow.md` — read full file, follow it (own `references/`, `assets/`, `scripts/`). No evals. Per-issue grill-me = `/ns-requirements-enricher` (catalog), not this skill.

**Commercial FP / client quote:** `references/ns-commercial-budget/workflow.md`. Default = APF (IFPUG CPM latest; SISP latest if CPM does not cover). COSMIC CFP only when human asks. Other methods only when human names them. Phases 1–5 = delivery forecast (RICE / sprint / PERT).

**Triple productivity schedule (FP × h/FP, P100/P85/P50):** `references/ns-delivery-schedule/workflow.md`. Phase 5 = story-level PERT only.

**Version handoff card:** `references/12-version-handoff.md`. On-demand like commercial-budget — not pipeline phase 6+.

## Phase 0 — Intake

User paste unstructured input (transcript, email, voice note):

1. Ack 1–2 sentences.
2. No structure yet. Route Phase 1.
3. Read `references/00-clarification.md`. Ask batched questions + artifact-persistence (`references/11-artifact-persistence.md`).

## Gate protocol (mandatory between phases)

After pipeline phase 1–5:

1. **Compact summary** — 5–10 bullets.
2. **Persist** — if enabled (Phase 0/1), write/update matching `docs/<project-slug>/*.md` + `roadmap.md` (`references/11-artifact-persistence.md`).
3. **Gate question** — one ask:
   - Phase 1: "Ready to structure requirements, or should I clarify anything else?"
   - Phase 2: "Confirm to proceed to prioritization, or adjust stories?"
   - Phase 3 (activity list): "Confirm sequencing (DAG + ranking) to build the sprint schedule?"
   - Phase 3 (narrative-only): "Confirm DAG sequencing to build the sprint schedule?"
   - Phase 4: "Confirm schedule to run the delivery forecast?"
   - Phase 5: "P85 delivery date is [X]. Anything to adjust?"
4. **Wait** user confirm before next phase.

Never dump Phases 2–5 one response. Never skip Phase 1 on first raw transcript (unless "quick mode" / "proceed with assumptions"). Never infer hard structured data (team/capacity, backlog effort, three-point) — send phase fill-in template, stop.

## Core pipeline (Phases 1–5)

```
Intake > Clarification > Structuring > Prioritization + Sequencing > Scheduling > Forecast
              ^ gate        ^ gate              ^ gate                 ^ gate        ^ gate
```

| Phase | What | Script |
|---|---|---|
| 1 Clarification | Batched questions: OKR, scale, constraints, deadline, stakeholders | — |
| 2 Structuring | Domains, stakeholders, epics, INVEST+Gherkin stories, GitLab cards | — |
| 3 Prioritization + Sequencing | RICE + WSJF (activity list) + DAG layers; narrative path = DAG only | `scripts/rice_wsjf.py`, `scripts/dag_order.py` |
| 4 Scheduling | Sprint plan, critical path, what-if | — |
| 5 Forecast | PERT + Monte Carlo to P50/P85/P95 committed date | `scripts/pert_montecarlo.py` |

Read `references/0N-*.md` at phase start.

## On-demand modes (Phases 6+)

Distinct phrases (router table). Self-contained — read reference, run. Reuse pipeline data when present; never invent metrics. Version handoff is on-demand (like commercial-budget), not a Phase 6+ row — `references/12-version-handoff.md`.

| Mode | Script |
|---|---|
| Risk Monitor | `scripts/flow_metrics.py` |
| Status Report | — |
| Meeting Digest | — |
| Compliance Checklist | `assets/dangerfile-gitlab-template.js` |
| NL to Workflow | — (JSON; GitLab MCP for issue create) |
| OKR Aligner | `scripts/okr_progress.py` |

## Quick mode

User say "quick mode", "skip questions", "proceed with assumptions":

- Phase 1: OKR + deadline only; rest `[ASSUMPTION]`.
- Phase 2: quick structuring (stories + open questions + GitLab cards).
- Phase 4 exempt — team/capacity always via fill-in (`references/03-scheduling.md`), never assumed.
- Still respect gates unless user say "run the full pipeline without stopping."

## Anti-patterns

Read `references/anti-patterns.md` before any Phase 2 User Story.

## GitLab MCP

Use configured GitLab MCP. Unavailable: say so, use user data. Never invent tool names or setup. No mutation (`create_issue`/`update_issue`) without explicit human confirm.

## Language matching (mandatory)

Detect language of **human's latest message** (not skill files, not pasted English docs alone). Use that language for:

- Chat replies, gate questions, clarifications, fill-in templates
- Phase summaries + on-demand reports
- Persisted `docs/<project-slug>/*.md` / `roadmap.md`

Rules:

1. **Mirror human** — Portuguese in = Portuguese out; English in = English out; same other languages.
2. **Mixed** — human language A + paste language B: reply/report in **A**; quote B only for fidelity.
3. **Switch** — human change language mid-chat: switch now.
4. **Keep as-is** — proper nouns, IDs, script/CLI names, JSON keys, GitLab labels, acronyms (RICE, WSJF, P50/P85/P95, OKR).
5. **Default** — ambiguous (emoji-only, single proper noun): English.

## Global behavioral constraints

- Never invent stakeholders, systems, integrations, SLAs, metrics not in input.
- Never infer team/capacity, backlog effort, three-point — send fill-in (`references/0N-*.md`), stop.
- Never compute RICE, WSJF, DAG order, Monte Carlo, flow metrics, OKR rubric in LLM — run script (`rice_wsjf.py`, `dag_order.py`, etc.).
- Layer execution order always from DAG (`dag_order.py`); RICE/WSJF requires activity list with effort + Phase 1 OKR — never on version narrative alone.
- Never dump multiple pipeline phases one response.
- No gold plating: every output line traces input or prior phase.
- Close analytical drafts with human-language equivalent of: "⚠️ Requires human review before entering a sprint."
- Always **Language matching** for user-facing output.

## File index

| File | Phase |
|---|---|
| `references/00-clarification.md` | 1 |
| `references/01-structuring.md` | 2 |
| `references/anti-patterns.md` | 2 (helper) |
| `references/02-prioritization.md` | 3 |
| `references/12-version-handoff.md` | version handoff |
| `assets/version-handoff.template.md` | version handoff |
| `references/03-scheduling.md` | 4 |
| `references/04-forecast.md` | 5 |
| `references/05-risk-monitor.md` | 6 |
| `references/06-status-report.md` | 7 |
| `references/07-meeting-digest.md` | 8 |
| `references/08-compliance-checklist.md` | 9 |
| `references/09-nl-to-workflow.md` | 10 |
| `references/10-okr-aligner.md` | 11 |
| `references/11-artifact-persistence.md` | all (docs/) |
| `references/pm-persist.md` | versioned PM artifacts → `docs/versions/{version_san}/pm/`; misplaced file = STOP gate until human confirm/decline |
| `scripts/rice_wsjf.py` | 3 |
| `scripts/dag_order.py` | 3 |
| `scripts/pert_montecarlo.py` | 5 |
| `scripts/flow_metrics.py` | 6 |
| `scripts/okr_progress.py` | 11 |
| `assets/dangerfile-gitlab-template.js` | 9 |
| `references/ns-commercial-budget/workflow.md` | commercial budget |
| `references/ns-delivery-schedule/workflow.md` | triple delivery schedule |
