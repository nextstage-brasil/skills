#!/usr/bin/env python3
"""Unit tests for prove_ac.py, scan_bypasses.py, review_gate.py."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
PROVE = SCRIPTS / "prove_ac.py"
SCAN = SCRIPTS / "scan_bypasses.py"
GATE = SCRIPTS / "review_gate.py"


def run_py(script: Path, args: list[str], stdin: str | None = None, cwd: str | None = None):
    result = subprocess.run(
        [sys.executable, str(script), *args],
        input=stdin,
        text=True,
        capture_output=True,
        cwd=cwd,
        check=False,
    )
    return result.returncode, result.stdout, result.stderr


class ProveAcTests(unittest.TestCase):
    def test_adhoc_skip_without_flags(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, out, _ = run_py(PROVE, ["--mode", "adhoc", "--repo", tmp])
            self.assertEqual(code, 0)
            payload = json.loads(out)
            self.assertEqual(payload["missing"], [])

    def test_token_present_ok(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            req = root / "requirements.md"
            req.write_text(
                "#### Acceptance criteria:\n- [x] Show `btn-login` on form\n",
                encoding="utf-8",
            )
            (root / "app.js").write_text('data-testid="btn-login"\n', encoding="utf-8")
            code, out, _ = run_py(
                PROVE,
                ["--mode", "adhoc", "--repo", tmp, "--requirements", str(req)],
            )
            self.assertEqual(code, 0, out)
            self.assertEqual(json.loads(out)["missing"], [])

    def test_missing_token_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            req = root / "requirements.md"
            req.write_text(
                "#### Acceptance criteria:\n- [ ] Submit via `btn-save` control\n",
                encoding="utf-8",
            )
            (root / "app.js").write_text("export function noop() {}\n", encoding="utf-8")
            code, out, _ = run_py(
                PROVE,
                ["--mode", "adhoc", "--repo", tmp, "--requirements", str(req)],
            )
            self.assertEqual(code, 2)
            missing = json.loads(out)["missing"]
            self.assertTrue(missing)
            self.assertEqual(missing[0]["kind"], "ac_token")
            self.assertIn("btn-save", missing[0]["tokens"])

    def test_zero_token_line_unscored(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            req = root / "requirements.md"
            req.write_text(
                "#### Acceptance criteria:\n- [ ] User can log in\n",
                encoding="utf-8",
            )
            code, out, _ = run_py(
                PROVE,
                ["--mode", "adhoc", "--repo", tmp, "--requirements", str(req)],
            )
            self.assertEqual(code, 0)
            self.assertEqual(json.loads(out)["missing"], [])

    def test_closure_missing_ledger(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "docs" / "versions" / "1.0" / "sdd" / "source"
            source.mkdir(parents=True)
            (source / "api.md").write_text("# S1\n", encoding="utf-8")
            code, out, _ = run_py(PROVE, ["--mode", "closure", "--repo", tmp])
            self.assertEqual(code, 2)
            kinds = {item["kind"] for item in json.loads(out)["missing"]}
            self.assertIn("ledger_missing", kinds)

    def test_closure_two_versions_needs_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for ver in ("1.0", "2.0"):
                source = root / "docs" / "versions" / ver / "sdd" / "source"
                source.mkdir(parents=True)
                (source / "api.md").write_text("# S1\n", encoding="utf-8")
            code, _, err = run_py(PROVE, ["--mode", "closure", "--repo", tmp])
            self.assertEqual(code, 1)
            self.assertIn("--version", err)

    def test_closure_binds_named_version(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for ver, token in (("1.0", "btn-old"), ("2.0", "btn-new")):
                sdd = root / "docs" / "versions" / ver / "sdd"
                sdd.mkdir(parents=True)
                (sdd / "requirements.md").write_text(
                    f"#### Acceptance criteria:\n- [x] Use `{token}`\n",
                    encoding="utf-8",
                )
            (root / "app.js").write_text('data-testid="btn-new"\n', encoding="utf-8")
            code, out, _ = run_py(
                PROVE, ["--mode", "closure", "--repo", tmp, "--version", "2.0"]
            )
            self.assertEqual(code, 0, out)
            code_old, out_old, _ = run_py(
                PROVE, ["--mode", "closure", "--repo", tmp, "--version", "1.0"]
            )
            self.assertEqual(code_old, 2)
            tokens = json.loads(out_old)["missing"][0]["tokens"]
            self.assertIn("btn-old", tokens)

    def test_foreign_version_docs_not_hits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            req = root / "requirements.md"
            req.write_text(
                "#### Acceptance criteria:\n- [ ] Show `ghost-token`\n",
                encoding="utf-8",
            )
            other = root / "docs" / "versions" / "9.9" / "sdd"
            other.mkdir(parents=True)
            (other / "notes.md").write_text("ghost-token\n", encoding="utf-8")
            extra = root / "docs" / "versions" / "8.8" / "sdd"
            extra.mkdir(parents=True)
            code, out, _ = run_py(
                PROVE,
                ["--mode", "adhoc", "--repo", tmp, "--requirements", str(req)],
            )
            self.assertEqual(code, 2)
            self.assertIn("ghost-token", json.loads(out)["missing"][0]["tokens"])

    def test_visual_guides_bound_to_version(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for ver, token in (("1.0", "aria-old-flag"), ("2.0", "aria-new-flag")):
                sdd = root / "docs" / "versions" / ver / "sdd"
                sdd.mkdir(parents=True)
                (sdd / "requirements.md").write_text("# none\n", encoding="utf-8")
                (sdd / f"{ver}-panel-visual.md").write_text(
                    f"## Quick visual checklist\n- [ ] Use `{token}`\n",
                    encoding="utf-8",
                )
            (root / "ui.tsx").write_text("aria-new-flag\n", encoding="utf-8")
            code, out, _ = run_py(
                PROVE, ["--mode", "closure", "--repo", tmp, "--version", "2.0"]
            )
            self.assertEqual(code, 0, out)
            code_old, out_old, _ = run_py(
                PROVE, ["--mode", "closure", "--repo", tmp, "--version", "1.0"]
            )
            self.assertEqual(code_old, 2)
            self.assertIn("aria-old-flag", json.loads(out_old)["missing"][0]["tokens"])

    def test_issue_requires_ac_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            code, _, err = run_py(PROVE, ["--mode", "issue", "--repo", tmp])
            self.assertEqual(code, 1)
            self.assertIn("ac-file", err)


class ScanBypassesTests(unittest.TestCase):
    def test_always_zero(self):
        diff = """\
