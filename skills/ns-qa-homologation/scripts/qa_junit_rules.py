#!/usr/bin/env python3
"""JUnit reading + test case to scenario mapping for ns-qa-homologation. Stdlib only.

Single source for junit_to_ledger.py (merge) and qa_ledger_rules.py (--check-ledger
re-reads every cited report: a recorded runner outcome must match the file).

Safety: UTF-8 only, no NUL, no DOCTYPE/ENTITY declaration (blocks XXE and entity
expansion), size cap, suite nesting cap, file confined to RUN_DIR/results/ without
symlinks.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass
from pathlib import Path

from qa_common import ID_DIGITS, JUNIT_PATH, InvalidInput, Rejected, id_key

MAX_JUNIT_BYTES = 32 * 1024 * 1024
MAX_SUITE_DEPTH = 256
RESULTS_DIR = "results"
_TAG = re.compile(rf"(?<![A-Za-z0-9_@-])@(AC|S)-({ID_DIGITS})(?![A-Za-z0-9_-])")
_FORBIDDEN_DECLARATIONS = ("<!doctype", "<!entity")
_SUITE_TAGS = ("testsuites", "testsuite")
_FAILURE_TAGS = ("failure", "error")


@dataclass(frozen=True)
class JunitCase:
    label: str
    outcome: str  # pass | fail | skipped
    scenarios: tuple[str, ...]
    criteria: tuple[str, ...]


def resolve_junit(run_dir: Path, relative: str) -> Path:
    """Confine the report to RUN_DIR/results/ (no symlink anywhere on the way)."""
    if not JUNIT_PATH.match(relative):
        raise Rejected(f"{relative!r} must be results/<name>.xml relative to the run dir")
    results = run_dir / RESULTS_DIR
    target = results / relative.split("/", 1)[1]
    if results.is_symlink() or target.is_symlink():
        raise Rejected(f"{relative}: symlinks are refused")
    if not target.is_file():
        raise InvalidInput(f"{relative}: file not found")
    if not target.resolve().is_relative_to(run_dir.resolve()):
        raise Rejected(f"{relative}: resolves outside the run dir")
    return target


def read_safe_xml(path: Path, label: str) -> bytes:
    try:
        if path.stat().st_size > MAX_JUNIT_BYTES:
            raise Rejected(f"{label}: larger than {MAX_JUNIT_BYTES} bytes")
        raw = path.read_bytes()
    except OSError as exc:
        raise InvalidInput(f"{label}: {exc.strerror or exc}") from exc
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise Rejected(f"{label}: not UTF-8 ({exc.reason})") from exc
    if "\x00" in text:
        raise Rejected(f"{label}: NUL byte (UTF-16/32 or binary input refused)")
    lowered = text.lower()
    for declaration in _FORBIDDEN_DECLARATIONS:
        if declaration in lowered:
            raise Rejected(f"{label}: {declaration.upper()} declaration refused")
    return raw


def _parse_root(raw: bytes, label: str) -> ElementTree.Element:
    parser = ElementTree.XMLParser(encoding="utf-8")
    try:
        parser.feed(raw)
        root = parser.close()
    except ElementTree.ParseError as exc:
        raise Rejected(f"{label}: not well-formed XML ({exc})") from exc
    if root.tag not in _SUITE_TAGS:
        raise Rejected(f"{label}: root <{root.tag}> is not <testsuites>/<testsuite>")
    return root


def _outcome(case: ElementTree.Element) -> str:
    if any(case.find(tag) is not None for tag in _FAILURE_TAGS):
        return "fail"
    return "skipped" if case.find("skipped") is not None else "pass"


def _tags(text: str) -> frozenset[tuple[str, str]]:
    return frozenset(_TAG.findall(text))


def _case(element: ElementTree.Element, suite_tags: frozenset[tuple[str, str]]) -> JunitCase:
    name, classname = element.get("name", ""), element.get("classname", "")
    tags = suite_tags | _tags(f"{classname} {name}")
    return JunitCase(
        label=f"{classname} :: {name}" if classname else name,
        outcome=_outcome(element),
        scenarios=tuple(sorted((f"S-{n}" for kind, n in tags if kind == "S"), key=id_key)),
        criteria=tuple(sorted((f"AC-{n}" for kind, n in tags if kind == "AC"), key=id_key)),
    )


def _collect(root: ElementTree.Element, label: str) -> list[JunitCase]:
    """Document-order walk without recursion; one merged tag set per suite level; depth capped."""
    found: list[JunitCase] = []
    is_suite = root.tag == "testsuite"
    stack = [(iter(root), _tags(root.get("name", "")) if is_suite else frozenset(), int(is_suite))]
    while stack:
        children, tags, depth = stack[-1]
        child = next(children, None)
        if child is None:
            stack.pop()
        elif child.tag == "testsuite":
            if depth + 1 > MAX_SUITE_DEPTH:  # depth = <testsuite> elements on the path (<testsuites> not counted)
                raise Rejected(f"{label}: testsuite nesting deeper than {MAX_SUITE_DEPTH}")
            stack.append((iter(child), tags | _tags(child.get("name", "")), depth + 1))
        elif child.tag == "testcase":
            found.append(_case(child, tags))
    return found


def parse_junit(raw: bytes, label: str) -> list[JunitCase]:
    return _collect(_parse_root(raw, label), label)


def load_junit(run_dir: Path, relative: str) -> list[JunitCase]:
    """Confine, read safely and parse one report (raises Rejected / InvalidInput)."""
    return parse_junit(read_safe_xml(resolve_junit(run_dir, relative), relative), relative)


class ScenarioMapper:
    """Maps one test case to runner-lane scenario ids, or explains why it cannot."""

    def __init__(self, scenarios: list[dict]):
        self._by_id = {item["id"]: item for item in scenarios}
        self._runner = [item for item in scenarios if item["lane"] == "runner"]

    def map(self, case: JunitCase) -> tuple[list[str], list[str]]:
        if case.scenarios:
            return self._by_scenario_tags(case)
        if case.criteria:
            return self._by_criteria_tags(case)
        return [], ["no @S-n or @AC-n tag"]

    def _by_scenario_tags(self, case: JunitCase) -> tuple[list[str], list[str]]:
        mapped, reasons = [], []
        for scenario_id in case.scenarios:
            scenario = self._by_id.get(scenario_id)
            if scenario is None:
                reasons.append(f"@{scenario_id} not in ledger")
            elif scenario["lane"] != "runner":
                reasons.append(f"{scenario_id} is lane {scenario['lane']}")
            elif not set(case.criteria) <= set(scenario["covers"]):
                extra = sorted(set(case.criteria) - set(scenario["covers"]), key=id_key)
                reasons.append(f"{', '.join('@' + ac for ac in extra)} not covered by {scenario_id}")
            else:
                mapped.append(scenario_id)
        return mapped, reasons

    def _by_criteria_tags(self, case: JunitCase) -> tuple[list[str], list[str]]:
        wanted = set(case.criteria)
        candidates = [item["id"] for item in self._runner if wanted <= set(item["covers"])]
        tags = ", ".join("@" + ac for ac in case.criteria)
        if len(candidates) == 1:
            return candidates, []
        if not candidates:
            return [], [f"no runner scenario covers {tags}"]
        return [], [f"ambiguous: {tags} matches {', '.join(candidates)}; tag @S-n"]


def map_cases(cases: list[JunitCase], scenarios: list[dict]) -> tuple[dict[str, list[JunitCase]], list[dict]]:
    """Test cases per scenario id + one {testcase, reason} per tag that maps nowhere."""
    mapper = ScenarioMapper(scenarios)
    per_scenario: dict[str, list[JunitCase]] = {}
    unmapped: list[dict] = []
    for case in cases:
        mapped, reasons = mapper.map(case)
        unmapped.extend({"testcase": case.label, "reason": reason} for reason in reasons)
        for scenario_id in mapped:
            per_scenario.setdefault(scenario_id, []).append(case)
    return per_scenario, unmapped


def scenario_outcome(cases: list[JunitCase]) -> str:
    """fail if any case failed/errored; skipped if any skipped (no run recorded); else pass."""
    outcomes = {case.outcome for case in cases}
    if "fail" in outcomes:
        return "fail"
    return "skipped" if "skipped" in outcomes else "pass"
