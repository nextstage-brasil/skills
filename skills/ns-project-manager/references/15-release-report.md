# Release delivery report (board)

On-demand report for **one version going to production**, written for leadership. Business language only. Metrics from scripts — never from the LLM.

Closes the version cycle: PRD → handoff → execution → **release delivery report**.

**Not Status Report (mode 7).** Status Report = period/sprint, three short audiences. This mode = one version going live, one board document, code-derived KPIs.

## Persist paths

| Artifact | Path |
|----------|------|
| Report | `docs/versions/{version_san}/pm/release-report.md` |
| Metrics JSON | `docs/versions/{version_san}/pm/release-metrics.json` |

See `references/pm-persist.md`.

## Router triggers

"relatório de entrega", "release report", "deploy report", "o que vai para produção", version going live + board/diretoria.

Do **not** route here for period/sprint status ("status report da sprint"), version handoff, product roadmap, or deploy checklist (mode 9).

## Workflow (run in order)

### 1. Intake

Confirm required inputs:

| Required | Notes |
|----------|--------|
| Version | e.g. `1.21` → `version_san` |
| Production date/time + timezone | Never invent; ask if missing |
| Repositories | Each with role `processamento` or `interface` |
| Base / target refs | Base = version in production; target = new version (defaults in script: `origin/main` / `origin/release`) |
| Area map | `assets/area-map.<product>.tsv` (or draft — step 2) |

Optional: milestone/issues for the version, saved PRD/handoff, end-to-end test counts (only with real numbers).

### 2. Area map

If the product has no `area-map.<product>.tsv` yet:

1. Draft from first- and second-level folders with **business names** (not folder jargon).
2. Columns: business name, path regex, role (`nucleo` | `produto` | `apoio`). First match wins. Tests are auto-detected — omit from the map.
3. Ask human confirm before continuing.
4. Template: `assets/area-map.template.tsv`. Validated Remunera.ai example: `assets/area-map.remunera.tsv`.

### 3. Collect metrics (human, local)

GitLab MR APIs truncate large diffs — collection must run **inside each repo**.

Give the human one command per repository (adapt paths/labels/refs):

```bash
# From the skill scripts dir, or copy the script into PATH:
bash scripts/release_metrics.sh <label> <papel:processamento|interface> <area-map.tsv> [base] [target] > metrics-<label>.json
```

Human pastes the JSON files back. **Never estimate** code metrics.

### 4. Compute KPIs

Build `processo.json` (non-code inputs):

```json
{
  "versao": "1.20",
  "producao": "2026-10-14T07:00-03:00",
  "entregas_planejadas": 7,
  "revisoes_concluidas": 21,
  "revisoes_total": 21,
  "frentes_negocio": 6
}
```

Run:

```bash
python scripts/release_kpis.py metrics-a.json metrics-b.json --processo processo.json > release-metrics.json
```

Every number in the report comes from this JSON. If any repo has `commits_na_base_fora_do_alvo > 0`, stop and get human confirmation before drafting (production has commits the release lacks).

### 5. Scope and benefits

Read PRD and/or handoff under `docs/versions/{version_san}/pm/` when present. Optionally load version issues via GitLab MCP.

- A **benefit** enters "What changes for the business" only when the matching delivery has completed items.
- Deliveries with no completed items count as **planned** only (effort/scope cards), never as benefits.

### 6. Assemble document

Prefer Claude Doc when available; otherwise Markdown with the same blocks. Fixed section order (Language matching for titles; Portuguese names below are the validated Remunera.ai board form):

1. Title: `Versão {X} — Relatório de Entrega` + product + date line
2. **KPI panel** (directly under title), four blocks:
   - Main indicators — four large cards: production datetime, product size, automated tests, work days
   - Delivery focus — one large card with total % + three smaller area cards inside
   - Team effort — four isolated cards: code changes (commits), files created/changed, lines written, delivery reviews completed
   - Scope and product evolution — four cards: planned deliveries, business fronts, core growth, tests on client screens
3. "A entrega em números" — title + one context sentence
4. Executive summary — production datetime **bold** in the first sentence
5. Chart: platform size before/after (application code lines)
6. Chart: quality — automated tests
7. Chart: where the delivery concentrates (by **lines changed**)
8. What changes for the business
9. A controlled delivery process
10. Sources

**Charts:** fixed images/figures only. No attached data table / "Data" button. Numbers live in `release-metrics.json`.

### 7. Review checklist

Before delivery:

- [ ] Production date/time correct with timezone
- [ ] Focus computed by **lines changed**, not files changed
- [ ] Same numbers in panel, summary, and charts
- [ ] No technical jargon outside the effort block (exception: "(commits)" in parentheses on the effort card)
- [ ] No risks or open items (those belong in Status Report)
- [ ] Every benefit maps to a delivery with completed items

### 8. Persist and close

Write `release-report.md` and `release-metrics.json` under `docs/versions/{version_san}/pm/`.

Close **in chat** (never inside the document): `⚠️ Requer revisão humana antes do envio à diretoria` (or Language matching equivalent).

## Metrics (all base → target, repos summed)

Exclude generated paths from every count (lockfiles, snapshots, `dist/`/`build/`, minified, binaries) — enforced in `release_metrics.sh`.

| KPI | Definition | Block |
|-----|------------|--------|
| Goes to production | Human-provided datetime + timezone | Main |
| Product size | Tracked files at target ÷ base; show `×` and "from X to Y files" | Main |
| Automated tests | Test cases at target ÷ base (`it`/`test`, or each static `.each` line) | Main |
| Work days | Date of last commit in range − first | Main |
| Delivery focus | Lines changed (add+del) of top 3 `nucleo`/`produto` areas ÷ all lines changed | Focus card |
| Density per area | Lines changed ÷ files changed in that area | Focus chart |
| Code changes | Commits on target not in base | Effort |
| Files created or changed | Distinct files in base…target diff | Effort |
| Lines of code written | Lines added in diff, rounded ("~490 mil") | Effort |
| Delivery reviews completed | Closed review issues ÷ opened for the version (GitLab) | Effort |
| Planned deliveries | Sub-version count (e.g. 1.20.1–1.20.7) | Scope |
| Business fronts | Confirmed items in "What changes for the business" | Scope |
| Core growth | Files in map `nucleo` area, target ÷ base | Scope |
| Tests on client screens | Test cases from repos with role `interface`, base → target | Scope |
| Application code | Lines for code extensions from the map, target vs base | Size chart |

**Rounding (pt-BR display):** multipliers one decimal below 3× (`2,6×`), integers from 3× (`17×`); integer percents; thousands with `.` (`2.475`).

## Board content rules

- **Board language.** No backend, frontend, branch, MR, pipeline, suite, `it`/`test`, or folder names. Prefer "telas usadas pelo cliente", "processamento e cálculos", "motor de cálculo". Sole exception: `(commits)` on the effort card.
- **No open items.** Celebrate delivery and process. Risks/pendencies → Status Report only.
- **No unproven claims.** Planned-only deliveries are not benefits. End-to-end tests only with real counts.
- **Self-explanatory KPIs.** Each card: number, label, and a "from → to" or "what it is" line.
- **Simple sources.** Legend like `Fonte: GitLab da <company>, <date>`. No repo or branch names.

## Behavioral constraints

- Never compute KPIs in the LLM — only `release_metrics.sh` + `release_kpis.py`.
- Never invent production datetime, review counts, or end-to-end numbers.
- Never route period/sprint status here.
- Focus share always by lines changed, never by file count.
- Human-review warning in chat only.
