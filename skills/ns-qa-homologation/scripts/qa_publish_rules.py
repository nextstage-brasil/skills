#!/usr/bin/env python3
"""Q9 publication plan (references/publication.md). Stdlib only. Pure: no I/O.

One preview.md holds everything the human approves (comment text with the
idempotency marker, attachments, status, target); the publish payload is parsed
back from that same file, so what is published equals what was approved.
"""

from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass, field

MARKER_PREFIX = "ns-qa:run="
_TILDE_RUN = re.compile(r"~+")
_COMMENT_HEADING = re.compile(r"^## Comment ([0-9]+)/([0-9]+)$")
_ATTACHMENT_ROW = re.compile(
    r"^\| ([0-9]+) \| ([0-9]+) \| `([^`]+)` \| (S-[0-9]+) \| ([^|]+) \| `([0-9a-f]{64})` \|$"
)
_TARGET_ROW = re.compile(r"^\| Target issue \| `([^`]+)` \(`(dev|qa)`\) \|$")
_STATUS_ROW = re.compile(r"^\| Status \| (?:`([^`]+)` → `([^`]+)`|none — (.+)) \|$")
_NOT_UPLOADED_ROW = re.compile(r"^\| Not uploaded \| (none|`[^|]+`) \|$")
# Any score / percentage claim (leftmost match; value irrelevant: §1/§8 must state none).
_SCORE_CLAIM = re.compile(r"[0-9]+(?:[.,][0-9]+)?\s*/\s*10(?![0-9])")
_PERCENT_CLAIM = re.compile(r"[0-9]+(?:[.,][0-9]+)?\s*(?:%|percent\b|por cento\b|por ciento\b|pour cent\b)")
_VERDICT_LINE = re.compile(r"\b(?:verdict|veredito|veredicto|verdetto)\s*[:—–-]")
# Numbered report section heading (report.template.md "## 1. ..."): ATX = optional indent, 1-6 '#', number
# (leading zeros allowed), '.' or ')'; setext = numbered text line underlined by '===' or '---'.
_ATX_HEADING = re.compile(r"^ {0,3}#{1,6}[ \t]*([0-9]+)[ \t]*[.)]", re.MULTILINE)
# Spans where a heading-looking line is not a heading: fenced code blocks and HTML comments.
_OPAQUE_SPAN = re.compile(r"^ {0,3}(`{3,}|~{3,})[^\n]*\n.*?(?:^ {0,3}\1[ \t]*$|\Z)|<!--.*?(?:-->|\Z)",
                          re.MULTILINE | re.DOTALL)
# Report title (report.template.md `# {title} — {dev issue ref}`): first H1 line; carries the issue's own text.
_TITLE = re.compile(r"^ {0,3}#[ \t][^\n]*$", re.MULTILINE)
_SETEXT_HEADING = re.compile(r"^ {0,3}([0-9]+)[ \t]*[.)][^\n]*\n {0,3}(?:=+|-+)[ \t]*$", re.MULTILINE)
_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
# Sections never scanned for result claims (criteria text, ratios); everything else is, at L2+.
FREE_SECTIONS = range(2, 8)
REQUIRED_SECTIONS = (1, 8)
_INVISIBLE = re.compile("[\u200b\u200c\u200d\u2060\ufeff\u00ad]")
_EMPHASIS = re.compile(r"[*_`~]")
_SCENARIO_STATUS_WORDS = ("blocked",)
STATUS_RESULT_KEYS = {"homologated": "homologated", "not_homologated": "homologation_rejected"}


class PreviewFormatError(ValueError):
    """preview.md does not have the structure this module renders."""


def marker(run_id: str, kind: str, part: int) -> str:
    """Part 1 = the spec marker; parts >= 2 carry ';part=<n>' so each comment is idempotent on its own."""
    suffix = "" if part == 1 else f";part={part}"
    return f"<!-- {MARKER_PREFIX}{run_id};kind={kind}{suffix} -->"


@dataclass(frozen=True)
class Target:
    issue: str
    kind: str

    @property
    def project(self) -> str:
        return self.issue.rsplit("#", 1)[0]


@dataclass(frozen=True)
class StatusChange:
    key: str | None
    label: str | None
    reason: str


