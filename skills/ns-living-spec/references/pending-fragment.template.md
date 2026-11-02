---
domain: {domain}
mode: {version|ad-hoc|appearance}
label: {version_san | adhoc-YYYY-MM-DD | appearance-YYYY-MM-DD}
date: {ISO date}
---

# Pending spec fragment — {domain} — {label}

One fragment per domain touched. Delta only: do not copy unchanged requirements.

## Changelog entry

{summary — exactly the text to append to `## Changelog` in `{domain}.md`}

## Requirements

### Requirement: {short name}

Action: {add | update | remove}

The system SHALL {verifiable behavior}.

#### Scenario: {name}

- **GIVEN** {context}
- **WHEN** {action}
- **THEN** {outcome}

## Data model delta

| Table / entity | Change | Key fields | Relationships |
|----------------|--------|------------|---------------|

## Endpoints delta

| Method | Path | Change | Description |
|--------|------|--------|-------------|

<!-- Omit empty sections. Fragment filename: docs/specs/_pending/{label}-{slug}.md — unique per MR. -->
