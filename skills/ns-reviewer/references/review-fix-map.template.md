# Fix map — agent correction only

Audience: coding agent. No human prose. Only what is required to fix.

**Score:** {N}/10  
**Verdict:** Rejected | Blocked

| ID | Sev | File | Issue | Action |
|----|-----|------|-------|--------|
| C1 | P0 | `{path}:{line}` | {one-line defect} | {name the symbol and the call-site contract — e.g. shared pattern constant keeps `/.../` because Laravel `regex:` passes the string to `preg_match`} |
| W1 | P1 | `{path}` | {one-line defect} | {name the symbol and the call-site contract} |

## Order

1. {all P0}
2. {every score-capping P1}

Omit empty sections. Omit P2 that does not block the gate. No positive findings. No suggestions unless they block the score gate.