@dataclass(frozen=True)
class Capture:
    """Publishable screenshot (PII masked) of one scenario."""

    path: str
    scenario: str
    covers: tuple[str, ...]
    sha256: str


@dataclass(frozen=True)
class Attachment:
    """Capture assigned to comment part `part` (batches of max_per_comment)."""

    path: str
    scenario: str
    covers: tuple[str, ...]
    sha256: str
    part: int


@dataclass(frozen=True)
class Summary:
    """Script-rendered facts of verdict.json + qa-judgment.json; first lines of comment part 1."""

    verdict: str
    confidence: int
    score: float
    min_score: float
    loop: str
    rounds: int
    reasons: tuple[str, ...] = ()

    @classmethod
    def from_results(cls, verdict: dict, judgment: dict) -> "Summary":
        return cls(verdict["verdict"], verdict["confidence"], judgment["score"], judgment["min_score"],
                   judgment["loop"]["state"], judgment["rounds"], tuple(verdict["reasons"]))

    def lines(self) -> list[str]:
        lines = [
            f"**Verdict:** `{self.verdict}` · **Confidence:** {self.confidence}%",
            f"**Homologation score:** {self.score:g}/10 (minimum {self.min_score:g}) · loop `{self.loop}` · "
            f"rounds {self.rounds}",
        ]
        if self.reasons:
            lines.append("**Reasons:** " + "; ".join(self.reasons))
        if self.score < self.min_score:
            lines.append("**Below the minimum score:** published on explicit human decision (`publish_anyway`)")
        return lines


@dataclass
class PublicationPlan:
    run_id: str
    target: Target
    status: StatusChange
    evidence_folder: str
    summary: Summary
    attachments: list[Attachment] = field(default_factory=list)
    unpublishable: list[str] = field(default_factory=list)
    not_uploaded: list[Capture] = field(default_factory=list)
    automation: str | None = None  # L3 only: Q8 MR link or "none — <skip reason>"
    bodies: list[str] = field(default_factory=list)


def target_of(issue: dict) -> Target:
    return Target(issue["qa"], "qa") if issue["qa"] else Target(issue["dev"], "dev")


def status_change(target: Target, verdict: str, status_result: dict, labels: dict, source: str) -> StatusChange:
    """D27/D41: QA issue gets a result status only for Homologated / Not homologated; names from status_source."""
    if target.kind != "qa":
        return StatusChange(None, None, "no QA issue: development issue status unchanged")
    profile_key = STATUS_RESULT_KEYS.get(verdict)
    if profile_key is None:
        return StatusChange(None, None, f"verdict {verdict}: QA issue stays in qa_running")
    key = status_result.get(profile_key)
    if key is None:
        return StatusChange(None, None, f"tracker.status_result.{profile_key} not set: status step skipped")
    if key not in labels:
        return StatusChange(None, None, f"key {key} absent from {source}: status step skipped")
    return StatusChange(key, labels[key], f"verdict {verdict}")


def captures_of(ledger: dict) -> tuple[list[Capture], list[str]]:
    """PII-masked screenshots in ledger order; unmasked ones are never published."""
    publishable, unpublishable = [], []
    for scenario in ledger["scenarios"]:
        for entry in scenario["evidence"]:
            if entry["kind"] != "screenshot":
                continue
            if entry["pii_scrubbed"] is not True:
                unpublishable.append(entry["path"])
                continue
            publishable.append(Capture(entry["path"], scenario["id"], tuple(scenario["covers"]), entry["sha256"]))
    return publishable, unpublishable


