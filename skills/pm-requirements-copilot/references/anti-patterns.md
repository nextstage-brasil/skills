# Requirement anti-patterns

Scan the input for these patterns before structuring any User Story. For each occurrence, flag `[ANTI-PATTERN: type]` inline and add to "Open Questions" what needs clarification.

## Subjectless passive voice
**Example:** "the system must be validated", "the data needs to be processed".
**Problem:** no responsible actor — impossible to write a User Story.
**Action:** ask who does what.

## Unverifiable outcome
**Example:** "the user should have a good experience", "it should be intuitive".
**Problem:** QA can't write an automated test.
**Action:** ask for a measurable criterion (response time, error rate, etc.).

## Implicitly infinite scope
**Example:** "support all file types", "work on any device".
**Problem:** impossible to estimate; any implementation can be challenged.
**Action:** ask for an explicit, closed list of supported cases.

## Double requirement (problematic AND)
**Example:** "the system must monitor speed AND generate monthly reports".
**Problem:** two distinct capabilities in one story — violates the "I" in INVEST.
**Action:** split into two independent stories.

## Circular dependency
**Example:** Story A "depends on B being ready" and Story B "depends on A".
**Problem:** neither can enter a sprint.
**Action:** identify which is the real prerequisite and which can be mocked.

## Ambiguity protocol (terms that never get an invented value)

| Category | Triggers | Ask for |
|---|---|---|
| Performance | "fast", "real-time", "responsive" | SLA in ms or req/s |
| Scale | "many users", "high volume" | order of magnitude |
| Security | "secure", "protected", "access-controlled" | compliance standard (LGPD, GDPR, SOC 2, ISO 27001, OWASP) |
| Integration | "connect to X", "import from Y" | API availability, auth method, format, SLA |
| Approval | "approved by", "validated by manager" | who approves, deadline, what happens if it expires |
