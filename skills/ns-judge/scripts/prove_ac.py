#!/usr/bin/env python3
"""Prove AC tokens and closure artifacts against the repo. Stdlib only."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

SKIP_DIR_NAMES = {
    ".git",
    "node_modules",
    "vendor",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".worktrees",
    "coverage",
    ".venv",
    "venv",
}

AC_HEADING = re.compile(r"^#{2,4}\s+Acceptance criteria:?\s*$", re.IGNORECASE)
CHECKBOX_LINE = re.compile(r"^\s*-\s+\[[ xX]\]\s+(.*)$")
TABLE_ROW = re.compile(r"^\s*\|(.+)\|\s*$")
TESTID_COL = re.compile(r"`([^`]+)`")
HTTP_STATUS = re.compile(r"\b([1-5][0-9]{2})\b")
HTTP_HINT = re.compile(r"HTTP|status\s*code|\bstatus\b", re.IGNORECASE)
BACKTICK = re.compile(r"`([^`]+)`")
DOUBLE_QUOTE = re.compile(r'"([^"]+)"')
SINGLE_QUOTE = re.compile(r"'([^']+)'")
DATA_TESTID = re.compile(r"data-testid\s*[=:]\s*['\"]([^'\"]+)['\"]")
WORDISH = re.compile(r"^[A-Za-z0-9._:-]+$")
VISUAL_HEADING = re.compile(r"^##\s+Quick visual checklist\s*$", re.IGNORECASE)
REF_LAYOUT = re.compile(r"ui-layout|[*-]visual\.md", re.IGNORECASE)

MAPPABLE_CLASSES = {
    "api-contract",
    "data-schema",
    "ui-screen",
    "business-rule",
    "test-case",
}

EXIT_OK = 0
EXIT_SKIP = 1
EXIT_REJECTED = 2


class ProofError(Exception):
    """Unrecoverable skip (IO / bad args)."""


def extract_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    for match in BACKTICK.finditer(text):
        tokens.append(match.group(1).strip())
    for match in DOUBLE_QUOTE.finditer(text):
        tokens.append(match.group(1).strip())
    for match in SINGLE_QUOTE.finditer(text):
        tokens.append(match.group(1).strip())
    for match in DATA_TESTID.finditer(text):
        tokens.append(match.group(1).strip())
    if HTTP_HINT.search(text):
        for match in HTTP_STATUS.finditer(text):
            tokens.append(match.group(1))
    seen: set[str] = set()
    out: list[str] = []
    for token in tokens:
        if not token or token in seen:
            continue
        if len(token) < 2 and not HTTP_STATUS.fullmatch(token):
            continue
        seen.add(token)
        out.append(token)
    return out


def other_version_doc(path: Path, repo: Path, version_san: str | None) -> bool:
    try:
        rel = path.resolve().relative_to(repo.resolve())
    except ValueError:
        return False
    parts = rel.parts
    if len(parts) < 3 or parts[0] != "docs" or parts[1] != "versions":
        return False
    if version_san is None:
        return True
    return parts[2] != version_san


def iter_repo_files(repo: Path, skip_files: set[Path], version_san: str | None):
    skip_resolved = {path.resolve() for path in skip_files}
    for root, dirs, files in os.walk(repo):
        dirs[:] = [name for name in dirs if name not in SKIP_DIR_NAMES]
        for name in files:
            path = Path(root) / name
            if path.resolve() in skip_resolved:
                continue
            if other_version_doc(path, repo, version_san):
                continue
            yield path


def file_contains(path: Path, needle: str) -> bool:
    try:
        data = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return False
    if len(needle) <= 3 and WORDISH.match(needle):
        pattern = r"(?<![A-Za-z0-9_-])" + re.escape(needle) + r"(?![A-Za-z0-9_-])"
        return re.search(pattern, data) is not None
    return needle in data


def token_hits_repo(
    repo: Path, token: str, skip_files: set[Path], version_san: str | None
) -> bool:
    for path in iter_repo_files(repo, skip_files, version_san):
        if file_contains(path, token):
            return True
    return False


def parse_checkbox_items(text: str) -> list[tuple[int, str]]:
    items: list[tuple[int, str]] = []
    in_ac = False
    for index, line in enumerate(text.splitlines(), start=1):
        if AC_HEADING.match(line.strip()):
            in_ac = True
            continue
        if in_ac and line.startswith("#"):
            in_ac = False
            continue
        if not in_ac:
            continue
        match = CHECKBOX_LINE.match(line)
        if match:
            items.append((index, match.group(1).strip()))
    return items


def list_version_sans(repo: Path) -> list[str]:
    versions = repo / "docs" / "versions"
    if not versions.is_dir():
        return []
    return sorted(
        path.name
        for path in versions.iterdir()
        if path.is_dir() and path.name != "_done"
    )


def version_san_from_requirements(requirements: Path) -> str | None:
    parts = requirements.resolve().parts
    if "versions" not in parts:
        return None
    index = parts.index("versions")
    if index + 1 >= len(parts):
        return None
    return parts[index + 1]


def resolve_version_san(
    repo: Path, version: str | None, requirements: Path | None, required: bool
) -> str | None:
    if version:
        return version
    if requirements is not None:
        derived = version_san_from_requirements(requirements)
        if derived:
            return derived
    sans = list_version_sans(repo)
    if len(sans) == 1:
        return sans[0]
    if len(sans) > 1 and required:
        raise ProofError("multiple docs/versions/*; pass --version or --requirements")
    return None


def find_version_file(repo: Path, name: str, version_san: str | None) -> Path | None:
    if not version_san:
        return None
    sdd = repo / "docs" / "versions" / version_san / "sdd" / name
    if sdd.is_file():
        return sdd
    legacy = repo / "docs" / "versions" / version_san / name
    return legacy if legacy.is_file() else None


def prove_ac_lines(
    text: str,
    source_path: Path,
    repo: Path,
    version_san: str | None,
) -> list[dict]:
    missing: list[dict] = []
    skip = {source_path}
    for line_no, body in parse_checkbox_items(text):
        tokens = extract_tokens(body)
        if not tokens:
            continue
        absent = [
            token
            for token in tokens
            if not token_hits_repo(repo, token, skip, version_san)
        ]
        if absent:
            missing.append(
                {
                    "kind": "ac_token",
                    "path": str(source_path),
                    "line": line_no,
                    "tokens": absent,
                    "text": body,
                }
            )
    return missing


def parse_ledger_rows(text: str) -> list[dict]:
    rows: list[dict] = []
    header_seen = False
    for index, line in enumerate(text.splitlines(), start=1):
        match = TABLE_ROW.match(line)
        if not match:
            continue
        cells = [cell.strip() for cell in match.group(1).split("|")]
        if len(cells) < 3:
            continue
        if cells[0].lower() == "anchor" or set(cells[0]) <= {"-", ":"}:
            header_seen = True
            continue
        if not header_seen:
            continue
        rows.append(
            {
                "line": index,
                "anchor": cells[0],
                "class": cells[1].lower(),
                "status": cells[2].lower(),
            }
        )
    return rows


def prove_ledger(repo: Path, version_san: str | None) -> list[dict]:
    if not version_san:
        return []
    source = repo / "docs" / "versions" / version_san / "sdd" / "source"
    if not source.is_dir():
        source = repo / "docs" / "versions" / version_san / "source"
    if not source.is_dir() or not any(source.iterdir()):
        return []
    ledger = find_version_file(repo, "spec-coverage.md", version_san)
    if ledger is None:
        return [
            {
                "kind": "ledger_missing",
                "path": str(source.parent / "spec-coverage.md"),
                "line": 1,
                "tokens": ["spec-coverage.md"],
                "text": "source/ present; spec-coverage.md missing",
            }
        ]
    text = ledger.read_text(encoding="utf-8")
    missing: list[dict] = []
    for row in parse_ledger_rows(text):
        klass = row["class"]
        status = row["status"]
        if klass == "context":
            continue
        if klass in MAPPABLE_CLASSES and status == "unmapped":
            missing.append(
                {
                    "kind": "ledger_unmapped",
                    "path": str(ledger),
                    "line": row["line"],
                    "tokens": [row["anchor"]],
                    "text": f"{row['anchor']} {klass} unmapped",
                }
            )
    return missing


def prove_ui_contract(repo: Path, version_san: str | None) -> list[dict]:
    contract = find_version_file(repo, "ui-contract.md", version_san)
    if contract is None:
        return []
    missing: list[dict] = []
    skip = {contract}
    for index, line in enumerate(contract.read_text(encoding="utf-8").splitlines(), start=1):
        match = TABLE_ROW.match(line)
        if not match:
            continue
        cells = [cell.strip() for cell in match.group(1).split("|")]
        if not cells or cells[0].lower() in {"data-testid", "-----------"}:
            continue
        if set(cells[0]) <= {"-", ":"}:
            continue
        testids = TESTID_COL.findall(cells[0])
        copy_cell = cells[3] if len(cells) > 3 else ""
        tokens = list(testids) + extract_tokens(copy_cell)
        if not tokens:
            continue
        absent = [
            token
            for token in tokens
            if not token_hits_repo(repo, token, skip, version_san)
        ]
        if absent:
            missing.append(
                {
                    "kind": "ui_contract",
                    "path": str(contract),
                    "line": index,
                    "tokens": absent,
                    "text": line.strip(),
                }
            )
    return missing


def visual_guide_paths(repo: Path, version_san: str | None) -> list[Path]:
    found: set[Path] = set()
    ref = repo / "docs" / "context" / "reference-sources.md"
    if ref.is_file():
        text = ref.read_text(encoding="utf-8")
        if REF_LAYOUT.search(text):
            for match in re.finditer(r"([^\s|]+-visual\.md)", text):
                candidate = repo / match.group(1)
                if candidate.is_file() and not other_version_doc(candidate, repo, version_san):
                    found.add(candidate)
    for path in repo.glob("**/*-visual.md"):
        if any(part in SKIP_DIR_NAMES for part in path.parts):
            continue
        if other_version_doc(path, repo, version_san):
            continue
        found.add(path)
    return sorted(found)


def prove_visual(repo: Path, version_san: str | None) -> list[dict]:
    missing: list[dict] = []
    for guide in visual_guide_paths(repo, version_san):
        in_list = False
        skip = {guide}
        for index, line in enumerate(guide.read_text(encoding="utf-8").splitlines(), start=1):
            if VISUAL_HEADING.match(line.strip()):
                in_list = True
                continue
            if in_list and line.startswith("#"):
                in_list = False
                continue
            if not in_list:
                continue
            match = CHECKBOX_LINE.match(line)
            if not match:
                continue
            body = match.group(1).strip()
            tokens = extract_tokens(body)
            if not tokens:
                continue
            absent = [
                token
                for token in tokens
                if not token_hits_repo(repo, token, skip, version_san)
            ]
            if absent:
                missing.append(
                    {
                        "kind": "visual_checklist",
                        "path": str(guide),
                        "line": index,
                        "tokens": absent,
                        "text": body,
                    }
                )
    return missing


def load_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ProofError(str(exc)) from exc


def run_adhoc(
    repo: Path,
    requirements: Path | None,
    ac_file: Path | None,
    version_san: str | None,
) -> list[dict]:
    if requirements is None and ac_file is None:
        return []
    source = ac_file or requirements
    if source is None:
        return []
    return prove_ac_lines(load_text(source), source, repo, version_san)


def run_issue(repo: Path, ac_file: Path | None, version_san: str | None) -> list[dict]:
    if ac_file is None:
        raise ProofError("--ac-file required for --mode issue")
    return prove_ac_lines(load_text(ac_file), ac_file, repo, version_san)


def run_closure(
    repo: Path, requirements: Path | None, version_san: str | None
) -> list[dict]:
    req = requirements or find_version_file(repo, "requirements.md", version_san)
    missing: list[dict] = []
    if req is not None and req.is_file():
        missing.extend(prove_ac_lines(load_text(req), req, repo, version_san))
    missing.extend(prove_ledger(repo, version_san))
    missing.extend(prove_ui_contract(repo, version_san))
    missing.extend(prove_visual(repo, version_san))
    return missing


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prove AC tokens against the repo")
    parser.add_argument("--mode", choices=("adhoc", "closure", "issue"), required=True)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--version")
    parser.add_argument("--requirements")
    parser.add_argument("--ac-file")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    repo = Path(args.repo).resolve()
    if not repo.is_dir():
        print(json.dumps({"error": f"repo not a directory: {repo}"}), file=sys.stderr)
        return EXIT_SKIP
    requirements = Path(args.requirements).resolve() if args.requirements else None
    ac_file = Path(args.ac_file).resolve() if args.ac_file else None
    try:
        version_san = resolve_version_san(
            repo, args.version, requirements, required=(args.mode == "closure")
        )
        if args.mode == "adhoc":
            missing = run_adhoc(repo, requirements, ac_file, version_san)
        elif args.mode == "issue":
            missing = run_issue(repo, ac_file, version_san)
        else:
            missing = run_closure(repo, requirements, version_san)
    except ProofError as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return EXIT_SKIP
    payload = {"missing": missing, "version_san": version_san}
    print(json.dumps(payload, indent=2))
    return EXIT_REJECTED if missing else EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
