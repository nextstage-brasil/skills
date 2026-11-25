#!/usr/bin/env python3
"""Tests for the failure triage engine (qa_triage_rules.py), its CLI (qa_triage.py)
and the ledger replay rules in qa_gate.py --check-ledger. Stdlib only.

Every rejection asserts its specific reason so an unrelated rule cannot make it pass.
"""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import SKILL, base_ledger, base_run, clone, run_attempt, run_gate, run_triage, write_ledger
from qa_profile_rules import KNOWN_BROWSER_TOOLS  # noqa: E402  (qa_fixtures puts scripts/ on sys.path)
from qa_common import CAPTURE_EXTENSIONS, JUNIT_KIND  # noqa: E402
from qa_triage_rules import (  # noqa: E402
    DATA_MAX_RESEEDS,
    DATA_SIGNALS,
    ENV_MAX_RESETS,
    ENV_SIGNALS,
    FLAKY_RUNS,
    PRODUCT_MIN_REPRODUCTIONS,
    RUN_CHANGES,
    TEST_MAX_FIXES,
    TEST_SIGNALS,
    TriageError,
    replay,
)


def _schema(name: str) -> dict:
    return json.loads((SKILL / "templates" / name).read_text(encoding="utf-8"))

def fail(**overrides) -> dict:
    return run_attempt("fail", **{"health": "ok", **overrides})


def passed(**overrides) -> dict:
    return run_attempt("pass", **overrides)


class ReasonAssertions(unittest.TestCase):
    def assertReason(self, errors: list[str], expected: str):
        self.assertTrue(any(expected in error for error in errors), f"{expected!r} not in {errors}")

    def assertDecision(self, history: list[dict], action: str, status: str | None, triage: str | None, resets: int = 0):
        decision = replay(history, resets)
        self.assertEqual((decision.action, decision.status, decision.triage), (action, status, triage), decision.reason)
        return decision


class DocCodeSyncTests(unittest.TestCase):
    """References state the same caps and tool ids the scripts enforce."""

    def test_caps_documented(self):
        doc = (SKILL / "references" / "failure-triage.md").read_text(encoding="utf-8")
        for phrase in (
            f"| {ENV_MAX_RESETS} per **run** (Q5 + Q6) |",
            f"| {DATA_MAX_RESEEDS} per scenario |",
            f"| {FLAKY_RUNS} unchanged runs |",
            f"| {TEST_MAX_FIXES} fixes per scenario |",
            f"{PRODUCT_MIN_REPRODUCTIONS} healthy reproductions",
        ):
            self.assertIn(phrase, doc)

    def test_schema_enums_match_code(self):
        defs = _schema("qa-ledger.schema.json")["$defs"]
        attempt = defs["attempt"]["properties"]
        self.assertEqual(set(attempt["signals"]["items"]["enum"]), ENV_SIGNALS | DATA_SIGNALS | TEST_SIGNALS)
        self.assertEqual(sum(map(len, (ENV_SIGNALS, DATA_SIGNALS, TEST_SIGNALS))), len(attempt["signals"]["items"]["enum"]))
        self.assertEqual(tuple(attempt["change"]["enum"]), RUN_CHANGES)
        self.assertEqual(set(defs["evidence"]["properties"]["kind"]["enum"]), {JUNIT_KIND, *CAPTURE_EXTENSIONS})
        capture = _schema("qa-profile.schema.json")["properties"]["evidence"]["properties"]["capture"]["items"]["enum"]
        self.assertEqual(set(capture), set(CAPTURE_EXTENSIONS))

    def test_capabilities_documented(self):
        doc = (SKILL / "references" / "browser-tools.md").read_text(encoding="utf-8")
        rows = re.findall(r"^\| `([a-z0-9_]+)` \| [A-Z]", doc, re.MULTILINE)
        self.assertEqual(rows, _schema("qa-ledger.schema.json")["$defs"]["capability"]["enum"])

    def test_browser_tool_ids_documented(self):
        doc = (SKILL / "references" / "browser-tools.md").read_text(encoding="utf-8")
        table = re.findall(r"^\| `([a-z0-9-]+)` \| `", doc, re.MULTILINE)
        self.assertEqual(tuple(table), KNOWN_BROWSER_TOOLS)


