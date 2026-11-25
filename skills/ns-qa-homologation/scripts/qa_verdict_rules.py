#!/usr/bin/env python3
"""Q7 verdict rubric (references/verdict-rubric.md). Stdlib only. Pure: no I/O.

Input = a ledger that passed --check-ledger plus its blocked_reasons. Output =
one of four verdicts, confidence % and every item that keeps it below 100%.
The verdict is final (no provisional state); the ledger gate stays binary.
"""

from __future__ import annotations

from dataclasses import dataclass

from qa_common import id_key, round_half_up
from qa_ledger_rules import ledger_fingerprint
from qa_policy import QaPolicy

VERDICTS = ("homologated", "with_reservations", "not_homologated", "blocked")
# Worst first: a criterion takes the worst status among the scenarios that cover it.
AC_STATUS_ORDER = ("fail", "blocked", "not_run", "flaky", "pass")
FLAKY_CREDIT = 0.5
DERIVED_FACTOR = 0.5
SEVERE_SEVERITIES = ("blocker", "high")
DELIVERY_DEFECT = "delivery_defect"
_UNBASED_STATUSES = ("blocked", "not_run")


@dataclass(frozen=True)
class CriterionResult:
    id: str
    criticality: str
    source: str
    status: str
    credit: float
    scenarios: tuple[str, ...]

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "criticality": self.criticality,
            "source": self.source,
            "status": self.status,
            "credit": self.credit,
            "scenarios": list(self.scenarios),
        }


def _credit(status: str, source: str) -> float:
    base = {"pass": 1.0, "flaky": FLAKY_CREDIT}.get(status, 0.0)
    return base * (DERIVED_FACTOR if source == "derived" else 1.0)


def criterion_results(ledger: dict) -> list[CriterionResult]:
    results = []
    for criterion in ledger["criteria"]:
        covering = [item for item in ledger["scenarios"] if criterion["id"] in item["covers"]]
        status = min((item["status"] for item in covering), key=AC_STATUS_ORDER.index)
        results.append(CriterionResult(
            id=criterion["id"],
            criticality=criterion["criticality"],
            source=criterion["source"],
            status=status,
            credit=_credit(status, criterion["source"]),
            scenarios=tuple(item["id"] for item in covering),
        ))
    return results


def _confidence(results: list[CriterionResult], weights: dict) -> int:
    total = sum(weights[item.criticality] for item in results)
    earned = sum(weights[item.criticality] * item.credit for item in results)
    return int(round_half_up(100 * earned / total, 0))


def _scenario_reason(scenario: dict) -> str:
    detail = scenario.get("blocked_reason") or scenario.get("not_run_reason")
    triage = f" (triage {scenario['triage']})" if scenario["triage"] else ""
    return f"{scenario['status']}{triage}" + (f": {detail}" if detail else "")


def _missing_items(ledger: dict, results: list[CriterionResult], blocked_reasons: list[str]) -> list[dict]:
    """Everything that keeps confidence below 100%, from the ledger only."""
    scenarios = {item["id"]: item for item in ledger["scenarios"]}
    items = [{"ac": None, "scenario": None, "reason": reason} for reason in blocked_reasons]
    for result in results:
        if result.source == "derived" and result.credit > 0:
            items.append({"ac": result.id, "scenario": None, "reason": "derived criterion (assumption)"})
        items.extend(
            {"ac": result.id, "scenario": key, "reason": _scenario_reason(scenarios[key])}
            for key in result.scenarios
            if scenarios[key]["status"] != "pass"
        )
    items.extend(
        {
            "ac": None,
            "scenario": finding["scenario"],
            "reason": f"finding {finding['id']} {finding['severity']} {finding['class']}",
        }
        for finding in ledger["findings"]
    )
    return items


def _mocked(ledger: dict) -> list[dict]:
    """D25: mocked data never caps the verdict; listed apart for the reader."""
    mocked = []
    for scenario in ledger["scenarios"]:
        if scenario["data_source"] == "real":
            continue
        item = {"scenario": scenario["id"], "covers": scenario["covers"], "data_source": scenario["data_source"]}
        if "mock_reason" in scenario:
            item["mock_reason"] = scenario["mock_reason"]
        mocked.append(item)
    return mocked


