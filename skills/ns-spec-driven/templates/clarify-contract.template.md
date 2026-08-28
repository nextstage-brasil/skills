# Clarify contract — {version_san}

**Version:** `{version_san}`
**Date:** {ISO date}
**Status:** `open` | `gate0_passed` | `waived`

> Completeness before fidelity. Human confirms at Gate 0. Do not write `requirements.md` from this file until Gate 0 passes.

## Original scope (user-provided)

{verbatim or clearly marked excerpt}

## Brownfield context (if applicable)

- Map: `docs/context/brownfield-map.md`
- Gate: human chose `refresh` | `keep` on {date shown in gate}

## Category checklist

| Category | Status | Notes |
| -------- | ------ | ----- |
| Actors / permissions | answered \| assumed \| waived | |
| Entity states / transitions | answered \| assumed \| waived | |
| Payload fields (type + nullability) | answered \| assumed \| waived | |
| Error / rejection matrix | answered \| assumed \| waived | |
| Pagination / limits / constants | answered \| assumed \| waived | |
| UI screens / elements / handlers / copy | answered \| assumed \| waived \| n/a | |
| Integration / auth | answered \| assumed \| waived \| n/a | |
| Persistence / migration | answered \| assumed \| waived | |
| Out-of-scope | answered \| assumed \| waived | |
| NFRs | answered \| assumed \| waived | |
| Test evidence | answered \| assumed \| waived | |

## Assumed premises

Premises the human accepted. Each row needs impact. Empty if none.

| Premise | Impact |
| ------- | ------ |
| {what we assume} | {what breaks or ships differently if wrong} |

## Sensitive items (round-trip)

Constants, enums, transitions, rejection rules, UI flows/copy, inferences. Silence / `proceed` is not confirmation.

Chat with the human uses observable behavior only (when, HTTP, copy). Do not put product error codes in the Gate 0 question; they belong in this table after the human answers the situation.

`Tudo sim` / `all yes` confirms every remaining **yes/no** row. Silence / `proceed` is not confirmation.

| Item | Proposed value | Human confirmed |
| ---- | -------------- | --------------- |
| {name} | {value} | yes \| no |

## Clarifications obtained

1. Question: {…}
   Answer: {…}

## Confirmed premises

- {Premise 1}

## Source inventory

- `docs/versions/{version_san}/source/{slug}.md` — or `none`
- Coverage ledger: `docs/versions/{version_san}/spec-coverage.md`

## Waiver

If human said `skip clarify`: quote here and point to `unknowns-register.md`. Else `none`.