class TriageClassesTests(ReasonAssertions):
    def test_pass_without_failure(self):
        decision = self.assertDecision([passed()], "record", "pass", None)
        self.assertTrue(decision.terminal)

    def test_unknown_health_is_rechecked_before_any_class(self):
        for signals in ([], ["seed_failed"], ["spec_error"], ["infra_timeout"]):
            with self.subTest(signals=signals):
                self.assertDecision([fail(health="unknown", signals=signals)], "recheck_health", None, None)

    def test_env_by_health_or_signal(self):
        for attempt in (fail(health="failed"), fail(signals=["infra_timeout"]), fail(signals=["systemic_5xx"])):
            with self.subTest(attempt=attempt):
                decision = self.assertDecision([attempt], "env_reset", None, "ENV")
                self.assertEqual(decision.expected_change, "env_reset")

    def test_env_precedes_data_and_test_signals(self):
        self.assertDecision([fail(health="failed", signals=["seed_failed", "spec_error"])], "env_reset", None, "ENV")
        self.assertDecision([fail(signals=["infra_timeout", "seed_failed"])], "env_reset", None, "ENV")

    def test_data_precedes_test(self):
        self.assertDecision([fail(signals=["precondition_missing", "spec_error"])], "reseed", None, "DATA")

    def test_objective_signal_beats_agent_suggestion(self):
        decision = self.assertDecision([fail(signals=["spec_error"], suggested_class="PRODUCT")], "fix_spec", None, "TEST")
        self.assertEqual(decision.class_source, "signal")

    def test_agent_residue(self):
        decision = self.assertDecision([fail(suggested_class="TEST")], "fix_spec", None, "TEST")
        self.assertEqual(decision.class_source, "agent")
        self.assertDecision([fail(suggested_class="PRODUCT")], "reproduce", None, "PRODUCT")

    def test_unclassified_failure_stalls(self):
        decision = self.assertDecision([fail()], "stall", None, None)
        self.assertFalse(decision.terminal)
        self.assertIn("fits no triage class", decision.reason)

    def test_recovered_pass_keeps_failure_class(self):
        history = [fail(health="failed"), passed(change="env_reset")]
        self.assertDecision(history, "record", "pass", "ENV", resets=1)
        history = [fail(signals=["seed_failed"]), passed(change="reseed")]
        self.assertDecision(history, "record", "pass", "DATA")
        history = [fail(suggested_class="TEST"), passed(change="spec_fix")]
        self.assertDecision(history, "record", "pass", "TEST")


class TriageCapsTests(ReasonAssertions):
    def test_env_cap_is_run_wide(self):
        decision = self.assertDecision([fail(health="failed")], "env_reset", None, "ENV", resets=1)
        self.assertEqual(decision.cap, {"class": "ENV", "used": 1, "max": 2})
        decision = self.assertDecision([fail(health="failed")], "stop_run", "blocked", "ENV", resets=2)
        self.assertIn("ENV retries exhausted (2/2)", decision.reason)

    def test_env_cap_within_history(self):
        history = [fail(health="failed"), fail(change="env_reset", health="failed"), fail(change="env_reset", health="failed")]
        self.assertDecision(history, "stop_run", "blocked", "ENV", resets=2)

    def test_data_cap_two_reseeds(self):
        history = [fail(signals=["seed_failed"]), fail(change="reseed", signals=["seed_failed"])]
        self.assertDecision(history, "reseed", None, "DATA")
        history.append(fail(change="reseed", signals=["data_conflict"]))
        decision = self.assertDecision(history, "record", "blocked", "DATA")
        self.assertEqual(decision.cap, {"class": "DATA", "used": 2, "max": 2})

    def test_test_cap_three_fixes(self):
        history = [fail(suggested_class="TEST")] + [fail(change="spec_fix", suggested_class="TEST") for _ in range(2)]
        self.assertDecision(history, "fix_spec", None, "TEST")
        history.append(fail(change="spec_fix", signals=["spec_error"]))
        decision = self.assertDecision(history, "record", "blocked", "TEST")
        self.assertEqual(decision.cap, {"class": "TEST", "used": 3, "max": 3})

    def test_caps_are_per_class(self):
        history = [
            fail(signals=["seed_failed"]),
            fail(change="reseed", signals=["seed_failed"]),
            fail(change="reseed", suggested_class="TEST"),
        ]
        self.assertDecision(history, "fix_spec", None, "TEST")


