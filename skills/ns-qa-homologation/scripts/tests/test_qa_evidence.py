#!/usr/bin/env python3
"""Tests for qa_evidence.py: normalized names, hashing, PII flag, confinement, verify and index. Stdlib only.

Every rejection asserts its specific reason so an unrelated rule cannot make it pass.
"""

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from qa_fixtures import RUN_ID, base_ledger, filled_profile_text, run_evidence, run_gate, write_ledger, write_repo_with_profile

import qa_evidence  # noqa: E402  (qa_fixtures puts scripts/ on sys.path; in-process cases patch it)

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 16
SELECTORS = ("#cpf", ".email")


def profile_text(capture: str = "[screenshot, console, network, runner_video]") -> str:
    text = filled_profile_text({"capture: [screenshot, console, network, runner_video]": f"capture: {capture}"})
    return re.sub(r"pii_fields: \[[^\]]*\]", 'pii_fields: ["#cpf", ".email"]', text)


class _EvidenceCase(unittest.TestCase):
    capture = "[screenshot, console, network, runner_video]"

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.profile = write_repo_with_profile(self.root, profile_text(self.capture))
        self.run_dir = self.root / "docs" / "qa" / RUN_ID
        self.ledger = base_ledger(self.run_dir)
        self.ledger_path = write_ledger(self.run_dir, self.ledger)
        self.raw = self.root / "raw"
        self.raw.mkdir()

    def tearDown(self):
        self._tmp.cleanup()

    def source(self, name: str, data: bytes) -> Path:
        path = self.raw / name
        path.write_bytes(data)
        return path

    def add(self, *args: str, kind: str = "screenshot", scenario: str = "S-1", label: str = "Saved form",
            file: Path | None = None, ledger: bool = True) -> tuple[int, dict]:
        file = file or self.source("shot.png", PNG)
        argv = ["add", "--run-dir", str(self.run_dir), "--profile", str(self.profile), "--scenario", scenario,
                "--kind", kind, "--file", str(file), "--label", label, *args]
        if ledger:
            argv += ["--ledger", str(self.ledger_path)]
        return run_evidence(argv, cwd=self.root)

    def check(self, command: str) -> tuple[int, dict]:
        return run_evidence([command, "--run-dir", str(self.run_dir), "--ledger", str(self.ledger_path)])

    def stored(self) -> dict:
        return json.loads(self.ledger_path.read_text(encoding="utf-8"))

    def assertReason(self, result: tuple[int, dict], code: int, expected: str):
        self.assertEqual(result[0], code, result[1])
        self.assertTrue(any(expected in error for error in result[1]["errors"]), f"{expected!r} not in {result[1]['errors']}")


