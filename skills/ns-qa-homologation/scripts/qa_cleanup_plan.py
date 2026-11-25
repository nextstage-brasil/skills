#!/usr/bin/env python3
"""Q10 cleanup planner for ns-qa-homologation. Stdlib only. Executes nothing.

Prints the ordered plan (what to delete, what to keep, why) for one run from its
run.json + the run outcome; the agent executes the plan step by step and stops
on the first failure (references/cleanup.md).

Usage:
  qa_cleanup_plan.py --run RUN_JSON --outcome OUTCOME [--profile PROFILE_MD]
  (--profile required for --outcome success: Q7b is recomputed from the run's ledger + plan.yml)

Exit codes (same contract as qa_gate.py; 1 never returned by design):
  0  plan printed (may be "run_q10": false or keep-only)
  2  rejected: run.json fails --check-run rules or contradicts the outcome
     (open pause vs outcome; "success" without every gate of the effective level passed,
     or with a partial evidence upload)
  3  invalid input: unreadable/unparseable file, invalid profile, bad usage

Each delete step carries "argv" (exec without a shell) and "command" (shlex-quoted).
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from dataclasses import dataclass, field
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "cleanup_plan", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_artifacts import (  # noqa: E402
    JUDGMENT_FILE,
    LEDGER_FILE,
    PLAN_FILE,
    checked_ledger,
    read_json,
    require_profile_pin,
)
from qa_common import InvalidInput, Rejected, load_json  # noqa: E402
from qa_judge_rules import LOOP_ENDED, LOOP_PASSED, AdherenceMissing, judge  # noqa: E402
from qa_policy import load_policy  # noqa: E402
from qa_profile_rules import load_valid_profile  # noqa: E402
from qa_run_rules import check_run  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

KIND_ORDER = ("container", "volume", "database", "image", "worktree", "evidence_dir")
_CATEGORY = {
    "container": "containers",
    "volume": "volumes",
    "database": "volumes",
    "image": "images",
    "worktree": "worktrees",
    "evidence_dir": "evidence",
}
_ALL_CATEGORIES = ("containers", "volumes", "images", "worktrees", "evidence")
L1_KEPT_FILES = ("report.md", "qa-ledger.json")
DEFAULT_LOG = "docs/qa/cleanup.log"
DEFAULT_SCRIPT = "<environment.script>"
WORKTREE_PRECONDITIONS = ("no pending changes (never --force)", "branch pushed when it carries commits")

# Full success = every phase gate of the effective level passed (any verdict); L2+ also every capture uploaded.
_BASE_PHASES = ("Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q7b")
_REQUIRED_PASSED = {
    "L1": _BASE_PHASES,
    "L2": (*_BASE_PHASES, "Q9"),
    "L3": (*_BASE_PHASES, "Q8", "Q9"),
}
_UPLOADED = ("complete", "not_needed")
_OPEN_STATES = ("failed", "running")
_ENDING_ANSWERS = ("stop", "do_not_publish")

_KEEP_ALL_REASONS = {
    "upload_partial": "captures not uploaded: human attaches them from the evidence dir",
    "blocked": "verdict Blocked: kept for diagnosis",
    "gate_failure": "gate rejected / script error / MCP unavailable: kept for diagnosis",
    "incomplete": "run ended without full success (stop at a pause or 'do not publish'): kept until a human decides",
}
OUTCOMES = ("success", "paused", "leftover", *_KEEP_ALL_REASONS)
_PAUSED_REASON = "run paused: nothing is deleted while waiting"
_NO_REPO_ROOT_REASON = "agent worktree without repo_root: git -C target unknown; human removes (never --force)"


def _is_agent_worktree(resource: dict) -> bool:
    return resource["kind"] == "worktree" and resource["via"] == "agent"
_L0_REASON = "effective L0: Q10 never runs (run dir = plan + local report)"


@dataclass(frozen=True)
class CleanupPolicy:
    """Profile `cleanup` + `environment.script` values the plan depends on (profile already validated)."""

    on_full_success: tuple[str, ...] = _ALL_CATEGORIES
    keep_local_report_at_l1: bool = True
    log: str = DEFAULT_LOG
    env_script: str = DEFAULT_SCRIPT

    @classmethod
    def from_profile(cls, data: dict) -> "CleanupPolicy":
        cleanup = data["cleanup"]
        return cls(
            on_full_success=tuple(cleanup.get("on_full_success", _ALL_CATEGORIES)),
            keep_local_report_at_l1=cleanup.get("keep_local_report_at_L1", True),
            log=cleanup["log"],
            env_script=data["environment"].get("script", DEFAULT_SCRIPT),
        )


@dataclass
class CleanupPlan:
    run_id: str
    outcome: str
    level: str
    run_q10: bool
    steps: list[dict] = field(default_factory=list)
    keep: list[dict] = field(default_factory=list)
    log_path: str | None = None
    log_line: str | None = None

    def as_dict(self) -> dict:
        return {
            "ok": True,
            "errors": [],
            "run_id": self.run_id,
            "outcome": self.outcome,
            "level": self.level,
            "run_q10": self.run_q10,
            "steps": self.steps,
            "keep": self.keep,
            "log_path": self.log_path,
            "log_line": self.log_line,
        }


def _ordered(resources: list[dict]) -> list[dict]:
    return sorted(resources, key=lambda item: KIND_ORDER.index(item["kind"]))


def _keep(resource: dict, reason: str) -> dict:
    return {"kind": resource["kind"], "id": resource["id"], "via": resource["via"], "reason": reason}


class _StepFactory:
    """Turns one registered resource into a step. Commands are argv lists; `command` is the shell-quoted form."""

    def __init__(self, run_path: str, run_id: str, policy: CleanupPolicy):
        self._run_path = run_path
        self._run_id = run_id
        self._policy = policy

    def delete(self, resource: dict, keep_files: tuple[str, ...] = ()) -> dict:
        argv = self._argv(resource)
        step = {
            "kind": resource["kind"],
            "id": resource["id"],
            "via": resource["via"],
            "action": "delete_except" if keep_files else "delete",
            "argv": argv,
            "command": shlex.join(argv) if argv else None,
        }
        if keep_files:
            step["keep_files"] = list(keep_files)
        if resource["kind"] == "worktree":
            step["preconditions"] = list(WORKTREE_PRECONDITIONS)
        return step

    def _argv(self, resource: dict) -> list[str] | None:
        """None = agent file operation on the evidence dir (no command)."""
        if resource["via"] == "qa-env":
            return [
                self._policy.env_script, "down", "--run", self._run_id, "--manifest", self._run_path,
                "--resource", f"{resource['kind']}:{resource['id']}",
            ]
        if resource["kind"] == "worktree":
            return ["git", "-C", resource["repo_root"], "worktree", "remove", resource["id"]]
        return None


def _success_decision(resource: dict, level: str, policy: CleanupPolicy, factory: _StepFactory):
    """Return (step, None) to delete or (None, keep entry) to keep, for a fully successful run."""
    category = _CATEGORY[resource["kind"]]
    if category not in policy.on_full_success:
        return None, _keep(resource, f"cleanup.on_full_success excludes {category}")
    if resource["kind"] == "evidence_dir" and level == "L1" and policy.keep_local_report_at_l1:
        return factory.delete(resource, L1_KEPT_FILES), None
    if _is_agent_worktree(resource) and "repo_root" not in resource:
        return None, _keep(resource, _NO_REPO_ROOT_REASON)
    return factory.delete(resource), None


def _leftover_decision(resource: dict, _level: str, _policy: CleanupPolicy, factory: _StepFactory):
    if resource["via"] == "qa-env":
        return factory.delete(resource), None
    return None, _keep(resource, "agent-owned: human reviews, then removes (worktree without --force)")


def _keep_all_decision(reason: str):
    return lambda resource, *_: (None, _keep(resource, reason))


def _decision_for(outcome: str):
    if outcome == "success":
        return _success_decision
    if outcome == "leftover":
        return _leftover_decision
    return _keep_all_decision(_KEEP_ALL_REASONS[outcome])


def _check_outcome_matches_run(outcome: str, paused: bool) -> None:
    if paused and outcome != "paused":
        raise Rejected(f"run.json has an open pause: outcome must be paused, got {outcome}")
    if outcome == "paused" and not paused:
        raise Rejected("outcome paused but run.json has no open pause")


def _recomputed_judgment(run_dir: Path, profile: Path) -> tuple[dict | None, list[str]]:
    """qa_judge rules on the run's own ledger + plan.yml + pinned profile (same as qa_publish_plan)."""
    checked = checked_ledger(run_dir / LEDGER_FILE, run_dir)
    if checked.report.errors:
        return None, [f"/{LEDGER_FILE} rejected: {error}" for error in checked.report.errors]
    if checked.plan is None:
        return None, [f"/{PLAN_FILE}: required to recompute the judgment"]
    try:
        policy = load_policy(profile, Path.cwd())
        return judge(checked.ledger, checked.plan, checked.report.blocked_reasons, policy), []
    except AdherenceMissing as exc:
        return None, [f"/{LEDGER_FILE}: adherence decision missing for {pair}" for pair in exc.pairs]