+++ b/src/a.py
@@ -1,0 +1,2 @@
+x = 1  # noqa
+y = 2
"""
        code, out, _ = run_py(SCAN, [], stdin=diff)
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertTrue(payload["bypasses"])
        self.assertEqual(payload["bypasses"][0]["kind"], "noqa")


class ReviewGateTests(unittest.TestCase):
    def _write(self, tmp: str, payload: dict) -> Path:
        path = Path(tmp) / "findings.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        return path

    def test_p0_without_path_line_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self._write(
                tmp,
                {
                    "score": 8,
                    "verdict": "Rejected",
                    "findings": [{"id": "C1", "sev": "P0", "issue": "missing token"}],
                },
            )
            code, out, _ = run_py(GATE, [str(path)])
            self.assertEqual(code, 1)
            self.assertFalse(json.loads(out)["ok"])

    def test_approved_requires_score_10(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self._write(
                tmp,
                {
                    "score": 9,
                    "verdict": "Approved",
                    "findings": [],
                    "report": "Delivery Review: Approved",
                },
            )
            code, out, _ = run_py(GATE, [str(path)])
            self.assertEqual(code, 1)
            errors = json.loads(out)["errors"]
            self.assertTrue(any("score == 10" in item for item in errors))

    def test_approved_ten_ok(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = self._write(
                tmp,
                {
                    "score": 10,
                    "verdict": "Approved",
                    "findings": [],
                    "report": "ok\nDelivery Review: Approved",
                },
            )
            code, out, _ = run_py(GATE, [str(path)])
            self.assertEqual(code, 0, out)
            self.assertTrue(json.loads(out)["ok"])


if __name__ == "__main__":
    unittest.main()
