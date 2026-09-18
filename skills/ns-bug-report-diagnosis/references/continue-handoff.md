# Continue handoff — after the eight-section report

BRD stays **readonly**. After the chat report, this skill **dispatches** the next owner. It never writes product code.

## Opt-out (diagnose-only)

Stop after the report. Do **not** dispatch implement skills when the user (this turn) said any of:

- "só diagnostica" / "diagnose only"
- "não corrige" / "do not fix" / "don't change code" / "não mexa no código"
- "don't implement" / "sem implementar"
- `/ns-bug-report-diagnosis` **and** an explicit request not to implement

Evals 1–3 cover this path.

## Default (autonomous continue)

After section 8 is in the chat:

| Condition | Dispatch |
| --------- | -------- |
| GitLab `ISSUE_URL` in the report, issue, or this turn | `ns-execution-gitlab-issue` (in-session; lifecycle owner) |
| No URL | `ns-coder` (spawn gate: `coder-agent` when heavy; else in-session) |

Confidence **Low** still dispatches. Section 8 marks hypothesis. Do not wait for a human.

## Payload (required)

Put on section 8 **and** in the dispatch prompt:

- `diagnosis_complete: true`
- Symptom (one line)
- Likely layer
- Files / symbols
- Do not
- Confidence: High | Medium | Low

Parent BRD does **not** run `ns-reviewer` / `ns-judge`. `C` or `G` own those gates.

## Anti-cycle

- **C** receiving `diagnosis_complete: true` treats the rest as implement intent. Do **not** redirect to 4a.
- **G** called from BRD with URL + this payload = execution intent. Do **not** return to 4a.
- **C → BRD** remains when the user pastes a fresh screen story **without** `diagnosis_complete`.

## Empty report

Recover the symptom from `ISSUE_URL` / issue body / screenshot / this session. Ask one question and **stop** only when there is **no** recoverable symptom **and** no URL.