def batch_attachments(captures: list[Capture], not_uploaded: list[str], max_per_comment: int):
    """(attachments to post, consecutively batched per comment part; captures kept local after a failed upload)."""
    kept = [item for item in captures if item.path in not_uploaded]
    posted = [item for item in captures if item.path not in not_uploaded]
    batched = [Attachment(item.path, item.scenario, item.covers, item.sha256, index // max_per_comment + 1)
               for index, item in enumerate(posted)]
    return batched, kept


def intro_lines(summary: Summary, not_uploaded: list[Capture], folder: str, automation: str | None = None) -> list[str]:
    lines = summary.lines()
    if automation is not None:
        lines.append(f"**E2E automation:** {automation}")
    if not_uploaded:
        files = ", ".join(f"`{item.path}` ({item.scenario}: {', '.join(item.covers)})" for item in not_uploaded)
        lines.append(f"**Reservation — evidence upload partial:** not uploaded, kept locally in `{folder}`: {files}")
    return lines


MAX_COMMENT_CHARS = 9500  # GitLab MCP add_issue_comment rejects bodies above 10000 characters; margin for the part header


def _pack(blocks: list[str], limit: int) -> list[str]:
    """Greedy: consecutive blocks joined while the chunk stays within limit."""
    chunks: list[str] = []
    for block in blocks:
        if chunks and len(chunks[-1]) + len(block) <= limit:
            chunks[-1] += block
        else:
            chunks.append(block)
    return chunks


def split_comment_text(text: str, limit: int = MAX_COMMENT_CHARS) -> list[str]:
    """Chunks of at most `limit` characters, cut at `## ` headings first, then at blank lines, then at lines."""
    if len(text) <= limit:
        return [text]
    chunks: list[str] = []
    for section in _pack(re.split(r"(?m)^(?=## )", text), limit):
        if len(section) <= limit:
            chunks.append(section)
            continue
        paragraphs = _pack(re.split(r"(?<=\n\n)", section), limit)
        for paragraph in paragraphs:
            if len(paragraph) <= limit:
                chunks.append(paragraph)
                continue
            lines = _pack(paragraph.splitlines(keepends=True), limit)
            chunks += [piece for line in lines for piece in (line[i:i + limit] for i in range(0, len(line), limit))]
    return chunks


def comment_bodies(run_id: str, kind: str, report: str, parts: int, intro: list[str]) -> list[str]:
    """Part 1 = marker + summary + report start; a report longer than the MCP limit continues in parts 2..n (cut at
    headings), each with its own marker and `run · n/total`. `parts` = minimum count (attachment batches)."""
    summary = "\n".join(intro)
    chunks = split_comment_text(f"{summary}\n\n{report.rstrip()}\n")
    total = max(parts, len(chunks))
    bodies = [f"{marker(run_id, kind, 1)}\n\n{chunks[0].rstrip()}\n"]
    for part in range(2, total + 1):
        text = chunks[part - 1].rstrip() if part <= len(chunks) else ""
        tail = f"\n\n{text}" if text else ""
        bodies.append(f"{marker(run_id, kind, part)}\n\n`{run_id}` · {part}/{total}{tail}\n")
    return bodies


def _fence(body: str) -> str:
    longest = max((len(run) for run in _TILDE_RUN.findall(body)), default=0)
    return "~" * max(4, longest + 1)


def _status_cell(status: StatusChange) -> str:
    return f"`{status.key}` → `{status.label}`" if status.key else f"none — {status.reason}"


def render_preview(plan: PublicationPlan) -> str:
    parts = len(plan.bodies)
    lines = [
        f"# Publication preview — `{plan.run_id}`",
        "",
        "Answer: `approve` (publish exactly this) · `adjust` (say what to change; new preview) · "
        "`do_not_publish` (nothing posted; run ends incomplete; everything kept).",
        "",
        "| Item | Value |",
        "| ---- | ----- |",
        f"| Target project | `{plan.target.project}` |",
        f"| Target issue | `{plan.target.issue}` (`{plan.target.kind}`) |",
        f"| Status | {_status_cell(plan.status)} |",
        f"| Verdict | `{plan.summary.verdict}` |",
        f"| Confidence | {plan.summary.confidence}% |",
        f"| Homologation score | {plan.summary.score:g}/10 (minimum {plan.summary.min_score:g}; loop "
        f"`{plan.summary.loop}`; rounds {plan.summary.rounds}) |",
        f"| Not uploaded | {', '.join(f'`{item.path}`' for item in plan.not_uploaded) or 'none'} |",
        *([f"| E2E merge request | {plan.automation} |"] if plan.automation is not None else []),
        f"| Comments | {parts} |",
        f"| Local evidence folder | `{plan.evidence_folder}` |",
        "",
        "## Attachments",
        "",
        "| # | Comment | File | Scenario | AC | sha256 |",
        "| - | ------- | ---- | -------- | -- | ------ |",
    ]
    lines.extend(
        f"| {index} | {item.part} | `{item.path}` | {item.scenario} | {', '.join(item.covers)} | `{item.sha256}` |"
        for index, item in enumerate(plan.attachments, start=1)
    )
    unpublishable = ", ".join(f"`{path}`" for path in plan.unpublishable) or "none"
    lines += ["", f"Not publishable (PII not masked; kept locally): {unpublishable}", ""]
    for part, body in enumerate(plan.bodies, start=1):
        fence = _fence(body)
        lines += [f"## Comment {part}/{parts}", "", f"{fence}markdown", body.rstrip("\n"), fence, ""]
    return "\n".join(lines)


def _one(pattern: re.Pattern, lines: list[str], label: str) -> re.Match:
    matches = [match for match in map(pattern.match, lines) if match]
    if len(matches) != 1:
        raise PreviewFormatError(f"preview.md: expected one {label} row, found {len(matches)}")
    return matches[0]


def _comments(lines: list[str]) -> list[str]:
    bodies, index = [], 0
    while index < len(lines):
        heading = _COMMENT_HEADING.match(lines[index])
        if not heading:
            index += 1
            continue
        if int(heading.group(1)) != len(bodies) + 1 or index + 2 >= len(lines):
            raise PreviewFormatError(f"preview.md: comment heading out of order at line {index + 1}")
        opening = lines[index + 2]
        fence = opening[: len(opening) - len("markdown")]
        if not opening.endswith("markdown") or not fence or set(fence) != {"~"}:
            raise PreviewFormatError(f"preview.md: comment {heading.group(1)} has no opening fence")
        try:
            end = lines.index(fence, index + 3)
        except ValueError as exc:
            raise PreviewFormatError(f"preview.md: comment {heading.group(1)} fence never closed") from exc
        bodies.append("\n".join(lines[index + 3:end]) + "\n")
        index = end + 1
    if not bodies:
        raise PreviewFormatError("preview.md: no comment section")
    return bodies


def parse_preview(text: str) -> dict:
    """Publish payload fields read back from preview.md (the approved file)."""
    lines = text.split("\n")
    bodies = _comments(lines)
    header = lines[: next(index for index, line in enumerate(lines) if _COMMENT_HEADING.match(line))]
    target = _one(_TARGET_ROW, header, "target issue")
    status = _one(_STATUS_ROW, header, "status")
    not_uploaded = _one(_NOT_UPLOADED_ROW, header, "not uploaded").group(1)
    attachments = [
        {"path": row.group(3), "scenario": row.group(4), "covers": row.group(5).split(", "),
         "sha256": row.group(6), "comment": int(row.group(2))}
        for row in map(_ATTACHMENT_ROW.match, header) if row
    ]
    issue, kind = target.group(1), target.group(2)
    return {
        "target": {"project": issue.rsplit("#", 1)[0], "issue": issue, "kind": kind},
        "status": {"key": status.group(1), "label": status.group(2)} if status.group(1) else None,
        "status_reason": status.group(3),
        "not_uploaded": [] if not_uploaded == "none" else [item.strip("`") for item in not_uploaded.split(", ")],
        "comments": [
            {
                "part": part,
                "marker": body.split("\n", 1)[0],
                "body": body,
                "attachments": [item for item in attachments if item["comment"] == part],
            }
            for part, body in enumerate(bodies, start=1)
        ],
    }


def normalize_claims(text: str) -> str:
    """Text as claims are read: HTML entities decoded, NFKC (fullwidth forms), invisible characters,
    markdown emphasis and link targets removed (NBSP is \\s). Case kept: callers decide case sensitivity."""
    text = unicodedata.normalize("NFKC", html.unescape(text))
    return _LINK.sub(r"\1", _EMPHASIS.sub("", _INVISIBLE.sub("", text)))


def _label_pattern(label: str, verdict_statuses: tuple[str, ...]) -> re.Pattern:
    """Whole-phrase match; case-insensitive unless the label is also a scenario status word (e.g. blocked)."""
    flags = 0 if label.lower() in verdict_statuses else re.IGNORECASE
    phrase = r"\s+".join(re.escape(word) for word in label.split())
    return re.compile(rf"(?<![A-Za-z]){phrase}(?![A-Za-z])", flags)


def _opaque_spans(report: str) -> list[tuple[int, int]]:
    return [match.span() for match in _OPAQUE_SPAN.finditer(report)]


def _inside(offset: int, spans: list[tuple[int, int]]) -> bool:
    return any(start <= offset < end for start, end in spans)


def section_headings(report: str) -> list[tuple[int, int]]:
    """(offset, section number) of every numbered heading, ATX or setext, in document order; lines inside
    fenced code or HTML comments are not headings (they cannot open or close a §2-§7 span)."""
    opaque = _opaque_spans(report)
    found = [(match.start(), int(match.group(1))) for pattern in (_ATX_HEADING, _SETEXT_HEADING)
             for match in pattern.finditer(report) if not _inside(match.start(), opaque)]
    return sorted(found)


def _without_title(report: str, headings: list[tuple[int, int]]) -> str:
    """Blank the template title line (first H1 before any numbered heading): issue text, not a result claim.
    Same length, so heading offsets stay valid."""
    first_heading = headings[0][0] if headings else len(report)
    opaque = _opaque_spans(report)
    title = next((match for match in _TITLE.finditer(report) if not _inside(match.start(), opaque)), None)
    if title is None or title.start() >= first_heading:
        return report
    return report[:title.start()] + " " * (title.end() - title.start()) + report[title.end():]


def claim_text(report: str) -> tuple[str, list[int]]:
    """Report without the title line and the §2-§7 spans between the first §1 and the first §8 (rest of
    title area, §1, §8, §9+, footer and any out-of-order §2-§7 stay) + required sections missing."""
    headings = section_headings(report)
    report = _without_title(report, headings)
    opening = next((offset for offset, number in headings if number == 1), 0)
    closing = next((offset for offset, number in headings if number == 8), len(report))
    kept, cursor = [], 0
    for index, (offset, number) in enumerate(headings):
        if number not in FREE_SECTIONS or not opening < offset < closing:
            continue  # §2-§7 are free only in template order: after the first §1, before the first §8
        end = headings[index + 1][0] if index + 1 < len(headings) else len(report)
        kept.append(report[cursor:offset])
        cursor = end
    kept.append(report[cursor:])
    numbers = {number for _offset, number in headings}
    return "".join(kept), [number for number in REQUIRED_SECTIONS if number not in numbers]


def report_conflicts(report: str, labels: dict[str, str]) -> list[str]:
    """Result claims in report.md outside §2-§7 at L2+ (publication.md): the script summary block is the
    single source of verdict, confidence and score, so ANY score (`x/10`), percentage (`x%`, `x percent`,
    ...), verdict label (report template i18n `en`) or verdict line there is refused, whatever its value.
    §2-§7 are not scanned (criteria text, ratios). A missing §1 or §8 heading is refused (template keeps
    the 8 numbered sections)."""
    scanned, missing = claim_text(report)
    errors = [f"report.md has no section {number} heading ('## {number}. ...'): the template keeps 8 numbered "
              "sections; everything outside §2-§7 is checked for result claims" for number in missing]
    text = normalize_claims(scanned)
    where = "report.md (outside §2-§7)"
    errors.extend(f"{where} states a score ({match.group(0).strip()}): the summary block is the single source"
                  for match in _SCORE_CLAIM.finditer(text))
    errors.extend(f"{where} states a percentage ({match.group(0).strip()}): the summary block is the single source"
                  for match in _PERCENT_CLAIM.finditer(text.lower()))
    errors.extend(f"{where} restates the verdict ('{match.group(0).strip()}'): the summary block is the single source"
                  for match in _VERDICT_LINE.finditer(text.lower()))
    patterns = sorted(labels.values(), key=len, reverse=True)
    errors.extend(f"{where} names verdict label '{label}': the summary block is the single source"
                  for label in patterns if _label_pattern(label, _SCENARIO_STATUS_WORDS).search(text))
    return errors
