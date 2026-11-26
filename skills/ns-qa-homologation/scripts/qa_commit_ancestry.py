#!/usr/bin/env python3
"""Commit ancestry proof for ns-qa-homologation (Q5). Stdlib only; one read-only git call.

Monorepo imports rewrite history: the MR under homologation lives in a legacy repository whose head SHA is not the
deployed commit, but its merge commit is part of the deployed history. This script proves that with
`git merge-base --is-ancestor <mr-commit> <env-commit>` and records the proof in RUN_DIR/commit-ancestry.json.
The ledger gate (`qa_ledger_rules._blocked_reasons`) then accepts `mr.commit` when the proof names the same two commits.

Usage: qa_commit_ancestry.py --run-dir RUN_DIR --repo REPO --mr-commit SHA --env-commit SHA

Exit codes: 0 mr-commit is the env commit or one of its ancestors (proof written)
            2 not an ancestor / unknown commit (no proof written)
            3 invalid input (not a hex SHA, not a git repo)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_common import utc_timestamp, write_json_atomic  # noqa: E402

PROOF_FILE = "commit-ancestry.json"
_SHA = re.compile(r"^[0-9a-f]{7,40}$")


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=False)


def _out(payload: dict, code: int) -> int:
    print(json.dumps(payload, indent=2))
    return code


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):  # usage errors are invalid input (exit 3), like every skill script
        print(json.dumps({"mode": "commit-ancestry", "ok": False, "errors": [message]}))
        sys.exit(3)


def main(argv: list[str] | None = None) -> int:
    parser = _Parser(description="ns-qa-homologation commit ancestry proof")
    parser.add_argument("--run-dir", required=True, type=Path)
    parser.add_argument("--repo", default=".", type=Path)
    parser.add_argument("--mr-commit", required=True)
    parser.add_argument("--env-commit", required=True)
    args = parser.parse_args(argv)
    errors = [f"{name} {value!r} must be 7-40 lowercase hex"
              for name, value in (("--mr-commit", args.mr_commit), ("--env-commit", args.env_commit))
              if not _SHA.match(value)]
    if errors:
        return _out({"mode": "commit-ancestry", "ok": False, "errors": errors}, 3)
    if _git(args.repo, "rev-parse", "--git-dir").returncode != 0:
        return _out({"mode": "commit-ancestry", "ok": False, "errors": [f"{args.repo} is not a git repository"]}, 3)
    resolved = {}
    for name, sha in (("mr_commit", args.mr_commit), ("env_commit", args.env_commit)):
        done = _git(args.repo, "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}")
        if done.returncode != 0:
            return _out({"mode": "commit-ancestry", "ok": False,
                         "errors": [f"{name} {sha} is not a commit of this repository"]}, 2)
        resolved[name] = done.stdout.strip()
    ancestor = _git(args.repo, "merge-base", "--is-ancestor", resolved["mr_commit"], resolved["env_commit"])
    if ancestor.returncode != 0:
        return _out({"mode": "commit-ancestry", "ok": False,
                     "errors": [f"mr commit {resolved['mr_commit']} is not an ancestor of env commit {resolved['env_commit']}"]}, 2)
    proof = {"verified_with": "git merge-base --is-ancestor", "mr_commit": resolved["mr_commit"],
             "env_commit": resolved["env_commit"], "is_ancestor": True, "at": utc_timestamp()}
    write_json_atomic(args.run_dir / PROOF_FILE, proof)
    return _out({"mode": "commit-ancestry", "ok": True, "errors": [], "proof": PROOF_FILE, **proof}, 0)


if __name__ == "__main__":
    sys.exit(main())
