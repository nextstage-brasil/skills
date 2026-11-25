#!/usr/bin/env python3
"""Tests for junit_to_ledger.py: tag mapping, merge, triage hand-off, XML and path safety. Stdlib only.

Every rejection asserts its specific reason so an unrelated rule cannot make it pass.
"""

from __future__ import annotations

import hashlib
import contextlib
import io
import json
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

from qa_fixtures import JUNIT_TO_LEDGER, base_ledger, run_attempt, run_gate, run_junit_to_ledger, write_ledger
import junit_to_ledger  # noqa: E402  (qa_fixtures puts scripts/ on sys.path; in-process cases patch it)
import qa_junit_rules  # noqa: E402
from qa_common import id_key  # noqa: E402
from qa_junit_rules import MAX_SUITE_DEPTH  # noqa: E402

EARLIER = "results/run-0.xml"  # an earlier run already merged into the ledger
JUNIT = """<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Cypress run">
  <testsuite name="Records @smoke">
    <testcase name="save @S-1 stores the record" classname="records"/>
    <testcase name="@AC-2 invalid input shows an error @regression" classname="records"/>
    <testcase name="list @AC-1 shows the record" classname="records"/>
    <testcase name="untagged smoke check" classname="records"/>
  </testsuite>
  <testsuite name="Record list @S-3">
    <testcase name="shows saved records" classname="list">
      <failure message="expected 1 row">AssertionError</failure>
    </testcase>
  </testsuite>
</testsuites>
"""


def _pending(scenario_id: str, covers: list[str], lane: str = "runner") -> dict:
    scenario = {
        "id": scenario_id, "covers": covers, "type": "positive", "lane": lane, "status": "not_run",
        "not_run_reason": "pending execution", "attempts": 0, "triage": None, "data_source": "real",
        "evidence": [], "history": [],
    }
    if lane == "browser":
        scenario["tool"] = {"name": "playwright-mcp", "missing": []}
    return scenario


def skeleton_ledger(run_dir: Path) -> dict:
    """Q6-start ledger: base top-level fields + every planned scenario pending."""
    ledger = base_ledger(run_dir)
    ledger["scenarios"] = [
        _pending("S-1", ["AC-1"]),
        _pending("S-2", ["AC-2"], lane="browser"),
        _pending("S-3", ["AC-1"]),
        _pending("S-4", ["AC-2"]),
    ]
    ledger["findings"] = []
    return ledger


class _JunitCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.run_dir = Path(self._tmp.name) / "run"
        self.ledger = skeleton_ledger(self.run_dir)
        self.ledger_path = write_ledger(self.run_dir, self.ledger)

    def tearDown(self):
        self._tmp.cleanup()

    def write_junit(self, text: str | bytes, name: str = "run-1.xml") -> str:
        target = self.run_dir / "results" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8") if isinstance(text, str) else text)
        return f"results/{name}"

    def merge(self, junit: str, *extra: str) -> tuple[int, dict]:
        return run_junit_to_ledger(["--ledger", str(self.ledger_path), "--junit", junit, *extra])

    def stored(self) -> dict:
        return json.loads(self.ledger_path.read_text(encoding="utf-8"))

    def scenario(self, scenario_id: str) -> dict:
        return next(item for item in self.stored()["scenarios"] if item["id"] == scenario_id)

    def assertReason(self, errors: list, expected: str):
        texts = [item if isinstance(item, str) else json.dumps(item) for item in errors]
        self.assertTrue(any(expected in text for text in texts), f"{expected!r} not in {texts}")


class IdKeyTests(unittest.TestCase):
    def test_numeric_order(self):
        self.assertEqual(sorted(["S-10", "S-2", "AC-1"], key=id_key), ["AC-1", "S-2", "S-10"])


