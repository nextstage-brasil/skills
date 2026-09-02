# UI contract — {version_san}

**Version:** `{version_san}`
**Date:** {ISO date}
**Source:** `docs/versions/{version_san}/sdd/source/{slug}.md`

> Write this file only when the version includes UI. Copy strings verbatim from source. Do not paraphrase labels or error text.

## Screen: {screen name}

**Source:** {Sx}
**Task grain:** one task if this screen or modal group has ≥6 elements.

### Elements

| data-testid | Element | Handler | Copy (verbatim) | Visibility |
| ----------- | ------- | ------- | --------------- | ---------- |
| `form-{slug}-{role}` | Input \| Button \| … | {event} | {exact string} | {when shown} |

### Flows

1. {user action} → {result} — **Source:** {Sx}

### Empty / error / success copy

- Empty: "{verbatim}"
- Error: "{verbatim}"
- Success: "{verbatim}"

## Screen: {next}

{repeat}