def _judge_errors(run: dict, run_path: str, profile: Path) -> list[str]:
    """Q7b proven only by qa-judgment.json of this run, equal to its recomputation, in state passed, or
    ended below min_score with the human answer publish_anyway (D50; L1 has no such answer: keep all)."""
    run_dir = Path(run_path).parent
    path = run_dir / JUDGMENT_FILE
    if not path.is_file():
        return [f"/{JUDGMENT_FILE}: missing beside run.json: Q7b not proven"]
    judgment = read_json(path, JUDGMENT_FILE)
    errors = load_schema(TEMPLATES / "qa-judgment.schema.json").validate(judgment)
    if errors:
        return [f"/{JUDGMENT_FILE}{error}" for error in errors]
    if judgment["run_id"] != run["run_id"]:
        return [f"/{JUDGMENT_FILE}: belongs to run {judgment['run_id']}, not {run['run_id']}"]
    require_profile_pin(run, profile)
    expected, errors = _recomputed_judgment(run_dir, profile)
    if errors:
        return errors
    if expected != judgment:
        return [f"/{JUDGMENT_FILE}: stale or edited (differs from recomputation): re-run qa_judge.py"]
    state = judgment["loop"]["state"]
    answers = [pause["answer"] for pause in run["pauses"] if pause["reason"] == "below_min_score"]
    if state == LOOP_PASSED or (state == LOOP_ENDED and answers and answers[-1] == "publish_anyway"):
        return []
    return [f"/{JUDGMENT_FILE}: loop {state} without the human answer publish_anyway: Q7b not passed"]