class TriageFlakyProductTests(ReasonAssertions):
    def test_alternation_needs_three_unchanged_runs_and_never_passes(self):
        history = [fail(suggested_class="PRODUCT"), passed()]
        decision = self.assertDecision(history, "rerun_stability", None, "FLAKY")
        self.assertEqual(decision.expected_change, "none")
        history.append(passed())
        decision = self.assertDecision(history, "record", "flaky", "FLAKY")
        self.assertIn("never counts as pass", decision.reason)

    def test_unchanged_rerun_after_pass(self):
        """Re-running a shared spec file: consistent passes stay pass; a later fail is FLAKY, never pass."""
        self.assertDecision([passed(), passed()], "record", "pass", None)
        history = [passed(), fail(suggested_class="PRODUCT")]
        self.assertDecision(history, "rerun_stability", None, "FLAKY")
        history.append(passed())
        self.assertDecision(history, "record", "flaky", "FLAKY")

    def test_rerun_after_pass_keeps_caps(self):
        history = [passed(), fail(health="failed")]
        self.assertDecision(history, "stop_run", "blocked", "ENV", resets=2)
        history = [passed(), fail(signals=["seed_failed"]), fail(change="reseed", signals=["seed_failed"]),
                   fail(change="reseed", signals=["seed_failed"])]
        self.assertDecision(history, "record", "blocked", "DATA")

    def test_change_starts_a_new_window(self):
        history = [fail(suggested_class="TEST"), passed(change="spec_fix")]
        self.assertDecision(history, "record", "pass", "TEST")

    def test_product_needs_two_healthy_reproductions(self):
        decision = self.assertDecision([fail(suggested_class="PRODUCT")], "reproduce", None, "PRODUCT")
        self.assertEqual(decision.counters["reproductions"], 1)
        history = [fail(suggested_class="PRODUCT"), fail(suggested_class="PRODUCT")]
        decision = self.assertDecision(history, "record", "fail", "PRODUCT")
        self.assertEqual(decision.counters["reproductions"], 2)

    def test_product_reproductions_reset_after_change(self):
        history = [fail(suggested_class="PRODUCT"), fail(suggested_class="TEST"), fail(change="spec_fix", suggested_class="PRODUCT")]
        decision = self.assertDecision(history, "reproduce", None, "PRODUCT")
        self.assertEqual(decision.counters["reproductions"], 1)


class TriageProtocolTests(ReasonAssertions):
    def assertBroken(self, history: list[dict], expected: str, resets: int = 2):
        with self.assertRaises(TriageError) as caught:
            replay(history, resets)
        self.assertIn(expected, str(caught.exception))

    def test_protocol_breaks(self):
        cases = {
            "empty": ([], "history is empty"),
            "first run changed": ([passed(change="reseed")], "run 1: change reseed before any failure"),
            "changed run after pass": ([passed(), passed(change="reseed")],
                                       "run 2: run after terminal decision record (status pass)"),
            "after terminal fail": ([fail(suggested_class="PRODUCT"), fail(suggested_class="PRODUCT"), passed()],
                                    "run 3: run after terminal decision record (status fail)"),
            "after unknown health": ([fail(health="unknown"), passed()], "run 2: previous failed run has health unknown"),
            "after stall": ([fail(), passed()], "run 2: run after stall"),
            "wrong change": ([fail(suggested_class="TEST"), passed()], "run 2: change none does not follow action fix_spec"),
            "reset not declared": ([fail(health="failed"), passed()], "run 2: change none does not follow action env_reset"),
            "retry without change": ([fail(signals=["seed_failed"]), passed()], "expected reseed"),
            "unchanged repeat after cap": (
                [fail(health="failed"), fail(change="env_reset", health="failed"), fail(change="env_reset", health="failed"),
                 passed()],
                "run 4: run after terminal decision stop_run",
            ),
            "pass with signals": ([passed(signals=["spec_error"])], "run 1: a pass carries no failure signals"),
            "pass with suggestion": ([passed(suggested_class="TEST")], "run 1: a pass carries no failure signals"),
        }
        for name, (history, reason) in cases.items():
            with self.subTest(case=name):
                self.assertBroken(history, reason)

    def test_history_resets_bounded_by_run_counter(self):
        self.assertBroken([fail(health="failed"), passed(change="env_reset")], "1 env_reset run(s) in history > environment.resets 0", 0)


