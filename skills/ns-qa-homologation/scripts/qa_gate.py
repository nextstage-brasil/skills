#!/usr/bin/env python3
"""Deterministic gate for ns-qa-homologation. Stdlib only.

Modes (exactly one):
  --check-profile PATH   QA profile Markdown (one fenced yaml block)
  --check-plan RUN_DIR   L0 artifacts RUN_DIR/acceptance.yml + RUN_DIR/plan.yml
  --check-ledger PATH    qa-ledger.json (evidence paths relative to --evidence-dir)
  --check-run PATH       run.json manifest (schema + run-owned resource rules)
  --check-env PATH       stdout JSON of one qa-env subcommand (optional --run-id)

Exit codes:
  0  consistent (ledger may report blocked=true; run may report paused=true)
  2  rejected: plan, ledger, run manifest or qa-env output inconsistent; reasons in JSON "errors"
  3  invalid input: invalid profile, unreadable/unparseable file, bad usage
Exit 1 is never returned by design (unlike ns-judge, where 1 = skip scripts);
a Python traceback (exit 1) means a script bug.
Verdict (--verdict) and homologation score (qa_judge.py) arrive in Phase 4.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": None, "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_common import load_json  # noqa: E402
from qa_env_rules import check_env_output  # noqa: E402
from qa_ledger_rules import check_ledger  # noqa: E402
from qa_plan_rules import check_plan  # noqa: E402
from qa_profile_rules import check_profile  # noqa: E402
from qa_run_rules import check_run  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402
from qa_yaml_lite import YamlLiteError, parse  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
ACCEPTANCE_FILE = "acceptance.yml"
PLAN_FILE = "plan.yml"


class _InvalidInput(Exception):
    """Input cannot be evaluated (exit 3)."""


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"mode": None, "ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps(payload, indent=2))


def _read_yaml(path: Path) -> object:
    try:
        return parse(path.read_text(encoding="utf-8")).data
    except OSError as exc:
        raise _InvalidInput(f"{path.name}: {exc.strerror or exc}") from exc
    except (YamlLiteError, UnicodeDecodeError) as exc:
        raise _InvalidInput(f"{path.name}: {exc}") from exc


def _run_profile(args: argparse.Namespace) -> tuple[int, dict]:
    try:
        report = check_profile(
            Path(args.check_profile), Path(args.repo).resolve(), load_schema(TEMPLATES / "qa-profile.schema.json")
        )
    except OSError as exc:
        raise _InvalidInput(f"profile: {exc.strerror or exc}") from exc
    except (YamlLiteError, UnicodeDecodeError) as exc:
        raise _InvalidInput(f"profile: {exc}") from exc
    return (EXIT_OK if not report.errors else EXIT_INVALID), report.as_dict()


def _run_plan(args: argparse.Namespace) -> tuple[int, dict]:
    run_dir = Path(args.check_plan)
    report = check_plan(
        _read_yaml(run_dir / ACCEPTANCE_FILE),
        _read_yaml(run_dir / PLAN_FILE),
        load_schema(TEMPLATES / "qa-acceptance.schema.json"),
        load_schema(TEMPLATES / "qa-plan.schema.json"),
    )
    return (EXIT_OK if not report.errors else EXIT_REJECTED), report.as_dict()


def _read_json(path: Path, label: str) -> object:
    try:
        return load_json(path)
    except ValueError as exc:
        raise _InvalidInput(f"{label}: {exc}") from exc


def _run_ledger(args: argparse.Namespace) -> tuple[int, dict]:
    path = Path(args.check_ledger)
    ledger = _read_json(path, "ledger")
    evidence_root = Path(args.evidence_dir) if args.evidence_dir else path.resolve().parent
    report = check_ledger(ledger, evidence_root, load_schema(TEMPLATES / "qa-ledger.schema.json"))
    return (EXIT_OK if not report.errors else EXIT_REJECTED), report.as_dict()


def _run_manifest(args: argparse.Namespace) -> tuple[int, dict]:
    report = check_run(_read_json(Path(args.check_run), "run"), load_schema(TEMPLATES / "qa-run.schema.json"))
    return (EXIT_OK if not report.errors else EXIT_REJECTED), report.as_dict()


def _run_env(args: argparse.Namespace) -> tuple[int, dict]:
    report = check_env_output(
        _read_json(Path(args.check_env), "qa-env output"),
        load_schema(TEMPLATES / "qa-env-output.schema.json"),
        args.run_id,
    )
    return (EXIT_OK if not report.errors else EXIT_REJECTED), report.as_dict()


_MODES = {
    "check_profile": ("profile", _run_profile),
    "check_plan": ("plan", _run_plan),
    "check_ledger": ("ledger", _run_ledger),
    "check_run": ("run", _run_manifest),
    "check_env": ("env", _run_env),
}


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation deterministic gate")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check-profile", metavar="PROFILE_MD")
    group.add_argument("--check-plan", metavar="RUN_DIR")
    group.add_argument("--check-ledger", metavar="LEDGER_JSON")
    group.add_argument("--check-run", metavar="RUN_JSON")
    group.add_argument("--check-env", metavar="QA_ENV_OUTPUT_JSON")
    parser.add_argument("--repo", default=".", help="repo root for profile tracker.status_source")
    parser.add_argument("--evidence-dir", help="evidence root for ledger paths (default: ledger dir)")
    parser.add_argument("--run-id", help="--check-env: expected run_id")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    attribute = next(name for name in _MODES if getattr(args, name) is not None)
    mode, runner = _MODES[attribute]
    try:
        code, payload = runner(args)
    except _InvalidInput as exc:
        code, payload = EXIT_INVALID, {"ok": False, "errors": [str(exc)]}
    except SchemaLiteError as exc:
        code, payload = EXIT_INVALID, {"ok": False, "errors": [f"bundled schema unsupported: {exc}"]}
    _emit({"mode": mode, **payload})
    return code


if __name__ == "__main__":
    sys.exit(main())
