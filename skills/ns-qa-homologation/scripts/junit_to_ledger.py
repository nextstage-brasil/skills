#!/usr/bin/env python3
"""Merge one runner JUnit report into qa-ledger.json for ns-qa-homologation. Stdlib only.

Each JUnit file = one explicit runner run (runner retries forced to 0). Test cases
map to runner-lane scenarios by exact tokens in the test case name, classname or
enclosing testsuite names: ``@S-n`` (scenario) and/or ``@AC-n`` (criterion; must
resolve to exactly one runner scenario). Other tokens (``@smoke``, ``@regression``)
are ignored. Per mapped scenario: one history run appended (outcome, change,
health unknown, source), a junit evidence entry (sha256) added, and the triage
replay applied when it is terminal (references/execution-lanes.md).

Usage:
  junit_to_ledger.py --ledger RUN_DIR/qa-ledger.json --junit results/<name>.xml
                     [--change S-<n>=<none|env_reset|reseed|spec_fix>]... [--dry-run]

Exit codes (same contract as qa_gate.py; 1 never returned by design):
  0  merged (at least one scenario got a run); ledger written unless --dry-run.
     "stall": true = a closed fail/flaky/blocked scenario passed in this report
     ("ignored_terminal" entry with "contradicts": true): stop and ask the human
  2  rejected: unsafe path, DOCTYPE/ENTITY, malformed or non-JUnit XML, no test case
     maps to a runner scenario, report already merged, triage protocol break,
     ledger schema invalid; nothing written
  3  invalid input: unreadable file, invalid JSON, bad usage
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "junit_to_ledger", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_common import ID_DIGITS, JUNIT_KIND, InvalidInput, Rejected, id_key, write_text_atomic  # noqa: E402
from qa_junit_rules import JunitCase, map_cases, parse_junit, read_safe_xml, resolve_junit  # noqa: E402
from qa_junit_rules import scenario_outcome  # noqa: E402
from qa_ledger_rules import load_valid_ledger  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402
from qa_triage_rules import RUN_CHANGES, TriageError, replay  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_CHANGE_ARG = re.compile(rf"S-{ID_DIGITS}")
_REASON_KEYS = {"not_run": "not_run_reason", "blocked": "blocked_reason"}


@dataclass
class _MergeReport:
    junit_path: str
    junit_sha256: str
    testcases: int = 0
    scenarios: list[dict] = field(default_factory=list)
    unmapped: list[dict] = field(default_factory=list)
    skipped: list[dict] = field(default_factory=list)
    ignored_terminal: list[dict] = field(default_factory=list)

    def as_dict(self, written: bool) -> dict:
        return {
            "ok": True,
            "errors": [],
            "junit": {"path": self.junit_path, "sha256": self.junit_sha256, "testcases": self.testcases},
            "scenarios": self.scenarios,
            "unmapped": self.unmapped,
            "skipped": self.skipped,
            "ignored_terminal": self.ignored_terminal,
            "stall": any(entry["contradicts"] for entry in self.ignored_terminal),
            "written": written,
        }


def _parse_changes(values: list[str]) -> dict[str, str]:
    changes: dict[str, str] = {}
    for value in values:
        scenario_id, _, change = value.partition("=")
        if not _CHANGE_ARG.fullmatch(scenario_id) or change not in RUN_CHANGES:
            raise InvalidInput(f"--change {value!r} must be S-<n>=<{'|'.join(RUN_CHANGES)}>")
        if scenario_id in changes:
            raise InvalidInput(f"--change {scenario_id} given twice")
        changes[scenario_id] = change
    return changes


def _set_status(scenario: dict, status: str, triage: str | None, reason: str | None = None) -> None:
    scenario["status"], scenario["triage"] = status, triage
    for owner, key in _REASON_KEYS.items():
        if owner != status:
            scenario.pop(key, None)
        elif reason is not None:
            scenario[key] = reason


def _apply_run(scenario: dict, outcome: str, change: str, junit: tuple[str, str], resets: int) -> dict:
    path, digest = junit
    scenario["history"].append(
        {"outcome": outcome, "change": change, "health": "unknown", "signals": [], "suggested_class": None,
         "source": path}
    )
    scenario["attempts"] = len(scenario["history"])
    if not any(entry["kind"] == JUNIT_KIND and entry["path"] == path for entry in scenario["evidence"]):
        scenario["evidence"].append({"kind": JUNIT_KIND, "path": path, "sha256": digest})
    try:
        decision = replay(scenario["history"], resets)
    except TriageError as exc:
        raise Rejected(f"/scenarios/{scenario['id']}/history: {exc}") from exc
    if decision.terminal:
        _set_status(scenario, decision.status, decision.triage)
    else:  # in progress: never leave an earlier terminal status (e.g. pass) standing
        _set_status(scenario, "not_run", decision.triage, f"triage in progress: next action {decision.action}")
    return {"next_action": decision.action, "status": scenario["status"], "triage": scenario["triage"]}


def _closed_status(scenario: dict, resets: int) -> str | None:
    """Terminal non-pass status of the recorded history (None: open, passed, or protocol break left to _apply_run)."""
    if not scenario["history"]:
        return None
    try:
        decision = replay(scenario["history"], resets)
    except TriageError:
        return None
    return decision.status if decision.terminal and decision.status != "pass" else None


def _merge(ledger: dict, cases: list[JunitCase], changes: dict[str, str], report: _MergeReport) -> None:
    already = sorted(
        item["id"] for item in ledger["scenarios"]
        if any(attempt.get("source") == report.junit_path for attempt in item["history"])
    )
    if already:
        raise Rejected(f"{report.junit_path} already merged into {', '.join(already)}")
    per_scenario, unmapped = map_cases(cases, ledger["scenarios"])
    report.unmapped.extend(unmapped)
    unknown = sorted(set(changes) - set(per_scenario), key=id_key)
    if unknown:
        raise Rejected(f"--change {', '.join(unknown)}: scenario not mapped by this report")
    by_id = {item["id"]: item for item in ledger["scenarios"]}
    for scenario_id in sorted(per_scenario, key=id_key):
        labels = [case.label for case in per_scenario[scenario_id]]
        outcome = scenario_outcome(per_scenario[scenario_id])
        if outcome == "skipped":
            report.skipped.append({"scenario": scenario_id, "testcases": labels})
            continue
        closed = _closed_status(by_id[scenario_id], ledger["environment"]["resets"])
        if closed is not None:  # shared spec re-run: a closed fail/flaky/blocked scenario takes no more runs
            report.ignored_terminal.append({
                "scenario": scenario_id, "status": closed, "outcome": outcome, "testcases": labels,
                # a closed fail/flaky/blocked scenario passing unchanged: never ignored, stall (D49) for the human
                "contradicts": outcome == "pass",
            })
            continue
        result = _apply_run(
            by_id[scenario_id], outcome, changes.get(scenario_id, "none"),
            (report.junit_path, report.junit_sha256), ledger["environment"]["resets"],
        )
        report.scenarios.append({"id": scenario_id, "outcome": outcome, "testcases": labels, **result})
    if not report.scenarios:
        raise Rejected(f"{report.junit_path}: no test case recorded a run for a runner scenario")


def _run(args: argparse.Namespace) -> dict:
    ledger_path = Path(args.ledger)
    changes = _parse_changes(args.change)
    ledger = load_valid_ledger(ledger_path, load_schema(TEMPLATES / "qa-ledger.schema.json"))
    junit = resolve_junit(ledger_path.resolve().parent, args.junit)
    raw = read_safe_xml(junit, args.junit)
    cases = parse_junit(raw, args.junit)
    report = _MergeReport(junit_path=args.junit, junit_sha256=hashlib.sha256(raw).hexdigest(), testcases=len(cases))
    _merge(ledger, cases, changes, report)
    if not args.dry_run:
        write_text_atomic(ledger_path, json.dumps(ledger, indent=2) + "\n")
    return report.as_dict(written=not args.dry_run)


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "junit_to_ledger", **payload}, indent=2))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation: merge one JUnit report into qa-ledger.json")
    parser.add_argument("--ledger", required=True, metavar="QA_LEDGER_JSON")
    parser.add_argument("--junit", required=True, metavar="results/NAME.xml", help="relative to the ledger's run dir")
    parser.add_argument("--change", action="append", default=[], metavar="S-N=CHANGE",
                        help="what changed before this run for that scenario (default none)")
    parser.add_argument("--dry-run", action="store_true", help="print the merge; do not write the ledger")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        payload, code = _run(args), EXIT_OK
    except Rejected as exc:
        payload, code = {"ok": False, "errors": exc.errors}, EXIT_REJECTED
    except InvalidInput as exc:
        payload, code = {"ok": False, "errors": exc.errors}, EXIT_INVALID
    except SchemaLiteError as exc:
        payload, code = {"ok": False, "errors": [f"bundled schema unsupported: {exc}"]}, EXIT_INVALID
    _emit(payload)
    return code


if __name__ == "__main__":
    sys.exit(main())