class MergeTests(_JunitCase):
    def test_tags_map_and_merge(self):
        junit = self.write_junit(JUNIT)
        code, payload = self.merge(junit)
        self.assertEqual(code, 0, payload)
        self.assertTrue(payload["written"])
        self.assertEqual(payload["junit"]["testcases"], 5)
        digest = hashlib.sha256(JUNIT.encode("utf-8")).hexdigest()
        self.assertEqual(payload["junit"]["sha256"], digest)
        results = {item["id"]: item for item in payload["scenarios"]}
        self.assertEqual(sorted(results), ["S-1", "S-3", "S-4"])
        self.assertEqual((results["S-1"]["outcome"], results["S-1"]["status"]), ("pass", "pass"))
        self.assertEqual((results["S-4"]["outcome"], results["S-4"]["status"]), ("pass", "pass"))
        self.assertEqual((results["S-3"]["outcome"], results["S-3"]["next_action"]), ("fail", "recheck_health"))
        self.assertReason(payload["unmapped"], "ambiguous: @AC-1 matches S-1, S-3; tag @S-n")
        self.assertReason(payload["unmapped"], "no @S-n or @AC-n tag")
        s1 = self.scenario("S-1")
        self.assertEqual(s1["evidence"], [{"kind": "junit", "path": junit, "sha256": digest}])
        self.assertEqual(s1["history"], [run_attempt("pass", source=junit)])
        self.assertNotIn("not_run_reason", s1)
        s3 = self.scenario("S-3")
        self.assertEqual((s3["status"], s3["attempts"]), ("not_run", 1))
        self.assertEqual(s3["history"][0]["health"], "unknown")

    def test_dry_run_writes_nothing(self):
        before = self.ledger_path.read_bytes()
        code, payload = self.merge(self.write_junit(JUNIT), "--dry-run")
        self.assertEqual(code, 0, payload)
        self.assertFalse(payload["written"])
        self.assertEqual(self.ledger_path.read_bytes(), before)

    def test_deterministic(self):
        junit = self.write_junit(JUNIT)
        twin_dir = Path(self._tmp.name) / "twin"
        twin_path = write_ledger(twin_dir, skeleton_ledger(twin_dir))
        (twin_dir / "results").mkdir(exist_ok=True)
        (twin_dir / junit).write_text(JUNIT, encoding="utf-8")
        first = self.merge(junit)
        second = run_junit_to_ledger(["--ledger", str(twin_path), "--junit", junit])
        self.assertEqual(first, second)
        self.assertEqual(self.ledger_path.read_bytes(), twin_path.read_bytes())

    def test_exact_tag_tokens(self):
        junit = self.write_junit(
            '<testsuite name="s"><testcase name="@AC-10 x"/><testcase name="mail@AC-2 y"/>'
            '<testcase name="@AC-2x z"/><testcase name="@S-4 ok"/></testsuite>'
        )
        code, payload = self.merge(junit)
        self.assertEqual(code, 0, payload)
        self.assertEqual([item["id"] for item in payload["scenarios"]], ["S-4"])
        self.assertReason(payload["unmapped"], "no runner scenario covers @AC-10")
        self.assertEqual(sum(1 for item in payload["unmapped"] if item["reason"] == "no @S-n or @AC-n tag"), 2)

    def test_suite_nesting_cap(self):
        """Depth = <testsuite> elements on the path (a <testsuites> root is not counted): 256 ok, 257 refused."""

        def nested(depth: int, name: str, wrapper: bool) -> str:
            suites = "".join(f'<testsuite name="s{level} @smoke">' for level in range(depth))
            body = suites + '<testcase name="@S-4 deep"/>' + "</testsuite>" * depth
            return self.write_junit(f"<testsuites>{body}</testsuites>" if wrapper else body, name)

        for wrapper in (False, True):
            with self.subTest(testsuites_root=wrapper):
                code, payload = self.merge(nested(MAX_SUITE_DEPTH, f"ok-{wrapper}.xml", wrapper), "--dry-run")
                self.assertEqual(code, 0, payload)
                self.assertEqual([item["id"] for item in payload["scenarios"]], ["S-4"])
                code, payload = self.merge(nested(MAX_SUITE_DEPTH + 1, f"deep-{wrapper}.xml", wrapper))
                self.assertEqual(code, 2, payload)
                self.assertReason(payload["errors"], f"testsuite nesting deeper than {MAX_SUITE_DEPTH}")

    def test_tags_in_classname_and_root_suite_name(self):
        junit = self.write_junit('<testsuite name="Records @S-3"><testcase name="list" classname="x"/></testsuite>'
                                 .replace('<testcase name="list" classname="x"/>',
                                          '<testcase name="list"/><testsuite name="inner">'
                                          '<testcase name="save" classname="records @S-1"/></testsuite>'))
        code, payload = self.merge(junit, "--dry-run")
        self.assertEqual(code, 0, payload)
        self.assertEqual([item["id"] for item in payload["scenarios"]], ["S-1", "S-3"])
        self.assertEqual(payload["scenarios"][0]["testcases"], ["records @S-1 :: save"])

    def test_closed_scenario_in_rerun_spec_is_ignored(self):
        """Re-running a shared spec after another scenario closed as PRODUCT fail: that scenario takes no run."""
        failing = '<testcase name="a @S-1"><failure>x</failure></testcase>'
        files = [self.write_junit(f'<testsuite name="spec">{failing}<testcase name="b @S-3">{body}</testcase></testsuite>',
                                  f"run-{n}.xml") for n, body in enumerate(("<failure>x</failure>",) * 2 + ("",))]

        def annotate(**classes: str) -> None:
            ledger = self.stored()
            for scenario in ledger["scenarios"]:
                if scenario["id"] in classes:
                    scenario["history"][-1].update(health="ok", suggested_class=classes[scenario["id"]])
            write_ledger(self.run_dir, ledger)

        self.assertEqual(self.merge(files[0])[0], 0)
        annotate(**{"S-1": "PRODUCT", "S-3": "TEST"})
        self.assertEqual(self.merge(files[1], "--change", "S-3=spec_fix")[0], 0)
        annotate(**{"S-1": "PRODUCT", "S-3": "TEST"})
        code, payload = self.merge(files[2], "--change", "S-3=spec_fix")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["ignored_terminal"], [
            {"scenario": "S-1", "status": "fail", "outcome": "fail", "testcases": ["a @S-1"], "contradicts": False}
        ])
        self.assertFalse(payload["stall"])
        self.assertEqual([(item["id"], item["status"]) for item in payload["scenarios"]], [("S-3", "pass")])
        s1 = self.scenario("S-1")
        self.assertEqual((s1["attempts"], [entry["path"] for entry in s1["evidence"]]),
                         (2, ["results/run-0.xml", "results/run-1.xml"]))
        passing = self.write_junit('<testsuite name="spec"><testcase name="a @S-1"/></testsuite>', "run-9.xml")
        code, payload = self.merge(passing, "--dry-run")
        self.assertEqual(code, 2, payload)  # nothing else in the file: no run recorded
        self.assertReason(payload["errors"], "no test case recorded a run")

    def test_closed_scenario_passing_on_rerun_is_a_stall(self):
        """A closed PRODUCT fail that passes on an unchanged re-run is never dropped silently."""
        self.ledger["scenarios"][0].update(
            status="fail", triage="PRODUCT", attempts=2,
            history=[run_attempt("fail", health="ok", suggested_class="PRODUCT", source=EARLIER),
                     run_attempt("fail", health="ok", suggested_class="PRODUCT", source="results/run-00.xml")],
        )
        self.ledger["scenarios"][0].pop("not_run_reason")
        write_ledger(self.run_dir, self.ledger)
        junit = self.write_junit('<testsuite name="spec"><testcase name="a @S-1"/><testcase name="b @S-3"/></testsuite>')
        code, payload = self.merge(junit)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["ignored_terminal"], [
            {"scenario": "S-1", "status": "fail", "outcome": "pass", "testcases": ["a @S-1"], "contradicts": True}
        ])
        self.assertTrue(payload["stall"])
        self.assertEqual((self.scenario("S-1")["status"], self.scenario("S-1")["attempts"]), ("fail", 2))

    def test_huge_nesting_refused_within_memory_bound(self):
        depth = 100_000  # ~1.9 MB file; tuple-per-level walks needed > 2 GB here
        junit = self.write_junit('<testsuite name="s @S-4">' * depth + "<testcase/>" + "</testsuite>" * depth, "huge.xml")
        command = (f"ulimit -v 1000000; exec {shlex.quote(sys.executable)} {shlex.quote(str(JUNIT_TO_LEDGER))} "
                   f"--ledger {shlex.quote(str(self.ledger_path))} --junit {junit}")
        started = time.monotonic()
        result = subprocess.run(["bash", "-c", command], capture_output=True, text=True, timeout=60, check=False)
        self.assertLess(time.monotonic() - started, 30)
        self.assertEqual(result.returncode, 2, result.stderr[-300:])
        self.assertIn("testsuite nesting deeper than", json.loads(result.stdout)["errors"][0])

    def test_huge_digit_runs_never_crash(self):
        digits = "9" * 5000
        junit = self.write_junit(f'<testsuite name="s"><testcase name="t @S-{digits}"/><testcase name="u @AC-{digits}"/>'
                                 '<testcase name="@S-4 fine"/></testsuite>')
        code, payload = self.merge(junit, "--dry-run")
        self.assertEqual(code, 0, payload)
        self.assertEqual([item["id"] for item in payload["scenarios"]], ["S-4"])
        self.assertEqual(sum(1 for item in payload["unmapped"] if item["reason"] == "no @S-n or @AC-n tag"), 2)
        code, payload = self.merge(junit, "--change", f"S-{digits}=reseed")
        self.assertEqual(code, 3, payload)
        self.assertReason(payload["errors"], "must be S-<n>=")

    def test_rerun_of_spec_with_already_passed_scenario(self):
        first = self.write_junit('<testsuite name="spec"><testcase name="a @S-1"/>'
                                 '<testcase name="b @S-3"><failure>x</failure></testcase></testsuite>')
        self.assertEqual(self.merge(first)[0], 0)
        ledger = self.stored()
        ledger["scenarios"][2]["history"][-1].update(health="ok", suggested_class="TEST")
        write_ledger(self.run_dir, ledger)
        second = self.write_junit('<testsuite name="spec"><testcase name="a @S-1"/><testcase name="b @S-3"/></testsuite>',
                                  "run-2.xml")
        code, payload = self.merge(second, "--change", "S-3=spec_fix")
        self.assertEqual(code, 0, payload)
        self.assertEqual({item["id"]: item["status"] for item in payload["scenarios"]}, {"S-1": "pass", "S-3": "pass"})
        self.assertEqual(self.scenario("S-1")["attempts"], 2)

    def test_pass_then_fail_goes_flaky_never_pass(self):
        files = [self.write_junit(f'<testsuite><testcase name="@S-1 r{n}">{body}</testcase></testsuite>', f"r{n}.xml")
                 for n, body in enumerate(("", "<failure>x</failure>", ""))]
        self.assertEqual(self.merge(files[0])[0], 0)
        code, payload = self.merge(files[1])
        self.assertEqual((code, payload["scenarios"][0]["next_action"]), (0, "recheck_health"))
        s1 = self.scenario("S-1")
        self.assertEqual((s1["status"], s1["not_run_reason"]), ("not_run", "triage in progress: next action recheck_health"))
        ledger = self.stored()
        ledger["scenarios"][0]["history"][-1].update(health="ok", suggested_class="PRODUCT")
        write_ledger(self.run_dir, ledger)
        code, payload = self.merge(files[2])
        self.assertEqual(code, 0, payload)
        s1 = self.scenario("S-1")
        self.assertEqual((s1["status"], s1["triage"], s1["attempts"]), ("flaky", "FLAKY", 3))
        self.assertNotIn("not_run_reason", s1)

    def test_scenario_tag_problems(self):
        junit = self.write_junit(
            '<testsuite name="s"><testcase name="@S-2 browser"/><testcase name="@S-9 gone"/>'
            '<testcase name="@S-1 @AC-2 wrong"/><testcase name="@S-4 fine"/></testsuite>'
        )
        code, payload = self.merge(junit)
        self.assertEqual(code, 0, payload)
        for reason in ("S-2 is lane browser", "@S-9 not in ledger", "@AC-2 not covered by S-1"):
            self.assertReason(payload["unmapped"], reason)

    def test_any_failure_fails_scenario_and_skips_record_no_run(self):
        junit = self.write_junit(
            '<testsuite name="s"><testcase name="@S-1 a"/><testcase name="@S-1 b"><error/></testcase>'
            '<testcase name="@S-4 c"><skipped/></testcase><testcase name="@S-3 d"/></testsuite>'
        )
        code, payload = self.merge(junit)
        self.assertEqual(code, 0, payload)
        self.assertEqual({item["id"]: item["outcome"] for item in payload["scenarios"]}, {"S-1": "fail", "S-3": "pass"})
        self.assertEqual(payload["skipped"], [{"scenario": "S-4", "testcases": ["@S-4 c"]}])
        self.assertEqual(self.scenario("S-4")["attempts"], 0)

    def test_follow_up_run_applies_triage(self):
        self.ledger["environment"]["resets"] = 1
        self.ledger["scenarios"][2].update(attempts=1, history=[run_attempt("fail", health="failed", source=EARLIER)])
        write_ledger(self.run_dir, self.ledger)
        junit = self.write_junit('<testsuite name="s"><testcase name="@S-3 again"/></testsuite>', "run-2.xml")
        code, payload = self.merge(junit, "--change", "S-3=env_reset")
        self.assertEqual(code, 0, payload)
        s3 = self.scenario("S-3")
        self.assertEqual((s3["status"], s3["triage"], s3["attempts"]), ("pass", "ENV", 2))
        self.assertEqual(s3["history"][1]["change"], "env_reset")

    def test_merged_ledger_passes_gate_when_complete(self):
        junit = self.write_junit('<testsuite name="s"><testcase name="@S-1 a"/><testcase name="@S-3 b"/>'
                                 '<testcase name="@S-4 c"/></testsuite>')
        self.assertEqual(self.merge(junit)[0], 0)
        ledger = self.stored()
        browser = ledger["scenarios"][1]
        browser.update(status="not_run", not_run_reason="human chose stop at checkpoint")
        write_ledger(self.run_dir, ledger)
        code, payload = run_gate(["--check-ledger", str(self.ledger_path)])
        self.assertEqual(code, 0, payload)