class _Rubric:
    def __init__(self, ledger: dict, results: list[CriterionResult], blocked_reasons: list[str], policy: QaPolicy):
        self._ledger = ledger
        self._results = results
        self._blocked_reasons = blocked_reasons
        self._policy = policy

    def _critical(self, *statuses: str) -> list[CriterionResult]:
        return [item for item in self._results if item.criticality == "critical" and item.status in statuses]

    def blocked_ratio(self) -> float:
        scenarios = self._ledger["scenarios"]
        return sum(1 for item in scenarios if item["status"] == "blocked") / len(scenarios)

    def _not_homologated(self) -> list[str]:
        reasons = [f"critical {item.id} fail" for item in self._critical("fail")]
        reasons.extend(
            f"finding {finding['id']} {finding['severity']} {DELIVERY_DEFECT}"
            for finding in self._ledger["findings"]
            if finding["severity"] in SEVERE_SEVERITIES and finding["class"] == DELIVERY_DEFECT
        )
        return reasons

    def _unbased(self) -> list[str]:
        reasons = [f"critical {item.id} {item.status}: no basis to judge" for item in self._critical(*_UNBASED_STATUSES)]
        ratio = self.blocked_ratio()
        if ratio > self._policy.blocked_scenario_ratio:
            reasons.append(f"blocked scenarios {ratio:.0%} > verdict.blocked_scenario_ratio "
                           f"{self._policy.blocked_scenario_ratio:.0%}")
        return reasons

    def caps(self) -> list[str]:
        caps = [f"critical {item.id} flaky: verdict.flaky_on_critical_cap" for item in self._critical("flaky")]
        caps.extend(
            f"critical {item.id} derived (assumption): verdict.derived_critical_cap"
            for item in self._results
            if item.criticality == "critical" and item.source == "derived"
        )
        if self._policy.runner_none and any(item.criticality == "critical" for item in self._results):
            caps.append("execution.runner none with critical criteria: policy.runner_none_critical_cap")
        return caps

    def _reservations(self) -> list[str]:
        reasons = [
            f"{item.criticality} {item.id} {item.status}"
            for item in self._results
            if item.criticality != "critical" and item.status != "pass"
        ]
        reasons.extend(
            f"finding {finding['id']} {finding['severity']} {finding['class']}"
            for finding in self._ledger["findings"]
            if not (finding["severity"] in SEVERE_SEVERITIES and finding["class"] == DELIVERY_DEFECT)
        )
        return reasons + self.caps()

    def decide(self) -> tuple[str, list[str]]:
        """First matching row of the rubric table wins (verdict-rubric.md)."""
        if self._blocked_reasons:
            return "blocked", list(self._blocked_reasons)
        for verdict, reasons in (("not_homologated", self._not_homologated()), ("blocked", self._unbased()),
                                 ("with_reservations", self._reservations())):
            if reasons:
                return verdict, reasons
        return "homologated", ["every criterion pass with machine evidence; no finding; no cap"]


def evaluate(ledger: dict, blocked_reasons: list[str], policy: QaPolicy) -> dict:
    """verdict.json content (templates/qa-verdict.schema.json)."""
    results = criterion_results(ledger)
    rubric = _Rubric(ledger, results, blocked_reasons, policy)
    verdict, reasons = rubric.decide()
    return {
        "verdict_version": 1,
        "run_id": ledger["run_id"],
        "verdict": verdict,
        "label_key": f"verdict_{verdict}",
        "confidence": _confidence(results, policy.criticality_weights),
        "reasons": reasons,
        "caps": rubric.caps(),
        "blocked_scenario_ratio": round_half_up(rubric.blocked_ratio(), 4),
        "criteria": [item.as_dict() for item in sorted(results, key=lambda item: id_key(item.id))],
        "missing_for_100": _missing_items(ledger, results, blocked_reasons),
        "mocked": _mocked(ledger),
        "weights": dict(policy.criticality_weights),
        "ledger_fingerprint": ledger_fingerprint(ledger),
    }
