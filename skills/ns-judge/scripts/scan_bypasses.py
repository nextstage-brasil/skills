#!/usr/bin/env python3
"""Scan git diff stdin for suppression candidates. Always exit 0."""

from __future__ import annotations

import json
import re
import sys

PATTERNS = [
    ("noqa", re.compile(r"\bnoqa\b", re.IGNORECASE)),
    ("eslint-disable", re.compile(r"eslint-disable")),
    ("ts-ignore", re.compile(r"@ts-ignore|@ts-expect-error")),
    ("pylint-disable", re.compile(r"pylint:\s*disable")),
    ("nosec", re.compile(r"\bnosec\b")),
    ("test-skip", re.compile(r"@pytest\.mark\.skip|\bit\.skip\b|\bxit\b|\.skip\(")),
    ("suppress-warnings", re.compile(r"@SuppressWarnings")),
]


def scan(diff_text: str) -> list[dict]:
    findings: list[dict] = []
    current_file = ""
    new_line = 0
    for raw in diff_text.splitlines():
        if raw.startswith("+++ b/"):
            current_file = raw[6:]
            new_line = 0
            continue
        if raw.startswith("@@"):
            match = re.search(r"\+(\d+)", raw)
            new_line = int(match.group(1)) - 1 if match else 0
            continue
        if raw.startswith("+") and not raw.startswith("+++"):
            new_line += 1
            body = raw[1:]
            for kind, pattern in PATTERNS:
                if pattern.search(body):
                    findings.append(
                        {
                            "kind": kind,
                            "path": current_file,
                            "line": new_line,
                            "text": body.strip(),
                        }
                    )
        elif raw.startswith(" "):
            new_line += 1
    return findings


def main() -> int:
    diff_text = sys.stdin.read()
    print(json.dumps({"bypasses": scan(diff_text)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
