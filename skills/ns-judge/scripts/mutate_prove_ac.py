#!/usr/bin/env python3
"""Mutate fixtures against prove_ac.py. Includes drop_ac_token."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PROVE = Path(__file__).resolve().parent / "prove_ac.py"


def prove(repo: Path, extra: list[str] | None = None) -> tuple[int, dict]:
    args = [sys.executable, str(PROVE), "--mode", "adhoc", "--repo", str(repo)]
    if extra:
        args.extend(extra)
    result = subprocess.run(args, text=True, capture_output=True, check=False)
    payload = json.loads(result.stdout) if result.stdout.strip() else {}
    return result.returncode, payload


def seed_ok(root: Path) -> Path:
    req = root / "requirements.md"
    req.write_text(
        "#### Acceptance criteria:\n- [x] Render `drop-token-target` on save\n",
        encoding="utf-8",
    )
    (root / "ui.tsx").write_text('data-testid="drop-token-target"\n', encoding="utf-8")
    return req


class MutateProveAc(unittest.TestCase):
    def test_drop_ac_token(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            req = seed_ok(root)
            code, payload = prove(root, ["--requirements", str(req)])
            self.assertEqual(code, 0, payload)
            (root / "ui.tsx").write_text("export const Empty = () => null\n", encoding="utf-8")
            code, payload = prove(root, ["--requirements", str(req)])
            self.assertEqual(code, 2)
            tokens = payload["missing"][0]["tokens"]
            self.assertIn("drop-token-target", tokens)

    def test_baseline_copy_intact(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "src"
            dst = Path(tmp) / "dst"
            src.mkdir()
            req = seed_ok(src)
            shutil.copytree(src, dst)
            code, _ = prove(dst, ["--requirements", str(dst / req.name)])
            self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