def _with_scenario(ledger: dict, index: int, **fields) -> None:
    ledger["scenarios"][index].update(fields)


class TriageCliTests(ReasonAssertions):
    def _run(self, mutate=None, scenario: str = "S-2", raw: str | None = None) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = base_ledger(run_dir)
            if mutate:
                mutate(ledger)
            path = write_ledger(run_dir, ledger)
            if raw is not None:
                path.write_text(raw, encoding="utf-8")
            return run_triage(["--ledger", str(path), "--scenario", scenario])

    def test_decision_printed(self):
        code, payload = self._run()
        self.assertEqual(code, 0, payload)
        self.assertEqual((payload["action"], payload["status"], payload["triage"]), ("record", "fail", "PRODUCT"))
        self.assertTrue(payload["terminal"])

    def test_in_progress_scenario(self):
        def pending(ledger):
            _with_scenario(ledger, 1, status="not_run", not_run_reason="in progress", triage=None, attempts=1,
                           history=[fail(health="failed")])
            ledger["findings"] = []

        code, payload = self._run(pending)
        self.assertEqual(code, 0, payload)
        self.assertEqual((payload["action"], payload["expected_change"]), ("env_reset", "env_reset"))
        self.assertEqual(payload["cap"], {"class": "ENV", "used": 0, "max": 2})

    def test_rejections_exit_2(self):
        def broken_history(ledger):
            ledger["scenarios"][1]["history"].append(passed(change="reseed"))

        def schema_invalid(ledger):
            del ledger["environment"]["resets"]

        cases = {
            broken_history: "/scenarios/S-2/history: run 3: run after terminal decision record",
            schema_invalid: "ledger /environment: missing required 'resets'",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_invalid_input_exit_3(self):
        cases = {
            "unknown scenario": ({"scenario": "S-9"}, "scenario S-9 not in ledger"),
            "bad id": ({"scenario": "S-1;rm"}, "is not S-<n>"),
            "invalid json": ({"raw": "{nope"}, "invalid JSON"),
            "json too deep": ({"raw": "[" * 100000}, "invalid JSON: nesting too deep"),
        }
        for name, (kwargs, reason) in cases.items():
            with self.subTest(case=name):
                code, payload = self._run(**kwargs)
                self.assertEqual(code, 3, payload)
                self.assertReason(payload["errors"], reason)

    def test_bad_usage_exit_3(self):
        code, payload = run_triage(["--ledger", "x.json"])
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "usage:")


