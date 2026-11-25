#!/usr/bin/env python3
"""run.json manifest checks: schema + run-owned resource rules. Stdlib only.

Q10 and 'qa-env down' delete only what run.json lists, so a manifest that could
name a resource the run did not create is rejected before any cleanup.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from qa_common import embeds_run_id, find_duplicates
from qa_schema_lite import SchemaLite

_LEVELS = ("L0", "L1", "L2", "L3")
_ANSWERS_BY_REASON = {
    "checkpoint": frozenset({"continue", "stop"}),
    "stall": frozenset({"continue", "stop"}),
    "below_min_score": frozenset({"continue", "stop"}),
    "preview_approval": frozenset({"approve", "adjust", "do_not_publish"}),
}
_KINDS_BY_VIA = {
    "agent": frozenset({"worktree", "evidence_dir"}),
    "qa-env": frozenset({"container", "volume", "database", "image", "worktree"}),
}


@dataclass
class RunReport:
    errors: list[str] = field(default_factory=list)
    open_pause: dict | None = None

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "paused": self.open_pause is not None,
            "open_pause": self.open_pause,
        }


_Check = Callable[[dict], list[str]]


def _resource_label(item: dict) -> str:
    return f"/created_resources/{item['kind']}:{item['id']}"


def _unique_resources(run: dict) -> list[str]:
    pairs = [f"{item['kind']}:{item['id']}" for item in run["created_resources"]]
    return [f"/created_resources: duplicate resource {pair}" for pair in find_duplicates(pairs)]


def _run_owned_ids(run: dict) -> list[str]:
    return [
        f"{_resource_label(item)}: id does not embed run_id {run['run_id']} (not run-owned)"
        for item in run["created_resources"]
        if not embeds_run_id(item["id"], run["run_id"])
    ]


def _via_matches_kind(run: dict) -> list[str]:
    errors = []
    for item in run["created_resources"]:
        if item["kind"] not in _KINDS_BY_VIA[item["via"]]:
            errors.append(f"{_resource_label(item)}: kind {item['kind']} cannot be created via {item['via']}")
        if item["via"] == "qa-env" and run["environment"]["provider"] != "script":
            errors.append(
                f"{_resource_label(item)}: provider {run['environment']['provider']} has no qa-env script; "
                "external environments are never run-owned"
            )
    return errors


def _level_order(run: dict) -> list[str]:
    level = run["level"]
    if _LEVELS.index(level["effective"]) > _LEVELS.index(level["declared"]):
        return [f"/level: effective {level['effective']} above declared {level['declared']}"]
    return []


def _phase_consistency(run: dict) -> list[str]:
    phases = run["phases"]
    errors = [f"/phases: duplicate phase {dup}" for dup in find_duplicates([item["phase"] for item in phases])]
    states = {item["phase"]: item["state"] for item in phases}
    if run["phase"] is not None and states.get(run["phase"]) != "passed":
        errors.append(f"/phase: {run['phase']} must have state passed in /phases")
    return errors


def _pause_consistency(run: dict) -> list[str]:
    errors = []
    for index, pause in enumerate(run["pauses"]):
        if (pause["resolved_at"] is None) != (pause["answer"] is None):
            errors.append(f"/pauses/{index}: resolved_at and answer must be set together")
        if pause["answer"] is not None and pause["answer"] not in _ANSWERS_BY_REASON[pause["reason"]]:
            errors.append(f"/pauses/{index}: answer {pause['answer']} not valid for reason {pause['reason']}")
    open_count = sum(1 for pause in run["pauses"] if pause["resolved_at"] is None)
    if open_count > 1:
        errors.append(f"/pauses: {open_count} open pauses; at most one wait at a time")
    return errors


def _checkpoint_sequence(run: dict) -> list[str]:
    checkpoints = run["checkpoints"]
    errors = [
        f"/checkpoints/{index}: window must be {index + 1}"
        for index, item in enumerate(checkpoints)
        if item["window"] != index + 1
    ]
    errors.extend(
        f"/checkpoints/{index}: only the last checkpoint may be pending"
        for index, item in enumerate(checkpoints[:-1])
        if item["decision"] == "pending"
    )
    return errors


def _checkpoint_pauses(run: dict) -> list[str]:
    """Checkpoint k is answered by the k-th checkpoint pause: pending = open, decision = answer."""
    pauses = [pause for pause in run["pauses"] if pause["reason"] == "checkpoint"]
    checkpoints = run["checkpoints"]
    if len(pauses) != len(checkpoints):
        return [f"/checkpoints: {len(checkpoints)} checkpoint(s) but {len(pauses)} checkpoint pause(s)"]
    errors = []
    for index, (checkpoint, pause) in enumerate(zip(checkpoints, pauses)):
        expected = "pending" if pause["answer"] is None else pause["answer"]
        if checkpoint["decision"] != expected:
            errors.append(f"/checkpoints/{index}: decision {checkpoint['decision']} but its pause answer is {expected}")
    return errors


_CHECKS: tuple[_Check, ...] = (
    _unique_resources,
    _run_owned_ids,
    _via_matches_kind,
    _level_order,
    _phase_consistency,
    _pause_consistency,
    _checkpoint_sequence,
    _checkpoint_pauses,
)


def check_run(run: object, schema: SchemaLite) -> RunReport:
    report = RunReport(errors=schema.validate(run))
    if report.errors:
        return report
    for check in _CHECKS:
        report.errors.extend(check(run))
    report.open_pause = next((pause for pause in run["pauses"] if pause["resolved_at"] is None), None)
    return report
