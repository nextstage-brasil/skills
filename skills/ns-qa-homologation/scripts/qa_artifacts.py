#!/usr/bin/env python3
"""Run-dir artifact readers shared by qa_gate.py, qa_judge.py and qa_publish_plan.py. Stdlib only."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import re

from qa_common import InvalidInput, Rejected, load_json, sha256_file
from qa_ledger_rules import LedgerReport, check_ledger
from qa_schema_lite import load_schema
from qa_verdict_rules import VERDICTS
from qa_yaml_lite import YamlLiteError, parse

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
REPORT_TEMPLATE = Path(__file__).resolve().parent.parent / "references" / "report.template.md"
_VERDICT_LABEL_ROW = re.compile(r"^\| `verdict_([a-z_]+)` \| ([^|]+?) \|$", re.MULTILINE)
ACCEPTANCE_FILE = "acceptance.yml"
PLAN_FILE = "plan.yml"
RUN_FILE = "run.json"
LEDGER_FILE = "qa-ledger.json"
VERDICT_FILE = "verdict.json"
JUDGMENT_FILE = "qa-judgment.json"


def read_yaml(path: Path) -> object:
    try:
        return parse(path.read_text(encoding="utf-8")).data
    except OSError as exc:
        raise InvalidInput(f"{path.name}: {exc.strerror or exc}") from exc
    except (YamlLiteError, UnicodeDecodeError) as exc:
        raise InvalidInput(f"{path.name}: {exc}") from exc


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise InvalidInput(f"{path.name}: {exc.strerror or exc}") from exc
    except UnicodeDecodeError as exc:
        raise InvalidInput(f"{path.name}: not UTF-8: {exc}") from exc


def read_json(path: Path, label: str) -> object:
    try:
        return load_json(path)
    except ValueError as exc:
        raise InvalidInput(f"{label}: {exc}") from exc


def _plan_gate_passed(run_dir: Path) -> bool:
    """run.json of the run records Q4 passed (plan.yml then must exist)."""
    path = run_dir / RUN_FILE
    if not path.exists():
        return False
    run = read_json(path, RUN_FILE)
    phases = run.get("phases") if isinstance(run, dict) else None
    return isinstance(phases, list) and any(
        isinstance(item, dict) and item.get("phase") == "Q4" and item.get("state") == "passed" for item in phases
    )


def run_plan_for_ledger(run_dir: Path) -> tuple[dict | None, list[str]]:
    """plan.yml of the run (None when absent) + its errors; required once run.json shows Q4 passed."""
    path = run_dir / PLAN_FILE
    if not path.exists():
        missing = _plan_gate_passed(run_dir)
        return None, ([f"{PLAN_FILE} missing but {RUN_FILE} shows Q4 passed"] if missing else [])
    plan = read_yaml(path)
    errors = load_schema(TEMPLATES / "qa-plan.schema.json").validate(plan)
    return (None, [f"{PLAN_FILE} {error}" for error in errors]) if errors else (plan, [])


@dataclass(frozen=True)
class CheckedLedger:
    ledger: object
    plan: dict | None
    report: LedgerReport


def checked_ledger(path: Path, run_dir: Path) -> CheckedLedger:
    """Ledger with the Q6 gate rules (--check-ledger), plan.yml included when present/required."""
    ledger = read_json(path, "ledger")
    plan, plan_errors = run_plan_for_ledger(run_dir)
    report = check_ledger(ledger, run_dir, load_schema(TEMPLATES / "qa-ledger.schema.json"), plan)
    report.errors[:0] = plan_errors
    return CheckedLedger(ledger=ledger, plan=plan, report=report)


def verdict_labels(template: str) -> dict[str, str]:
    """verdict -> `en` label from the report template i18n table (single source of the label wording)."""
    return {key: label for key, label in _VERDICT_LABEL_ROW.findall(template) if key in VERDICTS}


def require_profile_pin(run: dict, profile: Path) -> None:
    """The profile in force must be the one hashed at Q0 (run.json profile_sha256): no mid-run policy edits."""
    try:
        actual = sha256_file(profile)
    except OSError as exc:
        raise InvalidInput(f"profile: {exc.strerror or exc}") from exc
    if actual != run["profile_sha256"]:
        raise Rejected(f"profile changed since Q0: sha256 {actual} != run.json profile_sha256 {run['profile_sha256']}")