class LedgerReplayTests(ReasonAssertions):
    """--check-ledger: recorded status/triage must match the triage replay; lane evidence rules."""

    def _run(self, mutate) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            mutate(ledger)
            return run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])

    def test_accepted_states(self):
        def env_stop(ledger):
            ledger["environment"]["resets"] = 2
            _with_scenario(ledger, 1, status="blocked", triage="ENV", blocked_reason="ENV retries exhausted",
                           history=[fail(health="failed")], attempts=1)
            ledger["findings"] = []

        def interrupted(ledger):
            _with_scenario(ledger, 1, status="blocked", triage="PRODUCT", blocked_reason="stopped at checkpoint",
                           history=[fail(suggested_class="PRODUCT")], attempts=1)
            ledger["findings"] = []

        def blocked_before_running(ledger):
            _with_scenario(ledger, 1, status="blocked", triage="ENV", blocked_reason="no browser tool", history=[],
                           attempts=0, evidence=[], tool={"name": "none", "missing": []})
            ledger["findings"] = []

        def not_run(ledger):
            _with_scenario(ledger, 1, status="not_run", not_run_reason="human chose stop", triage=None, history=[],
                           attempts=0, evidence=[])
            ledger["findings"] = []

        for mutate, blocked in ((env_stop, True), (interrupted, False), (blocked_before_running, False), (not_run, False)):
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 0, payload)
                if blocked:
                    self.assertReason(payload["blocked_reasons"], "S-2: ENV retries exhausted; run stopped")

    def test_rejections_exit_2(self):
        def pass_claimed_on_flaky(ledger):
            ledger["scenarios"][0]["history"] = [fail(suggested_class="PRODUCT", source="results/run-1.xml"),
                                                 passed(source="results/run-1.xml"), passed(source="results/run-1.xml")]
            ledger["scenarios"][0]["attempts"] = 3

        def attempts_mismatch(ledger):
            ledger["scenarios"][0]["attempts"] = 2

        def not_run_with_history(ledger):
            _with_scenario(ledger, 0, status="not_run", not_run_reason="x", triage=None)

        def pass_without_runs(ledger):
            _with_scenario(ledger, 0, history=[], attempts=0)

        def product_single_run(ledger):
            _with_scenario(ledger, 1, history=[fail(suggested_class="PRODUCT")], attempts=1)

        def unfinished_marked_fail(ledger):
            _with_scenario(ledger, 1, history=[fail(signals=["seed_failed"])], attempts=1, triage="DATA")

        def interrupted_wrong_triage(ledger):
            _with_scenario(ledger, 1, status="blocked", triage="TEST", blocked_reason="stopped",
                           history=[fail(suggested_class="PRODUCT")], attempts=1)
            ledger["findings"] = []

        def broken_protocol(ledger):
            ledger["scenarios"][1]["history"][1]["change"] = "reseed"

        def resets_undercounted(ledger):
            _with_scenario(ledger, 0, history=[fail(health="failed", source="results/run-1.xml"),
                                               passed(change="env_reset", source="results/run-1.xml")],
                           attempts=2, triage="ENV")

        def flaky_without_runs(ledger):
            _with_scenario(ledger, 1, status="blocked", triage="FLAKY", blocked_reason="x", history=[], attempts=0,
                           evidence=[])
            ledger["findings"] = []

        def finding_overstates_reproductions(ledger):
            ledger["findings"][0]["reproduced"] = 3

        def source_not_cited(ledger):
            ledger["scenarios"][0]["history"][0]["source"] = "results/run-9.xml"

        cases = {
            pass_claimed_on_flaky: "/scenarios/S-1: status/triage pass/None but triage replay gives flaky/FLAKY",
            attempts_mismatch: "/scenarios/S-1: attempts 2 != history length 1",
            not_run_with_history: "/scenarios/S-1: status not_run but history has 1 run(s)",
            pass_without_runs: "/scenarios/S-1: status pass without any run in history",
            product_single_run: "/scenarios/S-2: triage replay not terminal (next action reproduce)",
            unfinished_marked_fail: "only blocked (interrupted) allowed, got fail",
            interrupted_wrong_triage: "/scenarios/S-2: triage TEST but triage replay gives PRODUCT",
            broken_protocol: "/scenarios/S-2: history: run 2: change reseed does not follow action reproduce",
            resets_undercounted: "/scenarios/S-1: history: 1 env_reset run(s) in history > environment.resets 0",
            flaky_without_runs: "/scenarios/S-2: triage FLAKY needs runs in history",
            finding_overstates_reproductions: "/findings/F-1: reproduced 3 > 2 healthy reproduction(s) in history",
            source_not_cited: "history run 1: source results/run-9.xml is not a junit evidence of this scenario",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)


LEDGER_PLAN = """plan_version: 1
areas: []
scenarios:
  - { id: S-1, title: "save", covers: [AC-1], areas: [], type: positive, lane: runner, data: none, existing: [], automate: true }
  - { id: S-2, title: "error", covers: [AC-2], areas: [], type: negative, lane: browser, data: none, existing: [], automate: false }
waivers: []
"""


def _rewrite_junit(run_dir: Path, ledger: dict, xml: str) -> None:
    """Replace results/run-1.xml and keep its cited sha256 consistent (only the content is under test)."""
    data = xml.encode("utf-8")
    (run_dir / "results" / "run-1.xml").write_bytes(data)
    ledger["scenarios"][0]["evidence"][0]["sha256"] = hashlib.sha256(data).hexdigest()


