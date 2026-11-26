#!/usr/bin/env python3
"""qa-ledger.json consistency: schema + cross-checks without execution. Stdlib only.

The ledger is rejected (errors) when it is internally inconsistent. Conditions
that force verdict Blocked but are legal ledger states (no MR, commit mismatch,
unhealthy environment) are reported as ``blocked_reasons``, not errors.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Callable

from qa_common import (
    EXECUTED_STATUSES,
    JUNIT_KIND,
    InvalidInput,
    Rejected,
    canonical_sha256,
    evidence_file_problem,
    evidence_path_problem,
    find_duplicates,
    load_json,
)
from qa_junit_rules import load_junit, map_cases, scenario_outcome
from qa_schema_lite import SchemaLite
from qa_triage_rules import PRODUCT_MIN_REPRODUCTIONS, STOP_RUN, Decision, TriageError, replay

_FAILURE_STATUSES = {"fail", "blocked", "flaky"}
_BROWSER_REQUIRED = ("navigate", "screenshot")
_BROWSER_FORBIDDEN_KINDS = {JUNIT_KIND, "runner_video"}
_CAPABILITY_KINDS = {"screenshot", "console", "network"}  # evidence kinds a browser capability produces
_NO_TOOL = "none"
_NEEDS_RUNS = {"FLAKY", "PRODUCT"}  # classes only a replayed history can assign
_PLAN_FIELDS = ("lane", "type", "covers")  # scenario fields the ledger must keep from plan.yml
_JUDGE_KEYS = ("judge_rounds", "adherence")  # Q7b records; never part of what the verdict judged


def ledger_fingerprint(ledger: dict) -> str:
    """Hash of the execution facts (everything except the Q7b judge records)."""
    return canonical_sha256({key: value for key, value in ledger.items() if key not in _JUDGE_KEYS})


@dataclass
class LedgerReport:
    errors: list[str] = field(default_factory=list)
    blocked_reasons: list[str] = field(default_factory=list)
    plan_checked: bool = False

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "blocked": bool(self.blocked_reasons),
            "blocked_reasons": self.blocked_reasons,
            "plan_checked": self.plan_checked,
        }


@dataclass(frozen=True)
class _LedgerContext:
    ledger: dict
    run_dir: Path
    plan: dict | None

    @property
    def criteria_ids(self) -> list[str]:
        return [item["id"] for item in self.ledger["criteria"]]

    @property
    def scenarios(self) -> list[dict]:
        return self.ledger["scenarios"]

    @cached_property
    def replays(self) -> dict[str, Decision | TriageError | None]:
        """Triage replay per scenario id: Decision, protocol error, or None (no run recorded)."""
        results: dict[str, Decision | TriageError | None] = {}
        for scenario in self.scenarios:
            if not scenario["history"]:
                results[scenario["id"]] = None
                continue
            try:
                results[scenario["id"]] = replay(scenario["history"], self.ledger["environment"]["resets"])
            except TriageError as exc:
                results[scenario["id"]] = exc
        return results

    @cached_property
    def junit_outcomes(self) -> dict[str, dict[str, str] | str]:
        """Per cited JUnit source: {scenario id: outcome in that file}, or why it cannot be read."""
        sources = {
            attempt["source"] for scenario in self.scenarios for attempt in scenario["history"] if "source" in attempt
        }
        results: dict[str, dict[str, str] | str] = {}
        for source in sorted(sources):
            try:
                per_scenario, _unmapped = map_cases(load_junit(self.run_dir, source), self.scenarios)
            except (Rejected, InvalidInput) as exc:
                results[source] = "; ".join(exc.errors)
                continue
            results[source] = {key: scenario_outcome(cases) for key, cases in per_scenario.items()}
        return results


_Check = Callable[[_LedgerContext], list[str]]


def _unique_ids(ctx: _LedgerContext) -> list[str]:
    groups = {
        "criteria": ctx.criteria_ids,
        "scenarios": [item["id"] for item in ctx.scenarios],
        "findings": [item["id"] for item in ctx.ledger["findings"]],
    }
    return [f"/{name}: duplicate id {dup}" for name, ids in groups.items() for dup in find_duplicates(ids)]


def _known_covers(ctx: _LedgerContext) -> list[str]:
    known = set(ctx.criteria_ids)
    return [
        f"/scenarios/{scenario['id']}: covers unknown {ac}"
        for scenario in ctx.scenarios
        for ac in scenario["covers"]
        if ac not in known
    ]


def _every_criterion_covered(ctx: _LedgerContext) -> list[str]:
    covered = {ac for scenario in ctx.scenarios for ac in scenario["covers"]}
    return [f"/criteria/{ac}: not covered by any scenario" for ac in ctx.criteria_ids if ac not in covered]


def _evidence_layout(ctx: _LedgerContext) -> list[str]:
    return [
        f"/scenarios/{scenario['id']}/evidence: {problem}"
        for scenario in ctx.scenarios
        for entry in scenario["evidence"]
        for problem in [evidence_path_problem(entry["kind"], entry["path"], scenario["id"])]
        if problem
    ]


def _runner_lane_problems(scenario: dict, kinds: set[str]) -> list[str]:
    problems = []
    if "tool" in scenario:
        problems.append("lane runner records no browser tool")
    if scenario["status"] in EXECUTED_STATUSES and JUNIT_KIND not in kinds:
        problems.append(f"lane runner status {scenario['status']} needs junit evidence")
    return problems


def _browser_lane_problems(scenario: dict, kinds: set[str]) -> list[str]:
    tool = scenario["tool"]
    missing = set(tool["missing"])
    problems = [f"lane browser cannot cite {kind} evidence" for kind in sorted(kinds & _BROWSER_FORBIDDEN_KINDS)]
    problems.extend(
        f"{kind} evidence but tool {tool['name']} lacks {kind}" for kind in sorted(kinds & _CAPABILITY_KINDS & missing)
    )
    if scenario["status"] not in EXECUTED_STATUSES:
        return problems
    if tool["name"] == _NO_TOOL:
        problems.append(f"status {scenario['status']} without a browser tool (tool none: blocked or not_run only)")
    lacking = [capability for capability in _BROWSER_REQUIRED if capability in missing]
    if lacking:
        problems.append(f"tool {tool['name']} lacks required {', '.join(lacking)}: browser lane cannot run")
    if "screenshot" not in kinds:
        problems.append(f"lane browser status {scenario['status']} needs screenshot evidence")
    return problems


def _lane_evidence(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        kinds = {entry["kind"] for entry in scenario["evidence"]}
        check = _runner_lane_problems if scenario["lane"] == "runner" else _browser_lane_problems
        errors.extend(f"/scenarios/{scenario['id']}: {problem}" for problem in check(scenario, kinds))
    return errors


def _replay_problems(scenario: dict, decision: Decision | TriageError | None) -> list[str]:
    status, triage = scenario["status"], scenario["triage"]
    if isinstance(decision, TriageError):
        return [f"history: {decision}"]
    if decision is None:
        if status not in ("not_run", "blocked"):
            return [f"status {status} without any run in history"]
        return [f"triage {triage} needs runs in history"] if triage in _NEEDS_RUNS else []
    if status == "not_run":
        return [f"status not_run but history has {len(scenario['history'])} run(s)"]
    if decision.terminal:
        if (status, triage) != (decision.status, decision.triage):
            replayed = f"{decision.status}/{decision.triage} ({decision.reason})"
            return [f"status/triage {status}/{triage} but triage replay gives {replayed}"]
        return []
    if status != "blocked":
        return [
            f"triage replay not terminal (next action {decision.action}): "
            f"only blocked (interrupted) allowed, got {status}"
        ]
    if triage != decision.triage:
        return [f"triage {triage} but triage replay gives {decision.triage}"]
    return []


def _source_problem(ctx: _LedgerContext, scenario: dict, attempt: dict, cited: set[str]) -> str | None:
    source = attempt.get("source")
    if source is None:
        return None
    if scenario["lane"] != "runner":
        return f"source {source}: browser lane runs cite no junit"
    if source not in cited:
        return f"source {source} is not a junit evidence of this scenario"
    outcomes = ctx.junit_outcomes[source]
    if isinstance(outcomes, str):
        return f"source {source} unreadable: {outcomes}"
    observed = outcomes.get(scenario["id"])
    if observed is None:
        return f"{source} has no testcase for {scenario['id']}"
    if observed != attempt["outcome"]:
        return f"outcome {attempt['outcome']} but {source} gives {observed} for {scenario['id']}"
    return None


def _junit_sources(ctx: _LedgerContext, scenario: dict) -> list[str]:
    """Every runner run is backed by its own JUnit file (one run per file), same outcome for this scenario."""
    cited = {entry["path"] for entry in scenario["evidence"] if entry["kind"] == JUNIT_KIND}
    sources = [attempt["source"] for attempt in scenario["history"] if "source" in attempt]
    problems = [f"history: source {source} backs more than one run (one run per JUnit file)"
                for source in find_duplicates(sources)]
    problems.extend(
        f"history run {index + 1}: {problem}"
        for index, attempt in enumerate(scenario["history"])
        for problem in [_source_problem(ctx, scenario, attempt, cited)]
        if problem
    )
    return problems


def _triage_replay(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        where = f"/scenarios/{scenario['id']}"
        if scenario["attempts"] != len(scenario["history"]):
            errors.append(f"{where}: attempts {scenario['attempts']} != history length {len(scenario['history'])}")
        problems = _replay_problems(scenario, ctx.replays[scenario["id"]]) + _junit_sources(ctx, scenario)
        errors.extend(f"{where}: {problem}" for problem in problems)
    return errors


def _evidence_files(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        for entry in scenario["evidence"]:
            problem = evidence_file_problem(ctx.run_dir, entry["path"], entry["sha256"])
            if problem:
                errors.append(f"/scenarios/{scenario['id']}/evidence: {problem}")
    return errors


def _triage_consistency(ctx: _LedgerContext) -> list[str]:
    errors = []
    for scenario in ctx.scenarios:
        where = f"/scenarios/{scenario['id']}"
        if scenario["status"] in _FAILURE_STATUSES and scenario["triage"] is None:
            errors.append(f"{where}: status {scenario['status']} requires a triage class")
        if (scenario["status"] == "flaky") != (scenario["triage"] == "FLAKY"):
            errors.append(f"{where}: status flaky and triage FLAKY must go together")
    return errors


def _replayed_reproductions(ctx: _LedgerContext, scenario_id: str) -> int | None:
    decision = ctx.replays[scenario_id]
    return decision.counters["reproductions"] if isinstance(decision, Decision) else None


def _findings_consistency(ctx: _LedgerContext) -> list[str]:
    scenario_ids = {item["id"] for item in ctx.scenarios}
    findings = ctx.ledger["findings"]
    errors = [
        f"/findings/{finding['id']}: references unknown scenario {finding['scenario']}"
        for finding in findings
        if finding["scenario"] not in scenario_ids
    ]
    for scenario in ctx.scenarios:
        if (scenario["status"], scenario["triage"]) != ("fail", "PRODUCT"):
            continue  # an interrupted PRODUCT suspicion (blocked) is not a confirmed defect
        linked = [finding for finding in findings if finding["scenario"] == scenario["id"]]
        if not linked:
            errors.append(f"/scenarios/{scenario['id']}: triage PRODUCT without a finding")
        errors.extend(
            f"/findings/{finding['id']}: PRODUCT finding reproduced {finding['reproduced']} "
            f"< {PRODUCT_MIN_REPRODUCTIONS}"
            for finding in linked
            if finding["reproduced"] < PRODUCT_MIN_REPRODUCTIONS
        )
        replayed = _replayed_reproductions(ctx, scenario["id"])
        errors.extend(
            f"/findings/{finding['id']}: reproduced {finding['reproduced']} > {replayed} "
            "healthy reproduction(s) in history"
            for finding in linked
            if replayed is not None and finding["reproduced"] > replayed
        )
    return errors


def _judge_rounds_sequence(ctx: _LedgerContext) -> list[str]:
    """Rounds numbered 1..n, chained scores; after a round without gain only a human-resumed round may follow."""
    rounds = ctx.ledger["judge_rounds"]
    errors = []
    for index, item in enumerate(rounds):
        where = f"/judge_rounds/{index}"
        if item["round"] != index + 1:
            errors.append(f"{where}: round must be {index + 1}")
        if index and item["score_before"] != rounds[index - 1]["score_after"]:
            errors.append(f"{where}: score_before must equal previous score_after")
        resumed = index + 1 < len(rounds) and rounds[index + 1].get("resume") is True
        if item["score_after"] <= item["score_before"] and index != len(rounds) - 1 and not resumed:
            errors.append(f"{where}: a round without score gain must end the cycle (next round needs resume: true)")
    return errors


def _adherence_consistency(ctx: _LedgerContext) -> list[str]:
    """One decision per (executed scenario, covered AC); the judge consumes them (homologation-judge.md)."""
    scenarios = {item["id"]: item for item in ctx.scenarios}
    decisions = ctx.ledger.get("adherence", [])
    pairs = [f"{item['scenario']}/{item['ac']}" for item in decisions]
    errors = [f"/adherence: duplicate decision {pair}" for pair in find_duplicates(pairs)]
    for index, item in enumerate(decisions):
        where = f"/adherence/{index}"
        scenario = scenarios.get(item["scenario"])
        if scenario is None:
            errors.append(f"{where}: unknown scenario {item['scenario']}")
            continue
        if item["ac"] not in scenario["covers"]:
            errors.append(f"{where}: {item['scenario']} does not cover {item['ac']}")
        if scenario["status"] not in EXECUTED_STATUSES:
            errors.append(f"{where}: {item['scenario']} is {scenario['status']}; only executed scenarios are judged")
    return errors


def _mock_reason_consistency(ctx: _LedgerContext) -> list[str]:
    return [
        f"/scenarios/{scenario['id']}: mock_reason only with data_source other than real"
        for scenario in ctx.scenarios
        if "mock_reason" in scenario and scenario["data_source"] == "real"
    ]


def _plan_match(ctx: _LedgerContext) -> list[str]:
    """Ledger scenarios = plan.yml scenarios (ids, lane, type, covers): no relabel to dodge a lane rule."""
    if ctx.plan is None:
        return []
    planned = {item["id"]: item for item in ctx.plan["scenarios"]}
    recorded = {item["id"]: item for item in ctx.scenarios}
    errors = [f"/scenarios: {key} in plan.yml but not in ledger" for key in planned if key not in recorded]
    errors.extend(f"/scenarios/{key}: not in plan.yml" for key in recorded if key not in planned)
    for key in planned.keys() & recorded.keys():
        errors.extend(
            f"/scenarios/{key}: {name} {recorded[key][name]} but plan.yml says {planned[key][name]}"
            for name in _PLAN_FIELDS
            if recorded[key][name] != planned[key][name]
        )
    return errors


_CROSS_CHECKS: tuple[_Check, ...] = (
    _unique_ids,
    _plan_match,
    _known_covers,
    _every_criterion_covered,
    _evidence_layout,
    _evidence_files,
    _lane_evidence,
    _triage_replay,
    _triage_consistency,
    _findings_consistency,
    _judge_rounds_sequence,
    _adherence_consistency,
    _mock_reason_consistency,
)


def _commits_match(left: str, right: str) -> bool:
    """Short and full SHAs match when one is a prefix of the other (schema enforces lowercase hex)."""
    return left.startswith(right) or right.startswith(left)


def _ancestry_proves(run_dir: Path, env_commit: str, mr_commit: str) -> bool:
    """RUN_DIR/commit-ancestry.json (qa_commit_ancestry.py) names exactly these two commits and says mr is an ancestor."""
    try:
        proof = json.loads((run_dir / "commit-ancestry.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    return (isinstance(proof, dict) and proof.get("is_ancestor") is True
            and proof.get("verified_with") == "git merge-base --is-ancestor"
            and isinstance(proof.get("mr_commit"), str) and isinstance(proof.get("env_commit"), str)
            and _commits_match(proof["mr_commit"], mr_commit) and _commits_match(proof["env_commit"], env_commit))


def _blocked_reasons(ctx: _LedgerContext) -> list[str]:
    ledger = ctx.ledger
    reasons = [
        f"{scenario_id}: ENV retries exhausted; run stopped"
        for scenario_id, decision in ctx.replays.items()
        if isinstance(decision, Decision) and decision.action == STOP_RUN
    ]
    environment = ledger["environment"]
    merge_request = ledger["mr"]
    if merge_request is None:
        reasons.append("mr is null: deployed commit cannot be verified")
    elif not _commits_match(environment["commit"], merge_request["commit"]) and not _ancestry_proves(
        ctx.run_dir, environment["commit"], merge_request["commit"]
    ):
        reasons.append(
            f"environment.commit {environment['commit']} != mr.commit {merge_request['commit']}"
        )
    if environment["health"] != "ok":
        reasons.append(f"environment.health is {environment['health']}")
    return reasons


def load_valid_ledger(path: Path, schema: SchemaLite) -> dict:
    """Schema-valid ledger for the scripts that update it mid-run (cross-checks are the Q6 gate's job)."""
    try:
        ledger = load_json(path)
    except ValueError as exc:
        raise InvalidInput(f"ledger: {exc}") from exc
    errors = schema.validate(ledger)
    if errors:
        raise Rejected(*(f"ledger {error}" for error in errors))
    return ledger


def check_ledger(ledger: object, run_dir: Path, schema: SchemaLite, plan: dict | None = None) -> LedgerReport:
    """Evidence/JUnit paths are relative to run_dir. plan = schema-valid plan.yml of the run, when present."""
    report = LedgerReport(errors=schema.validate(ledger))
    if report.errors:
        return report
    ctx = _LedgerContext(ledger=ledger, run_dir=run_dir, plan=plan)
    report.plan_checked = plan is not None
    for check in _CROSS_CHECKS:
        report.errors.extend(check(ctx))
    report.blocked_reasons = _blocked_reasons(ctx)
    return report
