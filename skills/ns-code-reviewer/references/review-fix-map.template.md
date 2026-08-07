# Fix map — agent correction only

Audience: coding agent. No human prose. Only what is required to fix.

**Score:** {N}/10  
**Verdict:** Rejected | Blocked

| ID | Sev | File | Issue | Action |
|----|-----|------|-------|--------|
| C1 | P0 | `{path}:{line}` | {one-line defect} | {concrete fix} |
| W1 | P1 | `{path}` | {one-line defect} | {concrete fix} |

## Order

1. {P0 first}
2. {remaining P1 if blocking score}

Omit empty sections. No positive findings. No suggestions unless they block the score gate.
