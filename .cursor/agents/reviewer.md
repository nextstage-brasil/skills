---
name: reviewer
description: >-
  Maintainer review bridge for nextstage-brasil/skills. Always use for the review
  gate on catalog/harness or maintainer .cursor work in THIS repo — even if the
  user only says "review", "code review", or "review gate". Thin bridge to
  skills/ns-reviewer — loads AGENTS.md then the skill workflow. Not for consumer
  apps (use harness reviewer-agent → ns-reviewer).
model: grok-4.5[effort=medium,fast=false]
readonly: true
---

# reviewer

Thin skill bridge — do not invent a separate workflow. The skill below is the source of truth.

1. Obey `AGENTS.md` already in host context — **do not** tool-Read it. Complete Session boot per `skills/ns-harness/references/session-boot.md`.
2. Read and follow `skills/ns-reviewer/SKILL.md` in full — run that skill's workflow exactly (skill finishes remaining Session boot steps when not yet done).
3. Honor every gate, handoff, and review contract defined in the skill. Do not substitute platform Task personas (`senior-tech-lead-reviewer`, `bugbot`, `security-review`) for this bridge.
