#!/usr/bin/env python3
"""Tests for qa_commit_ancestry.py and the ledger rule that accepts an ancestry proof (monorepo imports).

Real git, offline: a temp repository with two commits. Stdlib only.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from qa_fixtures import SCRIPTS, base_ledger, run_gate, write_ledger
from qa_fixtures import _run_script

ANCESTRY = SCRIPTS / "qa_commit_ancestry.py"


def _git(repo: Path, *args: str) -> str:
    done = subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@example.com", *args],
                          capture_output=True, text=True, check=True)
    return done.stdout.strip()


def _repo(root: Path) -> tuple[Path, str, str]:
    repo = root / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    (repo / "a.txt").write_text("1", encoding="utf-8")
    _git(repo, "add", "a.txt")
    _git(repo, "commit", "-q", "-m", "one")
    first = _git(repo, "rev-parse", "HEAD")
    (repo / "a.txt").write_text("2", encoding="utf-8")
    _git(repo, "commit", "-q", "-am", "two")
    return repo, first, _git(repo, "rev-parse", "HEAD")


class AncestryTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.repo, self.first, self.second = _repo(self.root)
        self.run_dir = self.root / "run"
        self.run_dir.mkdir()

    def tearDown(self):
        self._tmp.cleanup()

    def prove(self, mr: str, env: str) -> tuple[int, dict]:
        return _run_script(ANCESTRY, ["--run-dir", str(self.run_dir), "--repo", str(self.repo),
                                      "--mr-commit", mr, "--env-commit", env], None)

    def test_ancestor_writes_proof(self):
        code, payload = self.prove(self.first, self.second)
        self.assertEqual(code, 0, payload)
        proof = json.loads((self.run_dir / "commit-ancestry.json").read_text(encoding="utf-8"))
        self.assertEqual((proof["mr_commit"], proof["env_commit"], proof["is_ancestor"]), (self.first, self.second, True))

    def test_same_commit_is_accepted(self):
        self.assertEqual(self.prove(self.second, self.second)[0], 0)

    def test_descendant_is_refused_without_proof(self):
        code, payload = self.prove(self.second, self.first)
        self.assertEqual(code, 2, payload)
        self.assertIn("not an ancestor", payload["errors"][0])
        self.assertFalse((self.run_dir / "commit-ancestry.json").exists())

    def test_unknown_commit_and_bad_input(self):
        code, payload = self.prove("1" * 40, self.second)
        self.assertEqual(code, 2, payload)
        self.assertIn("is not a commit", payload["errors"][0])
        code, payload = self.prove("--option", self.second)
        self.assertEqual(code, 3)


class LedgerAncestryTests(unittest.TestCase):
    def check(self, mr: str, env: str, proof: dict | None) -> dict:
        with tempfile.TemporaryDirectory() as tmp:
            run_dir = Path(tmp) / "run"
            ledger = base_ledger(run_dir)
            ledger["mr"]["commit"], ledger["environment"]["commit"] = mr, env
            path = write_ledger(run_dir, ledger)
            if proof is not None:
                (run_dir / "commit-ancestry.json").write_text(json.dumps(proof), encoding="utf-8")
            code, payload = run_gate(["--check-ledger", str(path)])
            self.assertEqual(code, 0, payload)
            return payload

    PROOF = {"verified_with": "git merge-base --is-ancestor", "mr_commit": "aaa1111", "env_commit": "bbb2222",
             "is_ancestor": True, "at": "2026-11-26T12:00:00Z"}

    def test_proof_unblocks_mismatch(self):
        self.assertFalse(self.check("aaa1111", "bbb2222", self.PROOF)["blocked"])

    def test_mismatch_without_proof_stays_blocked(self):
        self.assertTrue(self.check("aaa1111", "bbb2222", None)["blocked"])

    def test_proof_for_other_commits_or_not_ancestor_is_ignored(self):
        self.assertTrue(self.check("aaa1111", "ccc3333", self.PROOF)["blocked"])
        self.assertTrue(self.check("aaa1111", "bbb2222", dict(self.PROOF, is_ancestor=False))["blocked"])
        self.assertTrue(self.check("aaa1111", "bbb2222", dict(self.PROOF, verified_with="by hand"))["blocked"])


if __name__ == "__main__":
    unittest.main()
