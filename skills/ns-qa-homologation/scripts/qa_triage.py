#!/usr/bin/env python3
"""Failure triage decision for one scenario of ns-qa-homologation. Stdlib only. Writes nothing.

Replays the scenario's ``history`` in qa-ledger.json (run-wide ENV counter from
``environment.resets``) and prints the class, next action, cap state and, when
terminal, the ledger status to record (references/failure-triage.md).

Usage:
  qa_triage.py --ledger QA_LEDGER_JSON --scenario S-<n>

Exit codes (same contract as qa_gate.py; 1 never returned by design):
  0  decision printed (action may be "stall": stop and ask the human)
  2  rejected: ledger fails its schema or the history breaks the triage protocol
  3  invalid input: unreadable/unparseable file, unknown scenario, bad usage
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "triage", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_common import ID_DIGITS, InvalidInput, Rejected  # noqa: E402
from qa_ledger_rules import load_valid_ledger  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402
from qa_triage_rules import TriageError, replay  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_SCENARIO_ID = re.compile(rf"^S-{ID_DIGITS}$")


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "triage", **payload}, indent=2))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation failure triage (prints the decision; writes nothing)")
    parser.add_argument("--ledger", required=True, metavar="QA_LEDGER_JSON")
    parser.add_argument("--scenario", required=True, metavar="S-N")
    return parser.parse_args(argv)


def _triage(ledger_path: Path, scenario_id: str) -> dict:
    if not _SCENARIO_ID.match(scenario_id):
        raise InvalidInput(f"--scenario {scenario_id!r} is not S-<n>")
    ledger = load_valid_ledger(ledger_path, load_schema(TEMPLATES / "qa-ledger.schema.json"))
    scenario = next((item for item in ledger["scenarios"] if item["id"] == scenario_id), None)
    if scenario is None:
        raise InvalidInput(f"scenario {scenario_id} not in ledger")
    try:
        decision = replay(scenario["history"], ledger["environment"]["resets"])
    except TriageError as exc:
        raise Rejected(f"/scenarios/{scenario_id}/history: {exc}") from exc
    return {"ok": True, "errors": [], "scenario": scenario_id, **decision.as_dict()}


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        code, payload = EXIT_OK, _triage(Path(args.ledger), args.scenario)
    except Rejected as exc:
        code, payload = EXIT_REJECTED, {"ok": False, "errors": exc.errors}
    except InvalidInput as exc:
        code, payload = EXIT_INVALID, {"ok": False, "errors": exc.errors}
    except SchemaLiteError as exc:
        code, payload = EXIT_INVALID, {"ok": False, "errors": [f"bundled schema unsupported: {exc}"]}
    _emit(payload)
    return code


if __name__ == "__main__":
    sys.exit(main())
