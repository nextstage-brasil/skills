#!/usr/bin/env python3
"""Q9 approval + publication guard for ns-qa-homologation. Stdlib only. Posts nothing.

Builds RUN_DIR/preview.md (the one file the human approves), records the
answer in run.json, hands the agent the publish payload parsed back from the
approved preview, and records the outcome (references/publication.md).

Usage (every subcommand: --run-dir RUN_DIR --profile PROFILE_MD [--repo .]):
  qa_publish_plan.py preview [--not-uploaded PATH]...
                                              write preview.md, open the preview_approval pause
                                              (--not-uploaded: files whose upload failed; new preview without them)
  qa_publish_plan.py approval --answer A      A = approve | adjust | do_not_publish
  qa_publish_plan.py payload [--offline]      print the payload (--offline: also publish-payload.md)
  qa_publish_plan.py record --state S [--not-uploaded PATH]... [--note-id ID]...
                                              S = published | offline; writes publish.json + run.json outcome

Exit codes (1 never returned by design):
  0  done
  2  refused: effective level below L2, a gate not passed, profile changed since Q0, verdict/judgment
     stale, report.md contradicting them, score below
     judge.min_score without the human answer publish_anyway, preview not approved / changed after
     approval / stale, publication already recorded, attachment file not matching the ledger (ledger gate)
  3  invalid input: unreadable/unparseable file, invalid profile, bad usage
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "publish_plan", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_artifacts import (  # noqa: E402
    JUDGMENT_FILE,
    REPORT_TEMPLATE,
    LEDGER_FILE,
    RUN_FILE,
    TEMPLATES,
    VERDICT_FILE,
    checked_ledger,
    read_json,
    read_text,
    require_profile_pin,
    verdict_labels,
)
from qa_automation_rules import (  # noqa: E402
    AUTOMATION_LEVEL,
    automation_cell,
    automation_terminal,
    selection_problems,
)
from qa_common import (  # noqa: E402
    InvalidInput,
    Rejected,
    sha256_file,
    utc_timestamp,
    write_json_atomic,
    write_text_atomic,
)
from qa_judge_rules import LOOP_COMPLEMENT, AdherenceMissing, judge  # noqa: E402
from qa_policy import QaPolicy, load_policy  # noqa: E402
from qa_profile_rules import status_labels  # noqa: E402
from qa_publish_rules import (  # noqa: E402
    MARKER_PREFIX,
    PreviewFormatError,
    PublicationPlan,
    Summary,
    batch_attachments,
    captures_of,
    comment_bodies,
    intro_lines,
    parse_preview,
    render_preview,
    report_conflicts,
    status_change,
    target_of,
)
from qa_run_rules import check_run  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402
from qa_verdict_rules import evaluate  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
PREVIEW_FILE = "preview.md"
REPORT_FILE = "report.md"
PAYLOAD_MD_FILE = "publish-payload.md"
PUBLISH_FILE = "publish.json"
PUBLISHING_LEVELS = ("L2", "L3")
REQUIRED_PHASES = ("Q7", "Q7b")
ANSWERS = ("approve", "adjust", "do_not_publish")
PREVIEW_REASON = "preview_approval"
BELOW_MIN_REASON = "below_min_score"
PUBLISH_ANYWAY = "publish_anyway"


def _checked_run(run_dir: Path) -> dict:
    run = read_json(run_dir / RUN_FILE, RUN_FILE)
    report = check_run(run, load_schema(TEMPLATES / "qa-run.schema.json"))
    if report.errors:
        raise Rejected(*(f"{RUN_FILE} {error}" for error in report.errors))
    level = run["level"]["effective"]
    if level not in PUBLISHING_LEVELS:
        raise Rejected(f"effective {level}: no publication (report stays local)")
    states = {item["phase"]: item["state"] for item in run["phases"]}
    missing = [phase for phase in REQUIRED_PHASES if states.get(phase) != "passed"]
    if missing:
        raise Rejected(f"{', '.join(missing)} not passed in {RUN_FILE}: publish only after the verdict and the judge")
    if level == AUTOMATION_LEVEL and not automation_terminal(run):
        raise Rejected(f"Q8 not passed or skipped in {RUN_FILE}: at L3 automation runs before publication (D51)")
    return run


def _same_as_file(run_dir: Path, name: str, expected: dict, rerun: str) -> None:
    if read_json(run_dir / name, name) != expected:
        raise Rejected(f"{name} stale or edited: re-run {rerun}")


def _latest_answer(run: dict, reason: str) -> str | None:
    answers = [pause["answer"] for pause in run["pauses"] if pause["reason"] == reason]
    return answers[-1] if answers else None


def _score_allows(run: dict, judgment: dict) -> None:
    """D50: below judge.min_score nothing is published without the recorded human answer publish_anyway."""
    if judgment["loop"]["state"] == LOOP_COMPLEMENT:
        raise Rejected("judge loop not finished (complement): run the complement round first")
    if judgment["score"] >= judgment["min_score"]:
        return
    if _latest_answer(run, BELOW_MIN_REASON) != PUBLISH_ANYWAY:
        raise Rejected(f"score {judgment['score']:g} < judge.min_score {judgment['min_score']:g}: publication needs "
                       f"the human answer {PUBLISH_ANYWAY} on a {BELOW_MIN_REASON} pause (D50)")


def _evidence_folder(run: dict) -> str:
    folders = [item["id"] for item in run["created_resources"] if item["kind"] == "evidence_dir"]
    if not folders:
        raise Rejected(f"{RUN_FILE} registers no evidence_dir: local evidence folder unknown")
    return f"{folders[0]}/evidence"


def _report_text(run_dir: Path) -> str:
    text = read_text(run_dir / REPORT_FILE)
    if not text.strip():
        raise Rejected(f"{REPORT_FILE} is empty")
    if MARKER_PREFIX in text:
        raise Rejected(f"{REPORT_FILE} contains the idempotency marker prefix {MARKER_PREFIX}")
    conflicts = report_conflicts(text, verdict_labels(read_text(REPORT_TEMPLATE)))
    if conflicts:
        raise Rejected(*conflicts)
    return text


def saved_not_uploaded(run_dir: Path) -> list[str]:
    """Not-uploaded files the saved preview.md declares (none when there is no preview yet)."""
    path = run_dir / PREVIEW_FILE
    if not path.is_file():
        return []
    try:
        return parse_preview(read_text(path))["not_uploaded"]
    except PreviewFormatError as exc:
        raise Rejected(f"{PREVIEW_FILE} stale or edited ({exc}): regenerate (preview) and ask the human again") from exc


def _labels(repo: Path, policy: QaPolicy) -> dict:
    path = repo / policy.status_source
    return status_labels(read_text(path)) if path.is_file() else {}


@dataclass
class _Context:
    run_dir: Path
    run: dict
    plan: PublicationPlan
    preview: str  # preview.md text regenerated from the current artifacts

    @property
    def preview_path(self) -> Path:
        return self.run_dir / PREVIEW_FILE

    def saved_preview(self) -> str:
        if not self.preview_path.is_file():
            raise Rejected(f"{PREVIEW_FILE} missing: run preview first")
        return read_text(self.preview_path)

    def require_fresh_preview(self) -> str:
        saved = self.saved_preview()
        if saved != self.preview:
            raise Rejected(f"{PREVIEW_FILE} stale or edited: regenerate (preview) and ask the human again")
        return saved

    def publication(self) -> dict:
        return self.run.get("publication") or {"approvals": [], "outcome": None}

    def require_unpublished(self) -> None:
        """Published = final (idempotent re-run of Q9 does nothing); offline may be retried once MCP is back."""
        publication = self.publication()
        if publication["outcome"] is not None and publication["outcome"]["state"] == "published":
            raise Rejected("publication already recorded (published): nothing to do")
        if publication["approvals"] and publication["approvals"][-1]["answer"] == "do_not_publish":
            raise Rejected("human answered do_not_publish: run ended unpublished (incomplete)")

    def require_approved(self) -> str:
        """Approved preview, unchanged since approval and still equal to the current artifacts."""
        self.require_unpublished()
        approvals = self.publication()["approvals"]
        last = approvals[-1]["answer"] if approvals else None
        if last != "approve":
            raise Rejected(f"{PREVIEW_FILE} not approved (last answer: {last})")
        if sha256_file(self.preview_path) != approvals[-1]["preview_sha256"]:
            raise Rejected(f"{PREVIEW_FILE} changed after approval (sha256 mismatch): regenerate and ask again")
        return self.require_fresh_preview()

    def save_run(self) -> None:
        write_json_atomic(self.run_dir / RUN_FILE, self.run)


def _judgment(ledger: dict, plan: dict, blocked: list[str], policy: QaPolicy) -> dict:
    try:
        return judge(ledger, plan, blocked, policy)
    except AdherenceMissing as exc:
        raise Rejected(*(f"adherence decision missing for {pair}" for pair in exc.pairs)) from exc


def load_context(run_dir: Path, profile: Path, repo: Path, not_uploaded: list[str]) -> _Context:
    """not_uploaded = files excluded after a failed upload (preview: --not-uploaded; others: saved preview)."""
    policy = load_policy(profile, repo)
    run = _checked_run(run_dir)
    require_profile_pin(run, profile)
    checked = checked_ledger(run_dir / LEDGER_FILE, run_dir)
    if checked.report.errors:
        raise Rejected(*(f"ledger rejected: {error}" for error in checked.report.errors))
    if checked.plan is None:
        raise Rejected("plan.yml required: the judge reads areas and waivers")
    ledger, blocked = checked.ledger, checked.report.blocked_reasons
    verdict = evaluate(ledger, blocked, policy)
    _same_as_file(run_dir, VERDICT_FILE, verdict, "qa_gate.py --verdict")
    judgment = _judgment(ledger, checked.plan, blocked, policy)
    _same_as_file(run_dir, JUDGMENT_FILE, judgment, "qa_judge.py")
    _score_allows(run, judgment)
    if run["level"]["effective"] == AUTOMATION_LEVEL:
        problems = selection_problems(run.get("automation"), checked.plan, ledger, policy.runner_none)
        if problems:
            raise Rejected(*problems)
    target = target_of(run["issue"])
    captures, unpublishable = captures_of(ledger)
    unknown = [path for path in not_uploaded if path not in {item.path for item in captures}]
    if unknown:
        raise Rejected(*(f"--not-uploaded {path} is not an attachment of the preview" for path in unknown))
    attachments, kept = batch_attachments(captures, not_uploaded, policy.max_per_comment)
    parts = attachments[-1].part if attachments else 1
    summary = Summary.from_results(verdict, judgment)
    folder = _evidence_folder(run)
    automation = automation_cell(run)
    plan = PublicationPlan(
        run_id=run["run_id"],
        target=target,
        status=status_change(target, verdict["verdict"], policy.status_result, _labels(repo, policy),
                             policy.status_source),
        evidence_folder=folder,
        summary=summary,
        attachments=attachments,
        unpublishable=unpublishable,
        not_uploaded=kept,
        automation=automation,
        bodies=comment_bodies(run["run_id"], target.kind, _report_text(run_dir), parts,
                              intro_lines(summary, kept, folder, automation)),
    )
    return _Context(run_dir=run_dir, run=run, plan=plan, preview=render_preview(plan))


def _open_pause(ctx: _Context) -> dict | None:
    return next((pause for pause in ctx.run["pauses"] if pause["resolved_at"] is None), None)


def command_preview(ctx: _Context, _args: argparse.Namespace) -> dict:
    ctx.require_unpublished()
    pause = _open_pause(ctx)
    if pause is not None:
        detail = "record the answer first (approval)" if pause["reason"] == PREVIEW_REASON else "answer it first"
        raise Rejected(f"open {pause['reason']} pause: {detail}")
    write_text_atomic(ctx.preview_path, ctx.preview)
    digest = sha256_file(ctx.preview_path)
    ctx.run["pauses"].append({"at": utc_timestamp(), "phase": "Q9", "reason": PREVIEW_REASON,
                              "resolved_at": None, "answer": None, "note": f"preview sha256 {digest}"})
    ctx.save_run()
    return {"preview_file": str(ctx.preview_path), "preview_sha256": digest, "waiting": PREVIEW_REASON}


def command_approval(ctx: _Context, args: argparse.Namespace) -> dict:
    ctx.require_unpublished()
    pause = _open_pause(ctx)
    if pause is None or pause["reason"] != PREVIEW_REASON:
        raise Rejected(f"no open {PREVIEW_REASON} pause: run preview first")
    if args.answer == "approve":
        ctx.require_fresh_preview()
    else:
        ctx.saved_preview()
    digest = sha256_file(ctx.preview_path)
    stamp = utc_timestamp()
    pause.update(resolved_at=stamp, answer=args.answer)
    publication = ctx.publication()
    publication["approvals"].append({"answer": args.answer, "preview_sha256": digest, "at": stamp})
    ctx.run["publication"] = publication
    ctx.save_run()
    return {"answer": args.answer, "preview_sha256": digest}


def _payload(ctx: _Context, preview: str) -> dict:
    return {
        "run_id": ctx.plan.run_id,
        "preview_sha256": sha256_file(ctx.preview_path),
        "evidence_folder": ctx.plan.evidence_folder,
        **parse_preview(preview),
    }


def _payload_markdown(payload: dict) -> str:
    lines = [f"# Publish payload (offline) — `{payload['run_id']}`", "",
             f"Target: `{payload['target']['issue']}` · preview sha256 `{payload['preview_sha256']}`", ""]
    status = payload["status"]
    lines += [f"Status: `{status['key']}` → `{status['label']}`" if status else f"Status: none — {payload['status_reason']}",
              ""]
    for comment in payload["comments"]:
        files = ", ".join(f"`{item['path']}`" for item in comment["attachments"]) or "none"
        lines += [f"## Comment {comment['part']}", "", f"Attach: {files}", "", comment["body"]]
    return "\n".join(lines)


def command_payload(ctx: _Context, args: argparse.Namespace) -> dict:
    payload = _payload(ctx, ctx.require_approved())
    if args.offline:
        target = ctx.run_dir / PAYLOAD_MD_FILE
        write_text_atomic(target, _payload_markdown(payload))
        payload["payload_file"] = str(target)
    return payload


def _evidence_upload(ctx: _Context, args: argparse.Namespace) -> str:
    """Not-uploaded files must be exactly those the approved preview reports (D51: no silent change)."""
    declared = sorted(item.path for item in ctx.plan.not_uploaded)
    if sorted(args.not_uploaded) != declared:
        raise Rejected(f"--not-uploaded must list exactly the files the approved preview reports not uploaded "
                       f"({', '.join(declared) or 'none'}): after a failed upload run preview --not-uploaded, "
                       "ask the human again")
    if args.state == "offline":
        if args.not_uploaded:
            raise Rejected("--not-uploaded with state offline: nothing was uploaded")
        if not (ctx.run_dir / PAYLOAD_MD_FILE).is_file():
            raise Rejected(f"state offline needs {PAYLOAD_MD_FILE} (payload --offline)")
        return "none"
    if not ctx.plan.attachments and not args.not_uploaded:
        return "not_needed"
    return "partial" if args.not_uploaded else "complete"


def command_record(ctx: _Context, args: argparse.Namespace) -> dict:
    preview = ctx.require_approved()
    evidence_upload = _evidence_upload(ctx, args)
    stamp = utc_timestamp()
    payload = _payload(ctx, preview)
    result = {
        "run_id": ctx.plan.run_id,
        "preview_sha256": payload["preview_sha256"],
        "state": args.state,
        "evidence_upload": evidence_upload,
        "not_uploaded": list(args.not_uploaded),
        "note_ids": list(args.note_id),
        "target": payload["target"],
        "status": payload["status"],
        "at": stamp,
    }
    publication = ctx.publication()
    publication["outcome"] = {"state": args.state, "evidence_upload": evidence_upload, "at": stamp}
    ctx.run["publication"] = publication
    write_json_atomic(ctx.run_dir / PUBLISH_FILE, result)
    ctx.save_run()
    return result


_COMMANDS = {
    "preview": command_preview,
    "approval": command_approval,
    "payload": command_payload,
    "record": command_record,
}


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "publish_plan", **payload}, indent=2, ensure_ascii=False))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation Q9 approval + publication guard (posts nothing)")
    commands = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)
    for name in _COMMANDS:
        sub = commands.add_parser(name)
        sub.add_argument("--run-dir", required=True, metavar="RUN_DIR")
        sub.add_argument("--profile", required=True, metavar="PROFILE_MD")
        sub.add_argument("--repo", default=".", help="repo root for tracker.status_source")
        if name in ("preview", "record"):
            sub.add_argument("--not-uploaded", action="append", default=[], metavar="PATH",
                             help="file whose upload failed (preview: exclude + report; record: must match preview)")
        if name == "approval":
            sub.add_argument("--answer", required=True, choices=ANSWERS)
        if name == "payload":
            sub.add_argument("--offline", action="store_true", help="MCP unavailable: also write publish-payload.md")
        if name == "record":
            sub.add_argument("--state", required=True, choices=("published", "offline"))
            sub.add_argument("--note-id", action="append", default=[], metavar="ID")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        run_dir = Path(args.run_dir)
        excluded = args.not_uploaded if args.command == "preview" else saved_not_uploaded(run_dir)
        ctx = load_context(run_dir, Path(args.profile), Path(args.repo).resolve(), excluded)
        result = _COMMANDS[args.command](ctx, args)
    except InvalidInput as exc:
        _emit({"command": args.command, "ok": False, "errors": exc.errors})
        return EXIT_INVALID
    except SchemaLiteError as exc:
        _emit({"command": args.command, "ok": False, "errors": [f"bundled schema unsupported: {exc}"]})
        return EXIT_INVALID
    except Rejected as exc:
        _emit({"command": args.command, "ok": False, "errors": exc.errors})
        return EXIT_REJECTED
    except OSError as exc:
        _emit({"command": args.command, "ok": False, "errors": [f"write failed: {exc.strerror or exc}"]})
        return EXIT_INVALID
    _emit({"command": args.command, "ok": True, "errors": [], **result})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
