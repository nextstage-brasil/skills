# Output template — chat only

ALWAYS use this structure in the user-facing message. Do not add extra top-level sections.

**Instructions in this file are English.** Chat **prose** follows `project-rules.md` communication language when set; otherwise the language of the user's report. Section titles may stay in the chat language.

The **simple** blocks exist so the person who caught the bug can later verify the fix without opening the repo. The **technical** blocks exist so the next agent does not re-investigate from zero.

Use full sentences in sections 2 and 3. No telegraphic fragments.

```markdown
# Diagnosis — {short title in product language}

## 1. Report
{1 paragraph. What the person tried, what they expected, what they saw. No files.}

## 2. What is happening
{2–4 sentences. Plain language. Screens, buttons, business rules the team already uses.
No engineering jargon.}

## 3. How to check after the fix
{Numbered list, 3–7 steps, like a manual test. Starts on the screen (or the real
entry: API, CLI). Says the good result and the result that would still be the bug.
No "run the unit suite", no file paths.}

## 4. Technical diagnosis
{1–2 short paragraphs. Layer, mismatch, why the symptom appears.
Confidence: High | Medium | Low.
Side: UI | API | both | CLI | other (name it).}

## 5. Reproduction
{Numbered, from a known state (signed-in user, record X).
If you could not execute: still write the steps and one line
"I did not run these steps because …".}

## 6. Where to fix (not the patch)
{Bullets of locations. Real workspace paths.
One sentence per location saying its role in the bug. No diff, no new code.}

## 7. Evidence
{Short citations in the host's code-reference format, only the excerpt that proves
the story. If no useful excerpt, describe the observed fact (API response, on-screen text).}

## 8. Handoff to the fixing agent
- diagnosis_complete: true
- Symptom:
- Likely layer:
- Files / symbols:
- Do not:
- Confidence:
```

## Simple-language rules (sections 2 and 3)

Do not use (or close cousins) in those two sections:

- API, endpoint, payload, HTTP, status, JWT, middleware, router, controller
- ORM / Prisma / schema / migration / trigger / queue / worker
- Client-state library names (MobX, Redux, Vuex), form library names, HTTP-client library names
- Test runners (Jest, PHPUnit, Cypress), Docker, container, use case, mapper, engine (as a class name)
- File paths, class names, function names, task ids

Keep business names the team already uses.

**Bad (section 2):** "The store calls `PUT /draft/:id` and the controller returns 422 without an envelope."

**Good (section 2):** "The person clicks Publish, the screen keeps waiting, and the record stays a draft. The server rejects the rules, but the screen does not show what is wrong."

**Bad (section 3):** "Run the unit spec and see it go green."

**Good (section 3):** "Open the draft, click Publish, and check that the missing-rules list appears. The record leaves draft only after those points are resolved."

## Technical section rules (4, 6, 7, 8)

- Brief. The next agent will open the files; you only need to aim them.
- Separate confirmed vs hypothesis ("probable:", "not confirmed at runtime:").
- If consumer rules name a write-boundary, section 8 **Do not** must say: do not write around that path.
- Section 6 may suggest **where**. It must not contain a proposed patch or rewritten function.
- Paths in sections 6 and 8 must be files that exist in **this** workspace. Do not invent paths from another product.

## Reproduction quality

Prefer steps a human can follow at the real entry (UI, API, or CLI). Include:

1. Starting point (which menu / screen / command)
2. Data needed — generic if you lack IDs
3. Exact clicks / fields / arguments
4. Observable result that proves the bug

If the report has no UI (import, job, CLI), reproduce at that layer and say so in section 5.
