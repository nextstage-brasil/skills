# codebase-reverse-spec v3

Evolution of `.cursor/skills/codebase-reverse-spec/`. The original skill **delivers the expected outcome** — this v3 tightens the process where gaps caused rework, inconsistency, or portability issues.

## Evaluation summary (original)

| Aspect | Assessment |
| ------ | ---------- |
| Core principle (tech-agnostic, business language) | Strong — golden rule and confidence marking are the right foundation |
| Phased workflow (0→5) | Sound structure |
| Output quality (when executed) | Good — evidenced by real `system-reverse-spec.md` outputs |
| Bundled resources | **Broken** — `references/spec_template.md` and `references/anti_leakage_checklist.md` are referenced but **not shipped** with the skill |
| Traceability during long runs | Weak — confidence markers and evidence tend to get lost between extraction and final writing |
| Completeness verification | Implicit — no structured check that actors, lifecycles, integrations, negative rules were all covered |
| Portability | Coupled to factory concepts (`product_root`, BatschSpec agents, `core-scope-isolation`) |
| Large codebase handling | Mentioned but not operationalized |

## What changed in v3 (and why)

### 1. Shipped missing reference files — **high impact**

The original SKILL.md points to `spec_template.md` and `anti_leakage_checklist.md` that do not exist in the skill folder. Without them, each run improvises structure and leakage review. v3 bundles:

- `references/spec_template.md` — derived from successful real outputs (9-section structure with appendix)
- `references/anti_leakage_checklist.md` — explicit categories the original only summarized in one paragraph

### 2. Extraction log template — **high impact**

New `references/extraction_log_template.md`. During Phase 2, agents accumulate rules with confidence and evidence pointers **before** writing polished prose. This prevents:

- Losing "Inferred/Ambiguous" markers when switching to final spec
- Promoting suspected bugs to confirmed rules under time pressure
- Re-reading the same code because working notes were not structured

### 3. Coverage matrix — **medium-high impact**

New `references/coverage_matrix.md`. Lightweight completeness gate used in Phase 1 (plan) and Phase 4 (verify). Catches common omissions: permissions in multi-user systems, state lifecycles, negative rules, integration failure modes.

### 4. Phase 1 checkpoint — **medium impact**

Explicit recommendation to present the reconnaissance map before deep extraction. Low cost, high savings when scope is wrong. Skippable for autonomous runs.

### 5. Large codebase strategy — **medium impact**

Concrete domain-by-domain delivery + synthesis pass. The original said "don't read everything" but gave no incremental delivery pattern.

### 6. Decoupled from factory — **portability**

Removed BatschSpec-specific references (`legacy-business-catalog-agent`, `start-planning`, `core-scope-isolation`). Replaced with generic monorepo/external-repo scope guidance. The skill now works standalone in any repo.

### 7. Output language question — **medium impact**

Added to Phase 0. Conversation language, skill language, and spec language are often different (e.g., PT-BR team, IT product UI, EN stakeholder).

### 8. State lifecycle guidance — **medium impact**

Strengthened in Phases 2–3 and template §4. Real outputs show lifecycle documentation is high value; the original mentioned states but did not guide transitions/enforcement explicitly.

### 9. Optional leakage scan script — **low-medium impact**

`scripts/scan_leakage.sh` — first-pass grep for common tech terms. Not a substitute for the checklist (false positives on provider names), but catches obvious leaks faster on long specs.

### 10. Description frontmatter — **triggering**

Rewritten to be more inclusive of trigger phrases (per skill-creator guidance on under-triggering), without changing the skill's scope exclusions.

## What was deliberately NOT changed

| Item | Reason |
| ---- | ------ |
| Core 5-phase workflow | Already works; renaming phases would add churn without gain |
| Confidence taxonomy (Confirmed/Inferred/Ambiguous) | Already correct |
| Golden rule principle | Already the best anchor for the whole skill |
| Language of SKILL.md body | Kept in English for portability; output language is now a Phase 0 question |
| Automated evals / subagent test harness | Out of scope for this delivery — user asked for skill evolution, not benchmark runs |
| Separate references per stack (Java vs PHP vs serverless) | Would overfit; reconnaissance heuristics are already stack-agnostic |

## Migration

Replace or symlink:

```
.cursor/skills/codebase-reverse-spec/     → original (unchanged)
.cursor/skills/codebase-reverse-spec-v3/   → this delivery
```

To adopt v3: copy `codebase-reverse-spec-v3/` to `codebase-reverse-spec/` or update the skill path in your agent config.

## File map

```
codebase-reverse-spec-v3/
├── SKILL.md
├── README.md
├── references/
│   ├── spec_template.md
│   ├── anti_leakage_checklist.md
│   ├── extraction_log_template.md
│   └── coverage_matrix.md
└── scripts/
    └── scan_leakage.sh
```
