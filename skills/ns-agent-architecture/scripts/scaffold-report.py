#!/usr/bin/env python3
"""Scaffold docs/specs/agent-architecture.md from report-template.md.

Does not rewrite the template file. Writes the inner ADR skeleton
(between the first ```markdown fence and the last closing ```).

Skips if the destination already exists.

Usage:
    python3 scripts/scaffold-report.py [repo_root]
    python3 .agents/skills/ns-agent-architecture/scripts/scaffold-report.py [repo_root]
    python3 skills/ns-agent-architecture/scripts/scaffold-report.py [repo_root]

Default repo_root: current working directory.
"""
from __future__ import annotations

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATE = SKILL_DIR / "references" / "report-template.md"


def extract_adr_skeleton(template_text: str) -> str:
    lines = template_text.splitlines(keepends=True)
    start = None
    for i, line in enumerate(lines):
        if line.strip() == "```markdown":
            start = i + 1
            break
    if start is None:
        raise ValueError("report-template.md missing opening ```markdown fence")
    end = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == "```":
            end = i
            break
    if end is None or end <= start:
        raise ValueError("report-template.md missing closing fence for ADR skeleton")
    body = "".join(lines[start:end])
    if not body.lstrip().startswith("# Multi-Agent Architecture"):
        raise ValueError("extracted skeleton does not start with # Multi-Agent Architecture")
    if "## Changelog" not in body:
        raise ValueError("extracted skeleton missing ## Changelog")
    if "```markdown" in body:
        raise ValueError("extracted skeleton still contains ```markdown fence")
    return body


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1].startswith("-"):
        print("Usage: python3 scaffold-report.py [repo_root]", file=sys.stderr)
        return 1
    repo_root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    dest_dir = repo_root / "docs" / "specs"
    dest = dest_dir / "agent-architecture.md"

    if not TEMPLATE.is_file():
        print(f"ERROR: template missing: {TEMPLATE}", file=sys.stderr)
        return 1

    if dest.exists():
        print(f"SKIP: {dest} exists — fill in place; do not re-scaffold")
        return 0

    try:
        skeleton = extract_adr_skeleton(TEMPLATE.read_text(encoding="utf-8"))
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    dest_dir.mkdir(parents=True, exist_ok=True)
    dest.write_text(skeleton, encoding="utf-8")
    print(f"OK: scaffolded ADR skeleton -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
