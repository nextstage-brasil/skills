# System reverse spec — agent index

**Paired with:** `system-reverse-spec.md` (human-readable executive body).
**Audience:** agents only. Prefer this file over the prose body when planning or implementing.

## Entities

| Entity | Meaning (1 line) | Key states | Relations |
| ------ | ---------------- | ---------- | --------- |
| {name} | {business meaning} | {a → b → c or —} | {links} |

## Use cases

| ID | Title | Actor | Goal | Outcome |
| -- | ----- | ----- | ---- | ------- |
| UC-01 | {title} | {actor} | {goal} | {result} |

## Business rules

Group by domain. Pattern: `When [condition] → [behavior] (unless [exception])`.

### {Domain}

- When … → … (unless …)
- …

## Access

| Role | Can | Cannot |
| ---- | --- | ------ |
| {role} | {capabilities} | {blocks} |

## Integrations

| Name | Purpose | If down |
| ---- | ------- | ------- |
| {name} | {why} | {block / degrade / manual} |

## Negative rules

- Cannot {X} without {Y}
- …

## Validate with humans

- {inferred / ambiguous / possible bug — one line each}