class LedgerJunitSourceTests(ReasonAssertions):
    """C1: every runner run is backed by its JUnit file (same outcome for the scenario)."""

    def _run(self, mutate) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            mutate(ledger, run_dir)
            return run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])

    def test_rejections_exit_2(self):
        def pass_over_failing_junit(ledger, run_dir):
            _rewrite_junit(run_dir, ledger, '<testsuite><testcase name="save @S-1"><failure>boom</failure></testcase></testsuite>')

        def junit_without_scenario(ledger, run_dir):
            _rewrite_junit(run_dir, ledger, '<testsuite><testcase name="other @S-9"/></testsuite>')

        def junit_skipped(ledger, run_dir):
            _rewrite_junit(run_dir, ledger, '<testsuite><testcase name="save @S-1"><skipped/></testcase></testsuite>')

        def junit_unsafe(ledger, run_dir):
            _rewrite_junit(run_dir, ledger, '<!DOCTYPE x><testsuite><testcase name="save @S-1"/></testsuite>')

        def same_source_twice(ledger, run_dir):
            _rewrite_junit(run_dir, ledger, '<testsuite><testcase name="save @S-1"><failure>x</failure></testcase></testsuite>')
            source = "results/run-1.xml"
            ledger["scenarios"][0].update(
                status="fail", triage="PRODUCT", attempts=2,
                history=[fail(suggested_class="PRODUCT", source=source), fail(suggested_class="PRODUCT", source=source)],
            )
            ledger["findings"].append({"id": "F-2", "scenario": "S-1", "severity": "high",
                                       "class": "delivery_defect", "reproduced": 2})

        def runner_run_without_source(ledger, _):
            del ledger["scenarios"][0]["history"][0]["source"]

        def browser_run_with_source(ledger, _):
            ledger["scenarios"][1]["history"][0]["source"] = "results/run-1.xml"

        cases = {
            pass_over_failing_junit: "/scenarios/S-1: history run 1: outcome pass but results/run-1.xml gives fail for S-1",
            junit_without_scenario: "/scenarios/S-1: history run 1: results/run-1.xml has no testcase for S-1",
            junit_skipped: "outcome pass but results/run-1.xml gives skipped for S-1",
            junit_unsafe: "history run 1: source results/run-1.xml unreadable: results/run-1.xml: <!DOCTYPE declaration refused",
            runner_run_without_source: "/scenarios/0/history/0: missing required 'source'",
            same_source_twice: "/scenarios/S-1: history: source results/run-1.xml backs more than one run (one run per JUnit file)",
            browser_run_with_source: "/scenarios/S-2: history run 1: source results/run-1.xml: browser lane runs cite no junit",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_failing_junit_backs_failing_run(self):
        def runner_product_defect(ledger, run_dir):
            failing = '<testsuite><testcase name="save @S-1"><failure>x</failure></testcase></testsuite>'
            _rewrite_junit(run_dir, ledger, failing)
            (run_dir / "results" / "run-2.xml").write_text(failing, encoding="utf-8")
            ledger["scenarios"][0]["evidence"].append(
                {"kind": "junit", "path": "results/run-2.xml", "sha256": hashlib.sha256(failing.encode()).hexdigest()}
            )
            ledger["scenarios"][0].update(
                status="fail", triage="PRODUCT", attempts=2,
                history=[fail(suggested_class="PRODUCT", source="results/run-1.xml"),
                         fail(suggested_class="PRODUCT", source="results/run-2.xml")],
            )
            ledger["findings"].append({"id": "F-2", "scenario": "S-1", "severity": "high", "class": "delivery_defect",
                                       "reproduced": 2})

        code, payload = self._run(runner_product_defect)
        self.assertEqual(code, 0, payload)


class LedgerPlanMatchTests(ReasonAssertions):
    """W8: with plan.yml in the run dir, ledger scenarios keep the planned ids, lane, type and covers."""

    def _run(self, mutate=None, plan: str = LEDGER_PLAN) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            (run_dir / "plan.yml").write_text(plan, encoding="utf-8")
            if mutate:
                mutate(ledger)
            return run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])

    def test_matching_plan(self):
        code, payload = self._run()
        self.assertEqual(code, 0, payload)

    def test_rejections_exit_2(self):
        def runner_relabelled_browser(ledger):
            ledger["scenarios"][0].update(lane="browser", tool={"name": "playwright-mcp", "missing": []})

        def type_changed(ledger):
            ledger["scenarios"][1]["type"] = "regression"

        def covers_changed(ledger):
            ledger["criteria"].append({"id": "AC-3", "text": "x", "source": "issue", "criticality": "low"})
            ledger["scenarios"][1]["covers"] = ["AC-2", "AC-3"]

        def scenario_dropped(ledger):
            ledger["scenarios"] = ledger["scenarios"][:1]
            ledger["criteria"] = ledger["criteria"][:1]
            ledger["findings"] = []

        def scenario_added(ledger):
            ledger["scenarios"].append({**clone(ledger["scenarios"][1]), "id": "S-7"})

        cases = {
            runner_relabelled_browser: "/scenarios/S-1: lane browser but plan.yml says runner",
            type_changed: "/scenarios/S-2: type regression but plan.yml says negative",
            covers_changed: "/scenarios/S-2: covers ['AC-2', 'AC-3'] but plan.yml says ['AC-2']",
            scenario_dropped: "/scenarios: S-2 in plan.yml but not in ledger",
            scenario_added: "/scenarios/S-7: not in plan.yml",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)

    def test_plan_checked_flag(self):
        code, payload = self._run()
        self.assertEqual((code, payload["plan_checked"]), (0, True))
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            code, payload = run_gate(["--check-ledger", str(write_ledger(run_dir, base_ledger(run_dir)))])
            self.assertEqual((code, payload["plan_checked"]), (0, False))

    def test_plan_required_once_q4_passed(self):
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            path = write_ledger(run_dir, base_ledger(run_dir))
            run = base_run()
            (run_dir / "run.json").write_text(json.dumps(run), encoding="utf-8")
            code, payload = run_gate(["--check-ledger", str(path)])
            self.assertEqual(code, 2, payload)
            self.assertReason(payload["errors"], "plan.yml missing but run.json shows Q4 passed")
            for state in ("running", "failed"):
                run["phases"][4]["state"] = state  # Q4 entry not passed: plan.yml not yet required
                (run_dir / "run.json").write_text(json.dumps(run), encoding="utf-8")
                code, payload = run_gate(["--check-ledger", str(path)])
                self.assertEqual((code, payload["plan_checked"]), (0, False), state)
            run["phases"] = [item for item in run["phases"] if item["phase"] != "Q4"]
            (run_dir / "run.json").write_text(json.dumps(run), encoding="utf-8")
            code, payload = run_gate(["--check-ledger", str(path)])
            self.assertEqual((code, payload["plan_checked"]), (0, False))
            (run_dir / "run.json").write_text("{nope", encoding="utf-8")
            code, payload = run_gate(["--check-ledger", str(path)])
            self.assertEqual(code, 3, payload)
            self.assertReason(payload["errors"], "run.json: invalid JSON")

    def test_invalid_plan(self):
        code, payload = self._run(plan=LEDGER_PLAN.replace("plan_version: 1", "plan_version: 2"))
        self.assertEqual(code, 2, payload)
        self.assertReason(payload["errors"], "plan.yml /plan_version: must equal 1")
        code, payload = self._run(plan="scenarios: [unclosed")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "plan.yml")