class AddTests(_EvidenceCase):
    def test_screenshot_masked_normalized_hashed_and_recorded(self):
        code, payload = self.add("--pii-masked", "#cpf", "--pii-masked", ".email")
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["path"], "evidence/S-1-02-saved-form.png")
        self.assertEqual(payload["sha256"], hashlib.sha256(PNG).hexdigest())
        self.assertIs(payload["pii_scrubbed"], True)
        self.assertEqual(payload["pii_unmasked"], [])
        self.assertTrue(payload["ledger_updated"])
        self.assertEqual((self.run_dir / payload["path"]).read_bytes(), PNG)
        entry = self.stored()["scenarios"][0]["evidence"][-1]
        self.assertEqual(entry, {"kind": "screenshot", "path": payload["path"], "sha256": payload["sha256"], "pii_scrubbed": True})
        self.assertEqual(run_gate(["--check-ledger", str(self.ledger_path)])[0], 0)

    def test_unmasked_selector_marks_not_scrubbed(self):
        code, payload = self.add("--pii-masked", "#cpf")
        self.assertEqual(code, 0, payload)
        self.assertIs(payload["pii_scrubbed"], False)
        self.assertEqual(payload["pii_unmasked"], [".email"])

    def test_sequence_and_other_kinds(self):
        log = self.source("console.log", b"[error] boom\n")
        video = self.source("spec.webm", WEBM)
        first = self.add(kind="console", label="Console errors", file=log)
        second = self.add(kind="console", label="Console errors", file=log)
        third = self.add(kind="runner_video", scenario="S-2", label="Spec video", file=video, ledger=False)
        self.assertEqual([item[1]["path"] for item in (first, second, third)],
                         ["evidence/S-1-02-console-errors.log", "evidence/S-1-03-console-errors.log",
                          "evidence/S-2-02-spec-video.webm"])
        self.assertNotIn("pii_scrubbed", first[1])
        self.assertFalse(third[1]["ledger_updated"])

    def test_slug_rules(self):
        code, payload = self.add(label="  Saved FORM — ok!! ", file=self.source("a.jpeg", JPEG), ledger=False)
        self.assertEqual(code, 0, payload)
        self.assertEqual(payload["path"], "evidence/S-1-02-saved-form-ok.jpeg")
        long_label = "x" * 39 + " yy"
        code, payload = self.add(label=long_label, ledger=False)
        self.assertEqual(payload["path"], "evidence/S-1-03-" + "x" * 39 + ".png")

    def test_rejections_exit_2(self):
        cases = {
            "dotdot label": ({"label": "../../etc"}, "path separator, '..' or control character refused"),
            "slash label": ({"label": "a/b"}, "path separator"),
            "backslash label": ({"label": "a\\b"}, "path separator"),
            "newline label": ({"label": "a\nb"}, "control character"),
            "empty label": ({"label": ""}, "empty"),
            "symbol label": ({"label": "!!!"}, "no [a-z0-9] character"),
            "gif screenshot": ({"file": "shot.gif"}, ".gif not allowed for screenshot"),
            "fake png": ({"file": ("fake.png", b"not an image")}, "content is not a .png file"),
            "har not json": ({"kind": "network", "file": ("net.har", b"{nope")}, "invalid JSON"),
            "json too deep": ({"kind": "network", "file": ("net.json", b"[" * 100000)}, "invalid JSON (nesting too deep)"),
            "nul in log": ({"kind": "console", "file": ("c.log", b"a\x00b")}, "NUL byte in text capture"),
            "binary log": ({"kind": "console", "file": ("c.log", b"\xff\xfe")}, "not UTF-8 text"),
            "unknown scenario": ({"scenario": "S-9"}, "scenario S-9 not in ledger"),
        }
        for name, (options, reason) in cases.items():
            with self.subTest(case=name):
                file = options.pop("file", None)
                if isinstance(file, tuple):
                    file = self.source(*file)
                elif isinstance(file, str):
                    file = self.source(file, PNG)
                before = sorted(path.name for path in (self.run_dir / "evidence").iterdir())
                self.assertReason(self.add(file=file, **options), 2, reason)
                self.assertEqual(sorted(path.name for path in (self.run_dir / "evidence").iterdir()), before)

    def test_symlinks_refused(self):
        target = self.source("real.png", PNG)
        link = self.raw / "link.png"
        link.symlink_to(target)
        self.assertReason(self.add(file=link), 2, "symlinks refused")
        evidence = self.run_dir / "evidence"
        moved = self.root / "moved"
        evidence.rename(moved)
        evidence.symlink_to(moved)
        self.assertReason(self.add(), 2, "evidence/ is a symlink: refused")

    def test_invalid_input_exit_3(self):
        self.assertReason(self.add(file=self.raw / "missing.png"), 3, "not a regular file")
        self.assertReason(self.add("--pii-masked", "#cpf", kind="console", file=self.source("c.log", b"x")), 3,
                          "--pii-masked applies to screenshots only")
        self.assertReason(self.add(scenario="S-1;x"), 3, "is not S-<n>")
        outside = write_ledger(self.root / "elsewhere", base_ledger(self.root / "elsewhere"))
        self.assertReason(
            run_evidence(["add", "--run-dir", str(self.run_dir), "--profile", str(self.profile), "--scenario", "S-1",
                          "--kind", "screenshot", "--file", str(self.source("p.png", PNG)), "--label", "x",
                          "--ledger", str(outside)], cwd=self.root),
            3, "must live in --run-dir",
        )
        self.profile.write_text(profile_text().replace("pii_masking: dom", "pii_masking: ocr"), encoding="utf-8")
        self.assertReason(self.add(), 3, "profile /evidence/pii_masking")
        self.assertReason(run_evidence(["add", "--run-dir", str(self.run_dir)]), 3, "usage:")


