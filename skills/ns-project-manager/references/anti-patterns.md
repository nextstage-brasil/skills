# Requirement anti-patterns

Scan input before any User Story. Each hit: flag `[ANTI-PATTERN: type]` inline; add "Open Questions" what clarify.

## Subjectless passive voice
**Example:** "the system must be validated", "the data needs to be processed".
**Problem:** no responsible actor — can't write User Story.
**Action:** ask who does what.

## Unverifiable outcome
**Example:** "the user should have a good experience", "it should be intuitive".
**Problem:** QA can't automate test.
**Action:** ask measurable criterion (response time, error rate, etc.).

## Implicitly infinite scope
**Example:** "support all file types", "work on any device".
**Problem:** can't estimate; any impl challengeable.
**Action:** ask explicit closed list supported cases.

## Double requirement (problematic AND)
**Example:** "the system must monitor speed AND generate monthly reports".
**Problem:** two capabilities one story — breaks INVEST "I".
**Action:** split two independent stories.

## Circular dependency
**Example:** Story A "depends on B being ready" and Story B "depends on A".
**Problem:** neither enters sprint.
**Action:** identify real prerequisite vs mockable.

## Value ranking used as execution order
**Example:** US-03 (export UI) ranked #1 by RICE but depends on US-01 (data pipeline); team builds UI first because score is higher.
**Problem:** RICE answers "what is worth more"; DAG answers "what is buildable now". Score-only order on dependent pipeline schedules UI before backend that feeds it.
**Action:** ranking stays valid as value reading — final execution order from DAG (`references/02-prioritization.md`); RICE sorts within each layer only.

## Polished document over closed decisions
**Example:** five rounds of better tables and diagrams; plan, permissions, rounding, ties and data privacy still unanswered; header says "scope frozen".
**Problem:** development returns dozens of business questions. Every one of them should have been asked before handoff.
**Action:** run `references/decision-coverage.md`. Readiness comes from the register, not from how finished the document looks.

## Text-only ambiguity scan
**Example:** the analyst checks each sentence for vague words but never asks who configures, what current customers get by default, or what happens on a tie.
**Problem:** what nobody wrote is never asked.
**Action:** walk dimensions D1–D14 and the ten rule probes for each capability, even where the input is silent.

## Open question without proposal
**Example:** "What is the tie-break rule?"
**Problem:** the answer costs the business real work, so it stays open.
**Action:** "Recommended: fewest items, then oldest due date; if still tied, no suggestion. Confirm?" Use closed options when no single default is defensible.

## Answer contradicts an earlier round
**Example:** round 1: "the client picks the mode on screen". Round 3: "only internal staff changes the mode".
**Problem:** both survive in the document and the developer has to decide.
**Action:** open a `C-NN` conflict and ask which one wins. Never pick silently.

## Ambiguity protocol (never invent value)

| Category | Triggers | Ask for |
|---|---|---|
| Performance | "fast", "real-time", "responsive" | SLA in ms or req/s |
| Scale | "many users", "high volume" | order of magnitude |
| Security | "secure", "protected", "access-controlled" | compliance standard (LGPD, GDPR, SOC 2, ISO 27001, OWASP) |
| Integration | "connect to X", "import from Y" | API availability, auth method, format, SLA |
| Approval | "approved by", "validated by manager" | who approves, deadline, what if expires |
