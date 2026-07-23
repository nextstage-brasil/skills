# Domain specification — {domain}

> **Product:** {product_name}  
> **Product root:** `{product_root}`  
> **Domain:** `{domain}`  
> **Created:** {created_at} (version `{version_san}`)  
> **Last updated:** {updated_at} (version `{version_san}`)

---

## Purpose

{2–4 lines: functional responsibility, boundaries, main actors}

---

## Data model

| Table / entity | Key fields | Relationships |
|----------------|------------|---------------|
| `{table_name}` | `id`, `{field}` | belongs to `{other}` |

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/{resource}` | {description} |
| `GET` | `/api/v1/{resource}` | {description} |

---

## Requirements

Living functional requirements in SHALL + GIVEN/WHEN/THEN format.

### Requirement: {short name}

The system SHALL {verifiable behavior}.

#### Scenario: {name}
- GIVEN {precondition}
- WHEN {action}
- THEN {expected result}

---

## Changelog

| Version | Date | Summary |
|---------|------|---------|
| `{version_san}` | {date} | Initial domain spec |