def _in_process(argv: list[str]) -> tuple[int, dict]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = qa_evidence.main(argv)
    return code, json.loads(out.getvalue())


class InProcessGuardTests(_EvidenceCase):
    """Guards normal flows cannot reach (name collision race, size caps): forced in-process."""

    def _add_argv(self, file: Path, label: str) -> list[str]:
        return ["add", "--run-dir", str(self.run_dir), "--profile", str(self.profile), "--scenario", "S-1",
                "--kind", "screenshot", "--file", str(file), "--label", label]

    def test_existing_target_never_overwritten(self):
        existing = self.run_dir / "evidence" / "S-1-01-saved.png"
        before = existing.read_bytes()
        with mock.patch.object(qa_evidence._RunDir, "next_seq", return_value=1):
            code, payload = _in_process(self._add_argv(self.source("new.png", PNG), "saved"))
        self.assertEqual(code, 2, payload)
        self.assertTrue(any("evidence/S-1-01-saved.png already exists" in item for item in payload["errors"]), payload)
        self.assertEqual(existing.read_bytes(), before)

    def test_planted_symlink_target_not_followed(self):
        outside = self.root / "outside.png"
        outside.write_bytes(b"keep")
        (self.run_dir / "evidence" / "S-1-01-x.png").symlink_to(outside)
        with mock.patch.object(qa_evidence._RunDir, "next_seq", return_value=1):
            code, payload = _in_process(self._add_argv(self.source("new.png", PNG), "x"))
        self.assertEqual(code, 2, payload)
        self.assertTrue(any("already exists" in item for item in payload["errors"]), payload)
        self.assertEqual(outside.read_bytes(), b"keep")

    def test_capture_size_cap(self):
        with mock.patch.object(qa_evidence, "_MAX_CAPTURE_BYTES", 10):
            code, payload = _in_process(self._add_argv(self.source("big.png", PNG), "big"))
        self.assertEqual(code, 2, payload)
        self.assertTrue(any("larger than 10 bytes" in item for item in payload["errors"]), payload)


class DirectoryGuardTests(_EvidenceCase):
    def test_run_dir_symlink_refused(self):
        link = self.root / "run-link"
        link.symlink_to(self.run_dir)
        self.assertReason(run_evidence(["verify", "--run-dir", str(link), "--ledger", str(self.ledger_path)]), 3,
                          "not a directory (symlinks refused)")

    def test_index_symlink_refused(self):
        outside = self.root / "outside.md"
        outside.write_text("keep", encoding="utf-8")
        (self.run_dir / "evidence" / "index.md").symlink_to(outside)
        self.assertReason(self.check("index"), 2, "evidence/index.md: symlink refused")
        self.assertEqual(outside.read_text(encoding="utf-8"), "keep")

    def test_entry_cited_under_wrong_scenario(self):
        ledger = self.stored()
        ledger["scenarios"][0]["evidence"].append(dict(ledger["scenarios"][1]["evidence"][0]))
        write_ledger(self.run_dir, ledger)
        self.assertReason(self.check("verify"), 2, "screenshot path evidence/S-2-01-error.png names S-2, not S-1")

    def test_huge_ids_never_crash(self):
        digits = "9" * 5000
        (self.run_dir / "evidence" / f"S-1-{digits[:200]}-x.png").write_bytes(PNG)  # filename limit: 255 bytes
        self.assertReason(self.check("verify"), 2, "unnormalized name")
        self.assertReason(self.add(scenario=f"S-{digits}"), 3, "is not S-<n>")
        code, payload = self.add(ledger=False)
        self.assertEqual((code, payload["path"]), (0, "evidence/S-1-02-saved-form.png"))