class RejectionTests(_JunitCase):
    def assertRejected(self, result: tuple[int, dict], code: int, reason: str):
        self.assertEqual(result[0], code, result[1])
        self.assertReason(result[1]["errors"], reason)

    def test_rejected_inputs_leave_ledger_untouched(self):
        before = self.ledger_path.read_bytes()
        cases = {
            "doctype": ('<!DOCTYPE x [<!ENTITY a "aaaa">]><testsuite><testcase name="@S-1 &a;"/></testsuite>',
                        "<!DOCTYPE declaration refused"),
            "lowercase doctype": ("<!doctype x><testsuite/>", "<!DOCTYPE declaration refused"),
            "entity only": ('<testsuite><!-- <!ENTITY x "y"> --><testcase name="@S-1"/></testsuite>',
                            "<!ENTITY declaration refused"),
            "utf16": ("﻿<testsuite/>".encode("utf-16"), "not UTF-8"),
            "utf16 no bom": ("<testsuite/>".encode("utf-16-le"), "NUL byte"),
            "malformed": ("<testsuite><testcase></testsuite>", "not well-formed XML"),
            "not junit": ("<html><testcase name='@S-1'/></html>", "root <html> is not <testsuites>/<testsuite>"),
            "nothing mapped": ('<testsuite><testcase name="plain"/></testsuite>', "no test case recorded a run"),
        }
        for index, (name, (content, reason)) in enumerate(cases.items()):
            with self.subTest(case=name):
                junit = self.write_junit(content, f"bad-{index}.xml")
                self.assertRejected(self.merge(junit), 2, reason)
                self.assertEqual(self.ledger_path.read_bytes(), before)

    def test_junit_size_cap(self):
        junit = self.write_junit(JUNIT)
        size = len(JUNIT.encode("utf-8"))
        for cap, code_expected in ((size, 0), (size - 1, 2)):
            out = io.StringIO()
            with mock.patch.object(qa_junit_rules, "MAX_JUNIT_BYTES", cap), contextlib.redirect_stdout(out):
                code = junit_to_ledger.main(["--ledger", str(self.ledger_path), "--junit", junit, "--dry-run"])
            payload = json.loads(out.getvalue())
            self.assertEqual(code, code_expected, payload)
        self.assertRejected((code, payload), 2, f"results/run-1.xml: larger than {size - 1} bytes")

    def test_already_merged(self):
        junit = self.write_junit(JUNIT)
        self.assertEqual(self.merge(junit)[0], 0)
        self.assertRejected(self.merge(junit), 2, "results/run-1.xml already merged into S-1, S-3, S-4")

    def test_triage_protocol_break_rejected(self):
        self.ledger["scenarios"][2].update(
            attempts=1, history=[run_attempt("fail", health="ok", suggested_class="TEST", source=EARLIER)]
        )
        write_ledger(self.run_dir, self.ledger)
        before = self.ledger_path.read_bytes()
        junit = self.write_junit('<testsuite name="s"><testcase name="@S-3 again"/></testsuite>', "run-2.xml")
        self.assertRejected(self.merge(junit), 2, "/scenarios/S-3/history: run 2: change none does not follow action fix_spec")
        self.assertEqual(self.ledger_path.read_bytes(), before)

    def test_change_for_unmapped_scenario(self):
        junit = self.write_junit('<testsuite><testcase name="@S-1 a"/></testsuite>')
        self.assertRejected(self.merge(junit, "--change", "S-4=reseed"), 2, "--change S-4: scenario not mapped by this report")

    def test_unsafe_paths(self):
        outside = Path(self._tmp.name) / "outside.xml"
        outside.write_text('<testsuite><testcase name="@S-1"/></testsuite>', encoding="utf-8")
        (self.run_dir / "results").mkdir(exist_ok=True)
        (self.run_dir / "results" / "link.xml").symlink_to(outside)
        cases = {
            "dotdot": ("../outside.xml", "must be results/<name>.xml"),
            "absolute": (str(outside), "must be results/<name>.xml"),
            "nested dotdot": ("results/../../outside.xml", "must be results/<name>.xml"),
            "symlink file": ("results/link.xml", "symlinks are refused"),
        }
        for name, (junit, reason) in cases.items():
            with self.subTest(case=name):
                self.assertRejected(self.merge(junit), 2, reason)

    def test_symlinked_results_dir(self):
        elsewhere = Path(self._tmp.name) / "elsewhere"
        elsewhere.mkdir()
        (elsewhere / "run-1.xml").write_text('<testsuite><testcase name="@S-1"/></testsuite>', encoding="utf-8")
        shutil.rmtree(self.run_dir / "results")
        (self.run_dir / "results").symlink_to(elsewhere)
        self.assertRejected(self.merge("results/run-1.xml"), 2, "symlinks are refused")

    def test_invalid_input_exit_3(self):
        self.assertRejected(self.merge("results/missing.xml"), 3, "file not found")
        junit = self.write_junit(JUNIT)
        self.assertRejected(self.merge(junit, "--change", "S-1=retry"), 3, "--change 'S-1=retry' must be S-<n>=")
        self.assertRejected(self.merge(junit, "--change", "S-1=none", "--change", "S-1=reseed"), 3, "--change S-1 given twice")
        self.ledger_path.write_text("{nope", encoding="utf-8")
        self.assertRejected(self.merge(junit), 3, "invalid JSON")
        self.assertRejected(run_junit_to_ledger(["--junit", junit]), 3, "usage:")

    def test_schema_invalid_ledger(self):
        del self.ledger["environment"]["resets"]
        write_ledger(self.run_dir, self.ledger)
        self.assertRejected(self.merge(self.write_junit(JUNIT)), 2, "ledger /environment: missing required 'resets'")


if __name__ == "__main__":
    unittest.main()
