# Code Review Report — {PRODUCT_NAME} {VERSION}

**Date:** {YYYY-MM-DD}  
**Reviewer:** code-reviewer skill  
**Scope:** {backend | frontend | full-stack} — version `{VERSION}`  
**References:** `requirements.md`, `execution-handoff.md`, project rules

---

## Executive Summary

- **Overall score:** {N}/10
- {Two lines: what is solid and main risk.}

**Additional context:** {Ignored tasks, waivers, partial scope — if applicable.}

---

## Critical Issues (P0)

{Omit section only if none.}

| ID | Layer | File | Issue | Suggested action |
|----|-------|------|-------|------------------|
| B-C1 | BE | `{path}:{line}` | {description} | {concrete action} |
| F-C1 | FE | `{path}` | {description} | {concrete action} |

---

## Improvements (P1)

| ID | Layer | File | Issue | Suggested action |
|----|-------|------|-------|------------------|
| B-W1 | BE | `{path}` | {description} | {action} |

---

## Suggestions (P2)

| ID | Layer | File | Suggestion |
|----|-------|------|------------|
| S-1 | BE/FE | `{path}` | {incremental improvement} |

---

## Positive Findings

### Backend

- {bullet}

### Frontend

- {bullet}

---

## Developer fix map

| ID | P | Layer | File(s) | Summary | Action | Feature / RF |
|----|---|-------|---------|---------|--------|--------------|
| B-C1 | P0 | BE | `{path}` | {summary} | {action} | {RF} |

---

## Recommended execution order

1. {P0 backend tenant/auth}
2. {P0 frontend RBAC/wiring}
3. {P1 remainder}
4. {P2 optional}

---

## Requirements coverage

| Requirement / acceptance criterion | Status | Evidence |
|-----------------------------------|--------|----------|
| {criterion} | Met / Partial / Not met | {finding id or file} |

---

## Code references (sample)

```{lang}
// illustrative snippet — replace with actual finding
```

---

## History

| Date | Author | Note |
|------|--------|------|
| {YYYY-MM-DD} | Code Review Gate | Initial post-implementation review |
