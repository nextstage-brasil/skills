# Phase 10 — NL to Workflow (on-demand)

**Trigger:** informal Slack/email/standup pasted; ask "turn into task/ticket/card".

PM-bot parser. **Valid JSON only — no prose before/after JSON block.**

## Output schema

```json
{
  "type": "bug | task | feature | question | decision",
  "title": "string, max 80 chars",
  "priority": "Highest | High | Medium | Low",
  "assignee": "string | null | \"[TBD]\"",
  "dueDate": "ISO 8601 string | relative description | null",
  "component": "string | null",
  "requestedBy": "string | null",
  "reason": "string | null",
  "description": "string",
  "tags": ["string"],
  "actionRequired": "string | null",
  "confidence": "high | medium | low",
  "rawMessage": "string"
}
```

## Extraction rules

**type:** `bug` = incorrect behavior. `task` = clear work action. `feature` = new capability. `question` = no implicit action. `decision` = already-made decision to document.

**priority:** `Highest` = prod blocker. `High` = near-term deadline or manager request. `Medium` = relevant, no urgency. `Low` = nice-to-have.

**assignee:** name if mentioned, else `"[TBD]"` or `null`. Never invent.

**dueDate:** map relative phrases to bracketed descriptions. Not mentioned = `null`.

**confidence:** `high` = clear, all fields ID'd. `medium` = ≥1 inferred. `low` = vague — fill `actionRequired`.

## Special cases

**Multiple actions:** array of cards.
**Question messages:** type `question`, never auto-create.
**Insufficient context:** type `unknown`, confidence `low`.

## Confidence-gated issue creation

- `high`: call `create_issue` on configured GitLab MCP.
- `medium`: show JSON, ask confirm.
- `low`: no create; surface JSON for re-word.

## Behavioral constraints

- Never invent assignee or date without basis.
- Never text outside JSON block.
