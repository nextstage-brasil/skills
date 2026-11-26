# Q9 Approval + publication

Effective L2+ only (L1: report stays local, no preview). GitLab only, via `mcp-gitlab-usage` tools at runtime (MCP-provisioned; read before first call; never a catalog `depends`). Guard script `scripts/qa_publish_plan.py` posts nothing; agent calls MCP. Nothing published, no status changed, nothing deleted without approval of the exact preview (D51). Q1 status sync stays automatic.

## Preconditions (script refuses, exit 2)

`run.json` valid · effective L2+ · Q7 + Q7b `passed` · L3: Q8 `passed` or `skipped` (automation before publication, D51) · profile sha256 = `run.json` `profile_sha256` (no mid-run policy edit) · ledger passes gate (attachment hashes included) · `verdict.json` + `qa-judgment.json` equal recomputation (stale/edited → re-run) · judge `loop.state` ≠ `complement` · score ≥ `judge.min_score` or latest `below_min_score` answer `publish_anyway` (D50) · evidence_dir registered · `report.md`: non-empty; no marker prefix `ns-qa:run=`; headings `## 1.` and `## 8.` present (numbered heading: ATX = up to 3 spaces, 1–6 `#`, number with optional leading zeros, `.` or `)`; or setext = numbered line underlined by `===`/`---`; lines inside fenced code or HTML comments are not headings; missing → refused); everywhere **except the title line** (first H1 before any numbered heading: issue text) **and the §2–§7 spans between the first `## 1.` and the first `## 8.`** (rest of title area, §1, §8, §9+, footer and out-of-order §2–§7 scanned), after normalization (HTML entities decoded, NFKC, invisible characters, markdown emphasis and link targets removed): **no** `x/10`, `x%` / `x percent` / `x por cento`, verdict line (`verdict:` / `veredito:` …) or verdict `en` label (report template i18n; case-insensitive, `Blocked` case-sensitive since `blocked` is a scenario status), whatever the value. Words merely containing a label (`Prehomologated`) are fine. §2–§7 not scanned. Script summary block = single source of verdict, confidence, score.

## 1. Preview

`python3 scripts/qa_publish_plan.py preview --run-dir <run_dir> --profile docs/context/qa-profile.md` → `<run_dir>/preview.md` + open pause `{reason: preview_approval, phase: Q9}` in `run.json` (refused while any pause open). One file, all of:

| Part | Source |
| ---- | ------ |
| Target issue + project | QA issue (`kind=qa`); `qa_issues.mode: none` → dev issue (`kind=dev`) |
| Status | QA issue only: Homologated → `tracker.status_result.homologated`; Not homologated → `homologation_rejected`; With reservations / Blocked → none (stays `qa_running`, D27). Label name from `tracker.status_source` (D41); key unset/absent → none + reason |
| Attachments | Screenshots with `pii_scrubbed: true`, ledger order: file, scenario, AC, sha256, comment part (batches of `tracker.attachments.max_per_comment`, default 10) + local evidence folder. Unmasked → listed "not publishable", never posted |
| Verdict, confidence, score | Header rows + script-rendered summary block opening part 1, from `verdict.json` + `qa-judgment.json` (verdict, confidence %, score / min, loop, rounds, verdict reasons; below-min note) |
| Not uploaded | Header row + part 1 reservation line (files, scenario, AC, local folder) after a failed upload (step 4); else `none` |
| E2E merge request | L3 only: header row + part 1 line `**E2E automation:**` from `run.json` `automation`: `<url> (!<iid>)` or `none — <skip reason>` (`automation-handoff.md`). Below L3: absent |
| Comment(s) | Part 1 = `<!-- ns-qa:run=<run_id>;kind=<dev\|qa> -->` + summary block + `report.md`. Part n ≥ 2 (extra batches) = `<!-- ns-qa:run=<run_id>;kind=<k>;part=<n> -->` + run id + n/total |

Show `preview.md` to human verbatim (chat). Approval of a preview naming the target project = MCP project confirmation for this publication (D37 server change not required).

## 2. Answer

`qa_publish_plan.py approval --run-dir … --profile … --answer <approve|adjust|do_not_publish>` → resolves pause; `run.json` `publication.approvals[]` `{answer, preview_sha256, at}`. `approve` refused if `preview.md` differs from regeneration.

| Answer | Next |
| ------ | ---- |
| `approve` | Step 3 |
| `adjust` | Apply change (report wording, or new round via Q4–Q7b) → `preview` again → new hash → ask again |
| `do_not_publish` | End; nothing posted; run incomplete (Q10 `incomplete`, keep all) |

Waiting = indefinite; nothing published, changed, deleted meanwhile.

## 3. Payload

`qa_publish_plan.py payload …` → JSON parsed back from approved `preview.md`: target, status, `not_uploaded`, comments (`marker`, `body`, `attachments` with run-dir-relative `path` + sha256), `preview_sha256`. Refused unless last answer `approve`, file sha256 = approved hash, file = regeneration. Publish exactly this.

## 4. Publish (uploads first, then comments)

1. `list_issue_comments` on target. Body contains a part's `marker` → skip that part and its files (MCP cannot edit notes; never duplicate).
2. Every remaining batch: `request_issue_attachment_upload` immediately before the batch (tokens expire); upload each file with `upload_url` + token **exactly as returned** (never rewrite scheme/host); collect attachment tokens. Token expired before posting → stall.
3. Any upload failure → post **nothing**; stop uploads; keep every file locally (D10); `preview --not-uploaded <path>...` (failed + not attempted files) → new `preview.md` without them, reservation line + local paths in part 1, new hash → show human, `approval` again (D51: no comment differing from the approved preview). No silent fallback.
4. All uploads ok → `add_issue_comment` per part in order, body exactly as payload + its attachment tokens.
5. After all parts: payload `status` non-null → `set_issue_status` on target (never `set_issue_labels`). Failure → stall.

MCP unavailable → `payload --offline` (writes `<run_dir>/publish-payload.md`) → `record --state offline` → tell human; Q9 not passed; keep all. Retry later allowed (offline outcome can be replaced).

## 5. Record

`qa_publish_plan.py record … --state published [--not-uploaded <path>]... [--note-id <id>]...` → `<run_dir>/publish.json` + `run.json` `publication.outcome {state, evidence_upload, at}`. `--not-uploaded` must equal the approved preview's `Not uploaded` row exactly (else refused). `evidence_upload` derived: not-uploaded files → `partial`; no attachment → `not_needed`; else `complete`; offline → `none`. Then `run.json` Q9 `passed` (gate: outcome `published`). Re-run after `published` refused (idempotent: Q9 three times = one comment).

Q10 outcome: `published` + `complete`/`not_needed` → `success`; `partial` → `upload_partial` (keep all; human attaches); offline → `gate_failure`.