class CaptureSubsetTests(_EvidenceCase):
    capture = "[screenshot]"

    def test_kind_outside_capture_refused(self):
        self.assertReason(self.add(kind="console", file=self.source("c.log", b"x")), 2,
                          "--kind console: evidence.capture excludes it")


class VerifyIndexTests(_EvidenceCase):
    def test_clean_run_verifies_and_indexes_deterministically(self):
        self.assertEqual(self.add("--pii-masked", "#cpf")[0], 0)
        self.assertEqual(self.check("verify")[0], 0)
        code, payload = self.check("index")
        self.assertEqual(code, 0, payload)
        index = (self.run_dir / "evidence" / "index.md").read_text(encoding="utf-8")
        self.assertIn(f"# Evidence index — run {RUN_ID}", index)
        self.assertIn("| evidence/S-1-02-saved-form.png | S-1 | AC-1 | screenshot |", index)
        self.assertIn("| no | no (PII not masked) |", index)
        self.assertIn("| results/run-1.xml | S-1 | AC-1 | junit |", index)
        self.assertEqual(self.check("index")[0], 0)
        self.assertEqual((self.run_dir / "evidence" / "index.md").read_text(encoding="utf-8"), index)
        self.assertEqual(self.check("verify")[0], 0)

    def test_index_orders_ids_numerically(self):
        ledger = self.stored()
        s10 = json.loads(json.dumps(ledger["scenarios"][0]))
        s10.update(id="S-10", evidence=[dict(ledger["scenarios"][0]["evidence"][0])])
        ledger["scenarios"].append(s10)
        ledger["scenarios"][1]["evidence"].append(dict(ledger["scenarios"][0]["evidence"][0]))
        write_ledger(self.run_dir, ledger)
        self.assertEqual(self.check("index")[0], 0)
        index = (self.run_dir / "evidence" / "index.md").read_text(encoding="utf-8")
        self.assertIn("| results/run-1.xml | S-1, S-2, S-10 | AC-1, AC-2 | junit |", index)

    def test_rejections_exit_2(self):
        def stray(evidence):
            (evidence / "Screenshot 2026.png").write_bytes(PNG)

        def unreferenced(evidence):
            (evidence / "S-1-07-extra.png").write_bytes(PNG)

        def tampered(evidence):
            (evidence / "S-1-01-saved.png").write_bytes(b"other")

        def planted_symlink(evidence):
            (evidence / "S-1-08-link.png").symlink_to(self.source("t.png", PNG))

        def subdir(evidence):
            (evidence / "nested").mkdir()

        def cited_but_missing(evidence):
            (evidence / "S-2-01-error.png").unlink()

        cases = {
            stray: "evidence/Screenshot 2026.png: unnormalized name",
            unreferenced: "evidence/S-1-07-extra.png: not referenced by the ledger",
            tampered: "sha256 mismatch for evidence/S-1-01-saved.png",
            planted_symlink: "evidence/S-1-08-link.png: symlink refused",
            subdir: "evidence/nested: not a regular file",
            cited_but_missing: "file evidence/S-2-01-error.png not found",
        }
        for mutate, reason in cases.items():
            for command in ("verify", "index"):
                with self.subTest(case=mutate.__name__, command=command):
                    self.tearDown()
                    self.setUp()
                    mutate(self.run_dir / "evidence")
                    self.assertReason(self.check(command), 2, reason)
                    self.assertFalse((self.run_dir / "evidence" / "index.md").exists())


if __name__ == "__main__":
    unittest.main()
