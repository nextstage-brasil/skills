#!/usr/bin/env python3
"""Q7b homologation judge (references/homologation-judge.md). Stdlib only. Pure: no I/O.

Scores the homologation itself 0-10 from ledger + plan.yml + profile weights.
The only LLM input is the recorded scenario <-> AC adherence (ledger
"adherence"); everything else is counted here. Distinct from the Q7 verdict
(product) and from ns-judge (delivery proof).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from qa_common import EXECUTED_STATUSES, canonical_sha256, id_key, round_half_up
from qa_ledger_rules import ledger_fingerprint
from qa_plan_rules import MINIMUM_TYPES
from qa_policy import QaPolicy

DIMENSIONS = ("coverage", "depth", "impact", "evidence", "data_realism", "stability")
DATA_REALISM = {"real": 1.0, "db_fixture": 0.5, "response_intercept": 0.0}
SPEC_FIX_CREDIT = 0.5
OPTIONAL_CAPTURES = ("console", "network")  # browser capabilities whose absence costs evidence quality
LOOP_PASSED = "passed"
LOOP_COMPLEMENT = "complement"
LOOP_ENDED = "ended_below_min"


class AdherenceMissing(ValueError):
    """Executed scenario / covered AC pairs without a recorded adherence decision."""

    def __init__(self, pairs: list[str]):
        super().__init__(", ".join(pairs))
        self.pairs = pairs


@dataclass(frozen=True)
class Gap:
    dimension: str
    ref: str | None
    reason: str
    actionable: bool

    def as_dict(self) -> dict:
        return {"dimension": self.dimension, "ref": self.ref, "reason": self.reason, "actionable": self.actionable}


@dataclass
class _Dimension:
    ratio: float
    gaps: list[Gap] = field(default_factory=list)


def _executed(scenario: dict) -> bool:
    return scenario["status"] in EXECUTED_STATUSES


class _Facts:
    """Ledger + plan lookups shared by the dimension scorers."""

    def __init__(self, ledger: dict, plan: dict, policy: QaPolicy):
        self.ledger = ledger
        self.plan = plan
        self.policy = policy
        self.scenarios = {item["id"]: item for item in ledger["scenarios"]}
        self.executed = [item for item in ledger["scenarios"] if _executed(item)]
        self.adherence = {(item["scenario"], item["ac"]): item for item in ledger.get("adherence", [])}

    def missing_adherence(self) -> list[str]:
        return [
            f"{scenario['id']}/{ac}"
            for scenario in self.executed
            for ac in scenario["covers"]
            if (scenario["id"], ac) not in self.adherence
        ]

    def adherent(self, scenario: dict, ac: str) -> bool:
        return _executed(scenario) and self.adherence[(scenario["id"], ac)]["adherent"]

    def covering(self, ac: str) -> list[dict]:
        return [item for item in self.ledger["scenarios"] if ac in item["covers"]]

    def weight(self, criterion: dict) -> float:
        return self.policy.criticality_weights[criterion["criticality"]]

    def weighted(self, ratios: dict[str, float]) -> float:
        criteria = self.ledger["criteria"]
        total = sum(self.weight(item) for item in criteria)
        return sum(self.weight(item) * ratios[item["id"]] for item in criteria) / total


def _blocked_text(scenario: dict) -> str:
    return f"{scenario['id']} blocked: {scenario['blocked_reason']}"


def _coverage_gap(facts: _Facts, ac: str) -> Gap:
    causes, actionable = [], False
    for scenario in facts.covering(ac):
        if scenario["status"] == "not_run":
            causes.append(f"{scenario['id']} not run")
            actionable = True
        elif scenario["status"] == "blocked":
            causes.append(_blocked_text(scenario))
        else:
            causes.append(f"{scenario['id']} not adherent: {facts.adherence[(scenario['id'], ac)]['reason']}")
            actionable = True
    return Gap("coverage", ac, "no executed adherent scenario (" + "; ".join(causes) + ")", actionable)


def _coverage(facts: _Facts) -> _Dimension:
    covered = {
        item["id"]: float(any(facts.adherent(scenario, item["id"]) for scenario in facts.covering(item["id"])))
        for item in facts.ledger["criteria"]
    }
    gaps = [_coverage_gap(facts, ac) for ac, value in covered.items() if not value]
    return _Dimension(facts.weighted(covered), gaps)


def _depth_gap(facts: _Facts, ac: str, kind: str) -> Gap:
    waiver = next((item for item in facts.plan["waivers"] if (item["ac"], item["type"]) == (ac, kind)), None)
    if waiver:
        return Gap("depth", ac, f"{kind} waived in plan.yml: {waiver['reason']}", False)
    blocked = [item for item in facts.covering(ac) if item["type"] == kind and item["status"] == "blocked"]
    if blocked:
        return Gap("depth", ac, f"no executed adherent {kind} scenario ({_blocked_text(blocked[0])})", False)
    return Gap("depth", ac, f"no executed adherent {kind} scenario", True)


def _depth(facts: _Facts) -> _Dimension:
    ratios, gaps = {}, []
    for criterion in facts.ledger["criteria"]:
        ac = criterion["id"]
        required = MINIMUM_TYPES[criterion["criticality"]]
        present = {item["type"] for item in facts.covering(ac) if facts.adherent(item, ac)}
        ratios[ac] = sum(1 for kind in required if kind in present) / len(required)
        gaps.extend(_depth_gap(facts, ac, kind) for kind in required if kind not in present)
    return _Dimension(facts.weighted(ratios), gaps)


def _impact(facts: _Facts) -> _Dimension:
    """Plan areas with >= 1 executed scenario adherent to one of its criteria; no area (no diff) = full."""
    areas = facts.plan["areas"]
    if not areas:
        return _Dimension(1.0)
    gaps = []
    for area in areas:
        linked = [facts.scenarios[item["id"]] for item in facts.plan["scenarios"] if area["id"] in item["areas"]]
        if any(facts.adherent(scenario, ac) for scenario in linked for ac in scenario["covers"]):
            continue
        all_blocked = bool(linked) and all(scenario["status"] == "blocked" for scenario in linked)
        gaps.append(Gap("impact", area["id"], f"{area['kind']} area without an executed adherent scenario",
                        not all_blocked))
    return _Dimension((len(areas) - len(gaps)) / len(areas), gaps)


def _per_scenario(facts: _Facts, dimension: str, score) -> _Dimension:
    """Mean of score(scenario) -> (value, gaps) over executed scenarios; none executed = 0."""
    if not facts.executed:
        actionable = any(item["status"] == "not_run" for item in facts.ledger["scenarios"])
        return _Dimension(0.0, [Gap(dimension, None, "no executed scenario", actionable)])
    values, gaps = [], []
    for scenario in facts.executed:
        value, found = score(facts, scenario)
        values.append(value)
        gaps.extend(found)
    return _Dimension(sum(values) / len(values), gaps)


def _evidence_score(facts: _Facts, scenario: dict) -> tuple[float, list[Gap]]:
    gaps = [
        Gap("evidence", scenario["id"], f"{entry['path']} not PII-masked: re-capture with every pii_fields selector",
            True)
        for entry in scenario["evidence"]
        if entry["kind"] == "screenshot" and entry["pii_scrubbed"] is False
    ]
    if scenario["lane"] == "browser":
        lacking = [kind for kind in OPTIONAL_CAPTURES if kind in facts.policy.capture and kind in scenario["tool"]["missing"]]
        gaps.extend(
            Gap("evidence", scenario["id"], f"browser tool {scenario['tool']['name']} lacks {kind}", False)
            for kind in lacking
        )
    return (0.0 if gaps else 1.0), gaps


def _realism_score(_facts: _Facts, scenario: dict) -> tuple[float, list[Gap]]:
    source = scenario["data_source"]
    if source == "real":
        return 1.0, []
    reason = scenario.get("mock_reason")
    detail = f"data_source {source}" + (f": {reason}" if reason else ": replace with real data")
    return DATA_REALISM[source], [Gap("data_realism", scenario["id"], detail, reason is None)]


def _stability_score(_facts: _Facts, scenario: dict) -> tuple[float, list[Gap]]:
    if scenario["status"] == "flaky":
        return 0.0, [Gap("stability", scenario["id"], "flaky", False)]
    fixes = sum(1 for run in scenario["history"] if run["change"] == "spec_fix")
    if fixes:
        return SPEC_FIX_CREDIT, [Gap("stability", scenario["id"], f"{fixes} spec fix(es) (TEST) before passing", False)]
    return 1.0, []


def _dimensions(facts: _Facts) -> dict[str, _Dimension]:
    return {
        "coverage": _coverage(facts),
        "depth": _depth(facts),
        "impact": _impact(facts),
        "evidence": _per_scenario(facts, "evidence", _evidence_score),
        "data_realism": _per_scenario(facts, "data_realism", _realism_score),
        "stability": _per_scenario(facts, "stability", _stability_score),
    }


def loop_state(score: float, min_score: float, actionable: int, rounds: list[dict]) -> dict:
    """Completion loop (D45): passed, complement (plan actionable gaps), or ended below min (D50: ask human)."""
    if score >= min_score:
        return {"state": LOOP_PASSED, "reason": f"score {score:g} >= judge.min_score {min_score:g}"}
    if not actionable:
        return {"state": LOOP_ENDED, "reason": "no actionable gap left"}
    if rounds and rounds[-1]["score_after"] <= rounds[-1]["score_before"]:
        return {"state": LOOP_ENDED, "reason": f"round {rounds[-1]['round']} raised no score"}
    return {"state": LOOP_COMPLEMENT, "reason": f"{actionable} actionable gap(s): plan only those (Q4-Q7b)"}


def adherence_sha256(ledger: dict) -> str:
    return canonical_sha256(sorted(ledger.get("adherence", []), key=lambda item: (item["scenario"], item["ac"])))


def judge(ledger: dict, plan: dict, blocked_reasons: list[str], policy: QaPolicy) -> dict:
    """qa-judgment.json content (templates/qa-judgment.schema.json). Raises AdherenceMissing."""
    facts = _Facts(ledger, plan, policy)
    missing = facts.missing_adherence()
    if missing:
        raise AdherenceMissing(missing)
    dimensions = _dimensions(facts)
    weights = policy.judge_weights
    points = {name: weights[name] * dimensions[name].ratio for name in DIMENSIONS}
    score = round_half_up(sum(points.values()), 2)
    gaps = [gap for name in DIMENSIONS for gap in dimensions[name].gaps]
    if blocked_reasons:  # verdict Blocked: no complement round can run on this environment
        gaps = [Gap(gap.dimension, gap.ref, gap.reason, False) for gap in gaps]
    actionable = sum(1 for gap in gaps if gap.actionable)
    return {
        "judgment_version": 1,
        "run_id": ledger["run_id"],
        "score": score,
        "min_score": policy.min_score,
        "dimensions": {
            name: {"weight": weights[name], "ratio": round_half_up(dimensions[name].ratio, 4),
                   "points": round_half_up(points[name], 4)}
            for name in DIMENSIONS
        },
        "missing_for_10": [gap.as_dict() for gap in gaps],
        "actionable_gaps": actionable,
        "blocked_reasons": list(blocked_reasons),
        "loop": loop_state(score, policy.min_score, actionable, ledger["judge_rounds"]),
        "rounds": len(ledger["judge_rounds"]),
        "scenario_ids": sorted((item["id"] for item in ledger["scenarios"]), key=id_key),
        "ledger_fingerprint": ledger_fingerprint(ledger),
        "adherence_sha256": adherence_sha256(ledger),
        "judge_rounds_sha256": canonical_sha256(ledger["judge_rounds"]),
        "plan_sha256": canonical_sha256(plan),
    }