class LedgerBoundsTests(ReasonAssertions):
    def test_huge_ids_rejected_without_crash(self):
        digits = "9" * 5000
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            ledger["scenarios"][0]["id"] = f"S-{digits}"
            ledger["criteria"][0]["id"] = f"AC-{digits}"
            path = write_ledger(run_dir, ledger)
            code, payload = run_gate(["--check-ledger", str(path)])
            self.assertEqual(code, 2, payload)
            self.assertReason(payload["errors"], "/scenarios/0/id: does not match ^S-[0-9]{1,6}$")
            code, payload = run_triage(["--ledger", str(path), "--scenario", f"S-{digits}"])
            self.assertEqual(code, 3, payload)
            self.assertReason(payload["errors"], "is not S-<n>")

    def test_in_root_symlink_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            target = run_dir / "evidence" / "S-1-01-saved.png"
            copy = run_dir / "evidence" / "copy.png"
            copy.write_bytes(target.read_bytes())
            target.unlink()
            target.symlink_to(copy)
            code, payload = run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])
            self.assertEqual(code, 2, payload)
            self.assertReason(payload["errors"], "path evidence/S-1-01-saved.png goes through a symlink (refused)")


class LedgerLaneEvidenceTests(ReasonAssertions):
    def _run(self, mutate) -> tuple[int, dict]:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp)
            ledger = clone(base_ledger(run_dir))
            mutate(ledger, run_dir)
            return run_gate(["--check-ledger", str(write_ledger(run_dir, ledger))])

    def test_rejections_exit_2(self):
        def runner_without_junit(ledger, _):
            ledger["scenarios"][0]["evidence"] = ledger["scenarios"][0]["evidence"][1:]

        def runner_with_tool(ledger, _):
            ledger["scenarios"][0]["tool"] = {"name": "playwright-mcp", "missing": []}

        def browser_without_tool(ledger, _):
            del ledger["scenarios"][1]["tool"]

        def browser_tool_none_ran(ledger, _):
            ledger["scenarios"][1]["tool"] = {"name": "none", "missing": []}

        def browser_lacks_screenshot(ledger, _):
            ledger["scenarios"][1]["tool"]["missing"] = ["screenshot", "network"]

        def browser_lacks_navigate(ledger, _):
            ledger["scenarios"][1]["tool"]["missing"] = ["navigate"]

        def browser_cites_junit(ledger, _):
            ledger["scenarios"][1]["evidence"].append(dict(ledger["scenarios"][0]["evidence"][0]))

        def browser_capture_of_missing_capability(ledger, run_dir):
            (run_dir / "evidence" / "S-2-02-console.log").write_bytes(b"log")
            ledger["scenarios"][1]["tool"]["missing"] = ["console"]
            ledger["scenarios"][1]["evidence"].append(
                {"kind": "console", "path": "evidence/S-2-02-console.log",
                 "sha256": "c8cd7b9a5d3bd70d0a32c8f8d5a0b3a63a0c3f12a6af84fd33f2e1d5a7c8b9e0"}
            )

        def browser_without_screenshot(ledger, _):
            ledger["scenarios"][1]["evidence"] = []

        def capture_named_for_other_scenario(ledger, _):
            ledger["scenarios"][1]["evidence"][0]["path"] = "evidence/S-1-01-saved.png"

        def capture_unnormalized(ledger, _):
            ledger["scenarios"][0]["evidence"][1]["path"] = "shots/saved.png"

        def capture_wrong_extension(ledger, _):
            ledger["scenarios"][0]["evidence"][1]["path"] = "evidence/S-1-01-saved.har"

        def junit_outside_results(ledger, _):
            ledger["scenarios"][0]["evidence"][0]["path"] = "evidence/run-1.xml"

        cases = {
            runner_without_junit: "/scenarios/S-1: lane runner status pass needs junit evidence",
            runner_with_tool: "/scenarios/S-1: lane runner records no browser tool",
            browser_without_tool: "/scenarios/1: missing required 'tool'",
            browser_tool_none_ran: "status fail without a browser tool (tool none: blocked or not_run only)",
            browser_lacks_screenshot: "tool playwright-mcp lacks required screenshot: browser lane cannot run",
            browser_lacks_navigate: "tool playwright-mcp lacks required navigate: browser lane cannot run",
            browser_cites_junit: "/scenarios/S-2: lane browser cannot cite junit evidence",
            browser_capture_of_missing_capability: "console evidence but tool playwright-mcp lacks console",
            browser_without_screenshot: "/scenarios/S-2: lane browser status fail needs screenshot evidence",
            capture_named_for_other_scenario: "screenshot path evidence/S-1-01-saved.png names S-1, not S-2",
            capture_unnormalized: "screenshot path shots/saved.png must be evidence/S-<n>-<seq>-<slug>.<ext>",
            capture_wrong_extension: "extension .har not in png, jpg, jpeg, webp",
            junit_outside_results: "junit path evidence/run-1.xml must be results/<name>.xml",
        }
        for mutate, reason in cases.items():
            with self.subTest(case=mutate.__name__):
                code, payload = self._run(mutate)
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], reason)


if __name__ == "__main__":
    unittest.main()