def _completion_errors(run: dict, level: str, run_path: str, profile: Path) -> list[str]:
    """Reasons `success` is not proven by run.json (empty = every gate of the level passed)."""
    states = {item["phase"]: item["state"] for item in run["phases"]}
    errors = [
        f"/phases: {item['phase']} is {item['state']}: run not complete"
        for item in run["phases"]
        if item["state"] in _OPEN_STATES
    ]
    required = _REQUIRED_PASSED[level]
    errors.extend(
        f"/phases: {phase} not passed (required for success at {level})"
        for phase in required
        if states.get(phase) != "passed"
    )
    errors.extend(
        f"/pauses/{index}: answered {pause['answer']}: run ended incomplete"
        for index, pause in enumerate(run["pauses"])
        if pause["answer"] in _ENDING_ANSWERS
    )
    final = required[-1]
    if run["phase"] != final:
        errors.append(f"/phase: {run['phase']} is not the final gate {final} for {level}")
    errors.extend(_judge_errors(run, run_path, profile))
    outcome = (run.get("publication") or {}).get("outcome")
    if outcome is not None and outcome["evidence_upload"] not in _UPLOADED:
        errors.append(f"/publication/outcome: evidence_upload {outcome['evidence_upload']}: "
                      "captures not uploaded (outcome upload_partial)")
    return errors


