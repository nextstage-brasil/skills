#!/usr/bin/env python3
"""Q7b homologation judge for ns-qa-homologation. Stdlib only.

Scores the homologation itself (0-10) from RUN_DIR/qa-ledger.json + plan.yml +
profile judge weights, writes RUN_DIR/qa-judgment.json and drives the
completion loop (references/homologation-judge.md).

Usage:
  qa_judge.py --run-dir RUN_DIR --profile PROFILE_MD [--repo .] [--record-round [--added ITEM]...]

--record-round  after a complement round (Q4-Q7 re-run on the actionable gaps):
                appends judge_rounds {round, score_before, score_after, added[, resume]}
                to the ledger. added defaults to the scenario ids new since the
                previous judgment.

Exit codes (1 never returned by design):
  0  judged: loop.state passed | complement | ended_below_min
  2  rejected: ledger fails --check-ledger, plan.yml missing, adherence decision missing,
     judge_rounds edited outside --record-round, round not allowed, profile changed since Q0
  3  invalid input: unreadable/unparseable file, invalid profile, bad usage
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "judge", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_artifacts import (  # noqa: E402
    JUDGMENT_FILE,
    LEDGER_FILE,
    RUN_FILE,
    TEMPLATES,
    checked_ledger,
    read_json,
    require_profile_pin,
)
from qa_common import InvalidInput, Rejected, canonical_sha256, write_json_atomic  # noqa: E402
from qa_judge_rules import LOOP_ENDED, LOOP_PASSED, AdherenceMissing, judge  # noqa: E402
from qa_policy import load_policy  # noqa: E402
from qa_run_rules import check_run  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
RESUME_ANSWER = "continue"


def _previous_judgment(run_dir: Path, run_id: str) -> dict | None:
    path = run_dir / JUDGMENT_FILE
    if not path.exists():
        return None
    previous = read_json(path, JUDGMENT_FILE)
    errors = load_schema(TEMPLATES / "qa-judgment.schema.json").validate(previous)
    if errors:
        raise Rejected(*(f"{JUDGMENT_FILE} {error}" for error in errors))
    if previous["run_id"] != run_id:
        raise Rejected(f"{JUDGMENT_FILE} belongs to run {previous['run_id']}, not {run_id}")
    return previous


def _changed(previous: dict, current: dict) -> bool:
    keys = ("ledger_fingerprint", "adherence_sha256")
    return any(previous[key] != current[key] for key in keys)


def _checked_run(run_dir: Path) -> dict:
    run = read_json(run_dir / RUN_FILE, RUN_FILE)
    report = check_run(run, load_schema(TEMPLATES / "qa-run.schema.json"))
    if report.errors:
        raise Rejected(*(f"{RUN_FILE} {error}" for error in report.errors))
    return run


def _latest_below_min_answer(run: dict) -> str | None:
    answers = [pause["answer"] for pause in run["pauses"] if pause["reason"] == "below_min_score"]
    return answers[-1] if answers else None


class _RoundBook:
    """judge_rounds bookkeeping: consistency with the previous judgment; one new round per --record-round."""

    def __init__(self, run: dict, ledger: dict, previous: dict | None):
        self._run = run
        self._ledger = ledger
        self._previous = previous

    def _require_rounds_untouched(self) -> None:
        """Rounds come only from --record-round: same list as the previous judgment saw."""
        rounds = self._ledger["judge_rounds"]
        if self._previous is None:
            if rounds:
                raise Rejected("judge_rounds present without a previous qa-judgment.json: "
                               "rounds are recorded only by --record-round")
            return
        if canonical_sha256(rounds) != self._previous["judge_rounds_sha256"]:
            raise Rejected("judge_rounds changed outside qa_judge.py --record-round")

    def check_unrecorded(self, current: dict) -> None:
        self._require_rounds_untouched()
        if self._previous is not None and _changed(self._previous, current):
            raise Rejected("ledger changed since the last judgment: record the complement round (--record-round)")

    def _resume(self) -> bool:
        state = self._previous["loop"]["state"]
        if state == LOOP_PASSED:
            raise Rejected("previous judgment passed judge.min_score: no complement round allowed")
        if state != LOOP_ENDED:
            return False
        if _latest_below_min_answer(self._run) != RESUME_ANSWER:
            raise Rejected("cycle ended below judge.min_score: a new round needs the human answer "
                           f"'{RESUME_ANSWER}' on the run.json below_min_score pause")
        return True

    def new_round(self, current: dict, added: list[str]) -> dict:
        if self._previous is None:
            raise Rejected("--record-round needs a previous qa-judgment.json (the first judgment opens the cycle)")
        self._require_rounds_untouched()
        resume = self._resume()
        if not _changed(self._previous, current):
            raise Rejected("round changed nothing since the last judgment")
        rounds = self._ledger["judge_rounds"]
        items = added or [key for key in current["scenario_ids"] if key not in self._previous["scenario_ids"]]
        if not items:
            raise Rejected("round adds nothing: no new scenario; pass --added <gap item>")
        entry = {"round": len(rounds) + 1, "score_before": self._previous["score"],
                 "score_after": current["score"], "added": items}
        return {**entry, "resume": True} if resume else entry


def _judge_once(ledger: dict, plan: dict, blocked: list[str], policy) -> dict:
    try:
        return judge(ledger, plan, blocked, policy)
    except AdherenceMissing as exc:
        raise Rejected(*(f"adherence decision missing for {pair}" for pair in exc.pairs)) from exc


def run(args: argparse.Namespace) -> dict:
    policy = load_policy(Path(args.profile), Path(args.repo).resolve())
    run_dir = Path(args.run_dir)
    run = _checked_run(run_dir)
    require_profile_pin(run, Path(args.profile))
    checked = checked_ledger(run_dir / LEDGER_FILE, run_dir)
    if checked.report.errors:
        raise Rejected(*(f"ledger rejected: {error}" for error in checked.report.errors))
    if checked.plan is None:
        raise Rejected("plan.yml required: the judge reads areas and waivers")
    ledger, blocked = checked.ledger, checked.report.blocked_reasons
    current = _judge_once(ledger, checked.plan, blocked, policy)
    book = _RoundBook(run, ledger, _previous_judgment(run_dir, ledger["run_id"]))
    if args.record_round:
        ledger["judge_rounds"].append(book.new_round(current, args.added))
        current = _judge_once(ledger, checked.plan, blocked, policy)
        write_json_atomic(run_dir / LEDGER_FILE, ledger)
    else:
        book.check_unrecorded(current)
    write_json_atomic(run_dir / JUDGMENT_FILE, current)
    return current


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "judge", **payload}, indent=2))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation Q7b homologation judge")
    parser.add_argument("--run-dir", required=True, metavar="RUN_DIR")
    parser.add_argument("--profile", required=True, metavar="PROFILE_MD")
    parser.add_argument("--repo", default=".", help="repo root for profile tracker.status_source")
    parser.add_argument("--record-round", action="store_true", help="append the complement round just run")
    parser.add_argument("--added", action="append", default=[], metavar="ITEM",
                        help="--record-round: gap item added (default: new scenario ids)")
    args = parser.parse_args(argv)
    if args.added and not args.record_round:
        parser.error("--added needs --record-round")
    if any(not item.strip() for item in args.added):
        parser.error("--added item must not be blank")
    return args


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        judgment = run(args)
    except InvalidInput as exc:
        _emit({"ok": False, "errors": exc.errors})
        return EXIT_INVALID
    except SchemaLiteError as exc:
        _emit({"ok": False, "errors": [f"bundled schema unsupported: {exc}"]})
        return EXIT_INVALID
    except Rejected as exc:
        _emit({"ok": False, "errors": exc.errors})
        return EXIT_REJECTED
    except OSError as exc:
        _emit({"ok": False, "errors": [f"write failed: {exc.strerror or exc}"]})
        return EXIT_INVALID
    _emit({"ok": True, "errors": [], "judgment_file": str(Path(args.run_dir) / JUDGMENT_FILE), **judgment})
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
