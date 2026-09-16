# Consolidated product roadmap — {product_name}

**Last updated:** {YYYY-MM-DD HH:MM} ({timezone_or_local}) — by {author_name_or_handle}  
**Product / platform:** {product_name}  
**Tracker card (optional):** {tracker_url_or_id} — when present, must mirror this file.

### Update timeline

Newest first. One line per change — what changed, not a full changelog.

| When | By | Change |
|------|----|--------|
| {YYYY-MM-DD HH:MM} | {author} | {one-line summary of this edit} |
| {YYYY-MM-DD HH:MM} | {author} | {one-line summary} |

---

## Project definitions

| Role | Person |
|------|--------|
| Product Owner | {name_or_—} |
| Key user | {name_or_—} |

- **Operational / structural questions:** {name_or_role}.
- **Decision flow:** {how_decisions_are_made_or_escalated}.

---

## 1. Product vision and strategy

{1–3 short paragraphs: problem, audience, platform role — only from input}

### Key product objectives

- **{theme}:** {one-line outcome}
- **{theme}:** {one-line outcome}
- **{theme}:** {one-line outcome}

---

## 2. Detail by module

### 2.1 {Module name}

- {capability or outcome bullet}
- {capability or outcome bullet}

### 2.2 {Module name}

- {capability or outcome bullet}
- {capability or outcome bullet}

---

## 3. Technical dependencies and execution rules

### Structural dependencies

1. **{version_id} ({short name})** — {why it matters / what it unblocks}. Source: {tracker_or_decision}.
2. **{version_id} ({short name})** — {dependency on prior version}. Source: {tracker_or_decision}.

### Prioritization rules

- **Single focus:** {active version rule — only if stated}.
- **Temporary operations:** {workaround until a version lands — only if stated}.

---

## 4. Versions

Committed roadmap. Ideas without a version stay in §5.

**Row order (mandatory in §4.1 and §4.2):** SemVer ascending on the version id (`1.20.1` → `1.20.2` → `1.21.0`). Name-only rows (no numeric version) after all SemVer rows, keeping the order they were given.

### 4.1 Delivered

| Version | Objective | Period | Detail link | Source |
|---------|-----------|--------|-------------|--------|
| {version_id} {short name} | {one-line objective} | {period} | {tracker_or_—} | {tracker \| milestone \| PM artifact \| human statement} |

### 4.2 In progress + planned

| Version | Status | Objective | Period | Detail link | Source |
|---------|--------|-----------|--------|-------------|--------|
| {version_id} {short name} | {in_progress \| to_start \| blocked \| partial_scope} | {one-line objective} | {period_or_TBD} | {tracker_or_—} | {tracker \| milestone \| PM artifact \| human statement} |

---

## 5. Backlog to evaluate

Candidates without a version (icebox). Do not enter §4 until a version is committed.

- **{theme}**
  - {tracker_id_or_—} {title} — source: {tracker | human statement}
  - {tracker_id_or_—} {title} — source: {tracker | human statement}
- **{theme}**
  - {tracker_id_or_—} {title} — source: {tracker | human statement}

---

## How to update

- On every edit: set **Last updated** to date + time + author; prepend one row to **Update timeline** (newest first).
- **§4.1 / §4.2 sort:** SemVer ascending; name-only (no number) after numbered, in given order. Re-sort after add/move.
- **§4.1:** delivered versions. **§4.2:** future (in progress, review, to start, blocked).
- **Detail link:** version detail document or tracker card when it exists; otherwise `—`. **Source:** mandatory (tracker, milestone, PM artifact, or human statement) — never a §4 row without it.
- **On version complete:** move row from 4.2 to 4.1; compress Objective to one line; re-sort both tables.
- **On versioning backlog:** add a 4.2 row; remove the matching §5 block; re-sort §4.2.
- Align tracker milestones to version ids in this file when the team uses them.
- When a tracker card mirrors this file: update that card after every edit to this document.

---

⚠️ Requires human review before treating as the official product roadmap.
