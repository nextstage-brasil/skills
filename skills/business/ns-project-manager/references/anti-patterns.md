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

## Ambiguity protocol (never invent value)

| Category | Triggers | Ask for |
|---|---|---|
| Performance | "fast", "real-time", "responsive" | SLA in ms or req/s |
| Scale | "many users", "high volume" | order of magnitude |
| Security | "secure", "protected", "access-controlled" | compliance standard (LGPD, GDPR, SOC 2, ISO 27001, OWASP) |
| Integration | "connect to X", "import from Y" | API availability, auth method, format, SLA |
| Approval | "approved by", "validated by manager" | who approves, deadline, what if expires |
