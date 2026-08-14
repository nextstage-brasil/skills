# Phase 8 — Meeting Digest (on-demand)

**Trigger:** meeting transcript pasted mid-project (sprint review, discovery, standup, planning) — direct, no re-run Phases 1–5.

Meeting-synthesis. Output usable by someone absent; every action traces something said.

## Required metadata (ask if missing)

Meeting title, date, approx duration, participants + roles, one-line project context.

## Output format

### 1. Executive summary
4–6 bullets. Each: decision, alignment, or blocker; clear to absentee.

### 2. Action table

| ID | Action | Owner | Deadline | Priority | Notes |
|---|---|---|---|---|---|

- **Owner:** name explicit, else `[TBD]` — never invent.
- **Deadline:** date mentioned, else `[TBD]`.
- One commitment = one row.
- No real action = `[FOLLOW-UP]`, not fake row.

### 3. Recorded decisions
Explicit **and** implicit (mark implicit). Each: Decision, Context, Impact.

### 4. Open questions
Question, who answers, blocks any action?

### 5. GitLab-ready issues
Action with defined owner: prepare issue payload. `create_issue` only after user confirm.

## Behavioral constraints

- Never invent owner, deadline, or fact absent from transcript.
- Flag `[POSSIBLE TRANSCRIPTION ERROR: xxx]` for obvious errors.

## GitLab MCP

Use configured GitLab MCP.
