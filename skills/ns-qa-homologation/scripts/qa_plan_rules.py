#!/usr/bin/env python3
"""L0 plan artifacts (acceptance.yml + plan.yml) coverage checks. Stdlib only."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from qa_common import find_duplicates
from qa_schema_lite import SchemaLite

_CRITICALITY_RANK = {"critical": 3, "high": 2, "medium": 1, "low": 0}
_FULL_DEPTH = ("positive", "negative", "business_rule")
_MINIMUM_TYPES = {
    "critical": _FULL_DEPTH,
    "high": _FULL_DEPTH,
    "medium": ("positive",),
    "low": ("positive",),
}


@dataclass
class PlanReport:
    errors: list[str] = field(default_factory=list)
    waivers: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "ok": not self.errors,
            "errors": self.errors,
            "waivers": self.waivers,
            "summary": self.summary,
        }


@dataclass(frozen=True)
class _PlanContext:
    criteria: list[dict]
    plan: dict

    @property
    def criteria_by_id(self) -> dict[str, dict]:
        return {item["id"]: item for item in self.criteria}

    @property
    def scenarios(self) -> list[dict]:
        return self.plan["scenarios"]


_Check = Callable[[_PlanContext], list[str]]


def _duplicate_errors(label: str, ids: list[str]) -> list[str]:
    return [f"{label}: duplicate id {item}" for item in find_duplicates(ids)]


def _unique_ids(ctx: _PlanContext) -> list[str]:
    return (
        _duplicate_errors("acceptance.criteria", [item["id"] for item in ctx.criteria])
        + _duplicate_errors("plan.scenarios", [item["id"] for item in ctx.scenarios])
        + _duplicate_errors("plan.areas", [item["id"] for item in ctx.plan["areas"]])
    )


def _assumptions_declared(ctx: _PlanContext) -> list[str]:
    return [
        f"acceptance.criteria.{item['id']}: source derived / ambiguity ambiguous requires assumption"
        for item in ctx.criteria
        if (item["source"] == "derived" or item["ambiguity"] == "ambiguous") and "assumption" not in item
    ]


def _known_references(ctx: _PlanContext) -> list[str]:
    criteria = ctx.criteria_by_id
    areas = {item["id"] for item in ctx.plan["areas"]}
    errors = []
    for scenario in ctx.scenarios:
        where = f"plan.scenarios.{scenario['id']}"
        errors.extend(f"{where}: covers unknown {ac}" for ac in scenario["covers"] if ac not in criteria)
        errors.extend(f"{where}: unknown area {area}" for area in scenario["areas"] if area not in areas)
    errors.extend(
        f"plan.waivers: unknown {waiver['ac']}" for waiver in ctx.plan["waivers"] if waiver["ac"] not in criteria
    )
    return errors


def _types_by_criterion(ctx: _PlanContext) -> dict[str, set[str]]:
    types: dict[str, set[str]] = {ac: set() for ac in ctx.criteria_by_id}
    for scenario in ctx.scenarios:
        for ac in scenario["covers"]:
            types.setdefault(ac, set()).add(scenario["type"])
    return types


def _every_criterion_covered(ctx: _PlanContext) -> list[str]:
    types = _types_by_criterion(ctx)
    return [f"acceptance.criteria.{ac}: no planned scenario" for ac in ctx.criteria_by_id if not types[ac]]


def _minimum_types(ctx: _PlanContext) -> list[str]:
    types = _types_by_criterion(ctx)
    waived = {(waiver["ac"], waiver["type"]) for waiver in ctx.plan["waivers"]}
    errors = []
    for ac, criterion in ctx.criteria_by_id.items():
        if not types[ac]:
            continue
        for required in _MINIMUM_TYPES[criterion["criticality"]]:
            if required not in types[ac] and (ac, required) not in waived:
                errors.append(
                    f"acceptance.criteria.{ac}: {criterion['criticality']} needs a {required} scenario (or a waiver)"
                )
    return errors


def _every_area_tested(ctx: _PlanContext) -> list[str]:
    linked = {area for scenario in ctx.scenarios for area in scenario["areas"]}
    return [
        f"plan.areas.{area['id']}: {area['kind']} area has no scenario"
        for area in ctx.plan["areas"]
        if area["id"] not in linked
    ]


def _scenario_rank(ctx: _PlanContext, scenario: dict) -> int:
    criteria = ctx.criteria_by_id
    ranks = [_CRITICALITY_RANK[criteria[ac]["criticality"]] for ac in scenario["covers"] if ac in criteria]
    return max(ranks, default=0)


def _risk_order(ctx: _PlanContext) -> list[str]:
    errors = []
    previous = None
    for scenario in ctx.scenarios:
        rank = _scenario_rank(ctx, scenario)
        if previous is not None and rank > previous:
            errors.append(f"plan.scenarios.{scenario['id']}: risk order broken (higher criticality after lower)")
        previous = rank
    return errors


_CROSS_CHECKS: tuple[_Check, ...] = (
    _unique_ids,
    _assumptions_declared,
    _known_references,
    _every_criterion_covered,
    _minimum_types,
    _every_area_tested,
    _risk_order,
)


def _summary(ctx: _PlanContext) -> dict:
    by_type: dict[str, int] = {}
    for scenario in ctx.scenarios:
        by_type[scenario["type"]] = by_type.get(scenario["type"], 0) + 1
    return {
        "criteria": len(ctx.criteria),
        "derived_criteria": sum(1 for item in ctx.criteria if item["source"] == "derived"),
        "scenarios": len(ctx.scenarios),
        "scenarios_by_type": by_type,
        "areas": len(ctx.plan["areas"]),
    }


def check_plan(
    acceptance: object, plan: object, acceptance_schema: SchemaLite, plan_schema: SchemaLite
) -> PlanReport:
    errors = [f"acceptance.yml {error}" for error in acceptance_schema.validate(acceptance)]
    errors += [f"plan.yml {error}" for error in plan_schema.validate(plan)]
    if errors:
        return PlanReport(errors=errors)
    ctx = _PlanContext(criteria=acceptance["criteria"], plan=plan)
    report = PlanReport(waivers=plan["waivers"], summary=_summary(ctx))
    for check in _CROSS_CHECKS:
        report.errors.extend(check(ctx))
    return report