def _keep_everything(plan: CleanupPlan, resources: list[dict], reason: str) -> CleanupPlan:
    plan.run_q10 = False
    plan.keep = [_keep(item, reason) for item in _ordered(resources)]
    return plan


def build_plan(run: dict, outcome: str, policy: CleanupPolicy, run_path: str, profile: Path | None) -> CleanupPlan:
    """profile = QA profile path (required for outcome success: Q7b recomputation + pin)."""
    report = check_run(run, load_schema(TEMPLATES / "qa-run.schema.json"))
    if report.errors:
        raise Rejected(*(f"run.json {error}" for error in report.errors))
    _check_outcome_matches_run(outcome, report.open_pause is not None)
    level = run["level"]["effective"]
    plan = CleanupPlan(run_id=run["run_id"], outcome=outcome, level=level, run_q10=True)
    if outcome == "paused":
        return _keep_everything(plan, run["created_resources"], _PAUSED_REASON)
    if level == "L0":
        return _keep_everything(plan, run["created_resources"], _L0_REASON)
    if outcome == "success":
        if profile is None:
            raise InvalidInput("usage: --outcome success needs --profile <qa-profile.md> (Q7b is recomputed)")
        errors = _completion_errors(run, level, run_path, profile)
        if errors:
            raise Rejected(*(f"outcome success not proven by run.json {error}" for error in errors))
    decide = _decision_for(outcome)
    factory = _StepFactory(run_path, run["run_id"], policy)
    for resource in _ordered(run["created_resources"]):
        step, kept = decide(resource, level, policy, factory)
        if step:
            plan.steps.append({"order": len(plan.steps) + 1, **step})
        else:
            plan.keep.append(kept)
    plan.log_path = policy.log
    plan.log_line = (
        f"{{utc_timestamp}} run={run['run_id']} outcome={outcome} level={level} "
        f"planned={len(plan.steps)} kept={len(plan.keep)} result={{result}}"
    )
    return plan


def _load_policy(profile: str | None) -> CleanupPolicy:
    """Profile is validated with the Q0 gate rules; any error is invalid input (exit 3)."""
    if profile is None:
        return CleanupPolicy()
    data = load_valid_profile(Path(profile), Path.cwd(), load_schema(TEMPLATES / "qa-profile.schema.json"))
    return CleanupPolicy.from_profile(data)


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "cleanup_plan", **payload}, indent=2))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation Q10 cleanup plan (prints only; executes nothing)")
    parser.add_argument("--run", required=True, metavar="RUN_JSON")
    parser.add_argument("--outcome", required=True, choices=OUTCOMES)
    parser.add_argument("--profile", metavar="PROFILE_MD", help="QA profile for cleanup.* and environment.script")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        try:
            run = load_json(Path(args.run))
        except ValueError as exc:
            raise InvalidInput(f"run: {exc}") from exc
        profile = Path(args.profile) if args.profile else None
        plan = build_plan(run, args.outcome, _load_policy(args.profile), args.run, profile)
    except InvalidInput as exc:
        _emit({"ok": False, "errors": exc.errors})
        return EXIT_INVALID
    except SchemaLiteError as exc:
        _emit({"ok": False, "errors": [f"bundled schema unsupported: {exc}"]})
        return EXIT_INVALID
    except Rejected as exc:
        _emit({"ok": False, "errors": exc.errors})
        return EXIT_REJECTED
    _emit(plan.as_dict())
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
