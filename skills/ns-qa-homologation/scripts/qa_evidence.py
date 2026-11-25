#!/usr/bin/env python3
"""Evidence hygiene for ns-qa-homologation (ADR-19). Stdlib only.

Commands:
  add     copy one capture into RUN_DIR/evidence/ as S-<n>-<seq>-<slug>.<ext>,
          hash it, record pii_scrubbed (screenshots), optionally append it to the ledger
  verify  evidence/ holds only normalized regular files, each cited by the ledger
          with a matching sha256
  index   verify, then write evidence/index.md (file, scenario, ACs, kind, sha256, PII, publishable)

PII is masked in the DOM before capture using the profile's evidence.pii_fields
selectors (no OCR): `add` sets pii_scrubbed true only when every configured
selector is listed in --pii-masked; it never inspects pixels.

Usage:
  qa_evidence.py add --run-dir D --profile P --scenario S-<n> --kind K --file SRC --label TEXT
                     [--pii-masked SELECTOR]... [--ledger D/qa-ledger.json]
  qa_evidence.py verify --run-dir D --ledger D/qa-ledger.json
  qa_evidence.py index  --run-dir D --ledger D/qa-ledger.json

Exit codes (same contract as qa_gate.py; 1 never returned by design):
  0  done
  2  rejected: unsafe name/path/symlink, content not matching its kind, kind outside
     evidence.capture, unnormalized or unreferenced file, hash mismatch, ledger invalid
  3  invalid input: unreadable file, invalid profile/JSON, bad usage
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "evidence", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qa_common import (  # noqa: E402
    CAPTURE_EXTENSIONS,
    CAPTURE_PATH,
    ID_DIGITS,
    InvalidInput,
    Rejected,
    evidence_file_problem,
    evidence_path_problem,
    id_key,
    write_text_atomic,
)
from qa_ledger_rules import load_valid_ledger  # noqa: E402
from qa_profile_rules import load_valid_profile  # noqa: E402
from qa_schema_lite import SchemaLiteError, load_schema  # noqa: E402

EXIT_OK = 0
EXIT_REJECTED = 2
EXIT_INVALID = 3
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
_EVIDENCE_DIR = "evidence"
_INDEX_FILE = "index.md"
_MAX_CAPTURE_BYTES = 256 * 1024 * 1024
_MAX_SLUG = 40
_SCENARIO_ID = re.compile(rf"^S-{ID_DIGITS}$")
_UNSAFE_LABEL = re.compile(r"[/\\\x00-\x1f\x7f]|\.\.")
_DEFAULT_CAPTURE = tuple(CAPTURE_EXTENSIONS)
_TEXT_EXTENSIONS = {"log", "txt", "json", "har"}
_JSON_EXTENSIONS = {"json", "har"}


def _has_magic(extension: str, head: bytes) -> bool:
    signatures = {
        "png": lambda: head.startswith(b"\x89PNG\r\n\x1a\n"),
        "jpg": lambda: head.startswith(b"\xff\xd8\xff"),
        "jpeg": lambda: head.startswith(b"\xff\xd8\xff"),
        "webp": lambda: head[:4] == b"RIFF" and head[8:12] == b"WEBP",
        "mp4": lambda: head[4:8] == b"ftyp",
        "webm": lambda: head.startswith(b"\x1a\x45\xdf\xa3"),
    }
    return signatures[extension]()


def _check_content(extension: str, data: bytes, label: str) -> None:
    """Content must match the declared kind: binary magic, or UTF-8 text without NUL (JSON parses)."""
    if extension not in _TEXT_EXTENSIONS:
        if not _has_magic(extension, data[:16]):
            raise Rejected(f"{label}: content is not a .{extension} file")
        return
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise Rejected(f"{label}: not UTF-8 text ({exc.reason})") from exc
    if "\x00" in text:
        raise Rejected(f"{label}: NUL byte in text capture")
    if extension in _JSON_EXTENSIONS:
        try:
            json.loads(text)
        except ValueError as exc:
            raise Rejected(f"{label}: invalid JSON ({exc})") from exc
        except RecursionError as exc:
            raise Rejected(f"{label}: invalid JSON (nesting too deep)") from exc


def _slugify(label: str) -> str:
    if not label or _UNSAFE_LABEL.search(label):
        raise Rejected(f"--label {label!r}: empty, path separator, '..' or control character refused")
    slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:_MAX_SLUG].strip("-")
    if not slug:
        raise Rejected(f"--label {label!r}: no [a-z0-9] character to build a name")
    return slug


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class _RunDir:
    """Run dir + its evidence dir, both real directories (never symlinks)."""

    root: Path
    evidence: Path

    @classmethod
    def open(cls, value: str, create_evidence: bool) -> "_RunDir":
        root = Path(value)
        if root.is_symlink() or not root.is_dir():
            raise InvalidInput(f"--run-dir {value}: not a directory (symlinks refused)")
        evidence = root / _EVIDENCE_DIR
        if evidence.is_symlink():
            raise Rejected(f"{_EVIDENCE_DIR}/ is a symlink: refused")
        if create_evidence:
            evidence.mkdir(exist_ok=True)
        elif not evidence.is_dir():
            raise InvalidInput(f"{_EVIDENCE_DIR}/ not found in {value}")
        return cls(root=root, evidence=evidence)

    def next_seq(self, scenario_id: str) -> int:
        used = [
            int(match.group(2))
            for name in os.listdir(self.evidence)
            for match in [CAPTURE_PATH.match(f"{_EVIDENCE_DIR}/{name}")]
            if match and match.group(1) == scenario_id
        ]
        return max(used, default=0) + 1


class _Ledger:
    """qa-ledger.json of this run dir (schema-valid); writes atomically."""

    def __init__(self, value: str, run_dir: _RunDir):
        self.path = Path(value)
        if self.path.resolve().parent != run_dir.root.resolve():
            raise InvalidInput(f"--ledger {value}: must live in --run-dir (evidence paths are relative to it)")
        self.data = load_valid_ledger(self.path, load_schema(TEMPLATES / "qa-ledger.schema.json"))

    def scenario(self, scenario_id: str) -> dict:
        found = next((item for item in self.data["scenarios"] if item["id"] == scenario_id), None)
        if found is None:
            raise Rejected(f"scenario {scenario_id} not in ledger")
        return found

    def save(self) -> None:
        write_text_atomic(self.path, json.dumps(self.data, indent=2) + "\n")


@dataclass(frozen=True)
class _EvidencePolicy:
    """Profile `evidence` values the capture rules depend on (profile validated like Q0)."""

    capture: tuple[str, ...]
    pii_fields: tuple[str, ...]

    @classmethod
    def from_profile(cls, value: str) -> "_EvidencePolicy":
        profile = load_valid_profile(Path(value), Path.cwd(), load_schema(TEMPLATES / "qa-profile.schema.json"))
        evidence = profile["evidence"]
        return cls(
            capture=tuple(evidence.get("capture", _DEFAULT_CAPTURE)),
            pii_fields=tuple(evidence.get("pii_fields", [])),
        )


def _read_source(value: str, kind: str) -> tuple[bytes, str]:
    source = Path(value)
    if source.is_symlink():
        raise Rejected(f"--file {value}: symlinks refused")
    if not source.is_file():
        raise InvalidInput(f"--file {value}: not a regular file")
    extension = source.suffix.lower().lstrip(".")
    if extension not in CAPTURE_EXTENSIONS[kind]:
        raise Rejected(f"--file {value}: .{extension} not allowed for {kind} ({', '.join(CAPTURE_EXTENSIONS[kind])})")
    try:
        if source.stat().st_size > _MAX_CAPTURE_BYTES:
            raise Rejected(f"--file {value}: larger than {_MAX_CAPTURE_BYTES} bytes")
        data = source.read_bytes()
    except OSError as exc:
        raise InvalidInput(f"--file {value}: {exc.strerror or exc}") from exc
    _check_content(extension, data, f"--file {value}")
    return data, extension


def _pii_state(kind: str, policy: _EvidencePolicy, masked: list[str]) -> tuple[bool | None, list[str]]:
    if kind != "screenshot":
        if masked:
            raise InvalidInput("--pii-masked applies to screenshots only (DOM masking before capture)")
        return None, []
    unmasked = [selector for selector in policy.pii_fields if selector not in masked]
    return not unmasked, unmasked


def _store(run_dir: _RunDir, scenario_id: str, slug: str, extension: str, kind: str, data: bytes) -> str:
    relative = f"{_EVIDENCE_DIR}/{scenario_id}-{run_dir.next_seq(scenario_id):02d}-{slug}.{extension}"
    problem = evidence_path_problem(kind, relative, scenario_id)
    if problem:
        raise Rejected(problem)
    target = run_dir.root / relative
    try:
        with open(target, "xb") as stream:  # O_EXCL: never overwrites, never follows a planted symlink
            stream.write(data)
    except FileExistsError as exc:
        raise Rejected(f"{relative} already exists") from exc
    return relative


def _command_add(args: argparse.Namespace) -> dict:
    if not _SCENARIO_ID.match(args.scenario):
        raise InvalidInput(f"--scenario {args.scenario!r} is not S-<n>")
    policy = _EvidencePolicy.from_profile(args.profile)
    if args.kind not in policy.capture:
        raise Rejected(f"--kind {args.kind}: evidence.capture excludes it")
    pii_scrubbed, unmasked = _pii_state(args.kind, policy, args.pii_masked)
    slug = _slugify(args.label)
    run_dir = _RunDir.open(args.run_dir, create_evidence=True)
    ledger = _Ledger(args.ledger, run_dir) if args.ledger else None
    scenario = ledger.scenario(args.scenario) if ledger else None
    data, extension = _read_source(args.file, args.kind)
    relative = _store(run_dir, args.scenario, slug, extension, args.kind, data)
    entry = {"kind": args.kind, "path": relative, "sha256": _sha256(data)}
    if pii_scrubbed is not None:
        entry["pii_scrubbed"] = pii_scrubbed
    if scenario is not None:
        scenario["evidence"].append(entry)
        ledger.save()
    return {"command": "add", **entry, "pii_unmasked": unmasked, "ledger_updated": scenario is not None}


def _scan_evidence_dir(run_dir: _RunDir) -> tuple[set[str], list[str]]:
    files, errors = set(), []
    with os.scandir(run_dir.evidence) as entries:
        for item in entries:
            relative = f"{_EVIDENCE_DIR}/{item.name}"
            if item.name == _INDEX_FILE and item.is_file(follow_symlinks=False):
                continue
            if item.is_symlink():
                errors.append(f"{relative}: symlink refused")
            elif not item.is_file(follow_symlinks=False):
                errors.append(f"{relative}: not a regular file")
            elif not CAPTURE_PATH.match(relative):
                errors.append(f"{relative}: unnormalized name (use qa_evidence.py add)")
            else:
                files.add(relative)
    return files, errors


def _ledger_entries(ledger: _Ledger) -> list[tuple[dict, dict]]:
    return [(scenario, entry) for scenario in ledger.data["scenarios"] for entry in scenario["evidence"]]


def _entry_problem(run_dir: _RunDir, scenario: dict, entry: dict) -> str | None:
    problem = evidence_path_problem(entry["kind"], entry["path"], scenario["id"])
    if problem:
        return problem
    return evidence_file_problem(run_dir.root, entry["path"], entry["sha256"])


def _verify(run_dir: _RunDir, ledger: _Ledger) -> list[str]:
    files, errors = _scan_evidence_dir(run_dir)
    entries = _ledger_entries(ledger)
    cited = {entry["path"] for _, entry in entries}
    errors.extend(f"{path}: not referenced by the ledger" for path in sorted(files - cited))
    errors.extend(
        f"/scenarios/{scenario['id']}/evidence: {problem}"
        for scenario, entry in entries
        for problem in [_entry_problem(run_dir, scenario, entry)]
        if problem
    )
    return errors


def _publishable(kind: str, pii_scrubbed: bool | None) -> str:
    if kind == "screenshot" and not pii_scrubbed:
        return "no (PII not masked)"
    return "yes"


def _render_index(ledger: _Ledger) -> str:
    rows: dict[str, dict] = {}
    for scenario, entry in _ledger_entries(ledger):
        row = rows.setdefault(entry["path"], {"entry": entry, "scenarios": set(), "covers": set()})
        row["scenarios"].add(scenario["id"])
        row["covers"].update(scenario["covers"])
    lines = [
        f"# Evidence index — run {ledger.data['run_id']}",
        "",
        "Generated by `qa_evidence.py index`. Paths relative to the run dir.",
        "",
        "| File | Scenarios | ACs | Kind | SHA-256 | PII masked | Publishable |",
        "| ---- | --------- | --- | ---- | ------- | ---------- | ----------- |",
    ]
    for path in sorted(rows):
        row, entry = rows[path], rows[path]["entry"]
        pii = entry.get("pii_scrubbed")
        lines.append(
            "| {path} | {scenarios} | {covers} | {kind} | `{sha}` | {pii} | {publishable} |".format(
                path=path,
                scenarios=", ".join(sorted(row["scenarios"], key=id_key)),
                covers=", ".join(sorted(row["covers"], key=id_key)),
                kind=entry["kind"],
                sha=entry["sha256"],
                pii="n/a" if pii is None else ("yes" if pii else "no"),
                publishable=_publishable(entry["kind"], pii),
            )
        )
    return "\n".join(lines) + "\n"


def _command_verify(args: argparse.Namespace) -> dict:
    run_dir = _RunDir.open(args.run_dir, create_evidence=False)
    errors = _verify(run_dir, _Ledger(args.ledger, run_dir))
    if errors:
        raise Rejected(*errors)
    return {"command": "verify"}


def _command_index(args: argparse.Namespace) -> dict:
    run_dir = _RunDir.open(args.run_dir, create_evidence=False)
    ledger = _Ledger(args.ledger, run_dir)
    errors = _verify(run_dir, ledger)
    if errors:
        raise Rejected(*errors)
    # _verify already refused a symlinked index.md; os.replace swaps the entry, never follows it.
    write_text_atomic(run_dir.evidence / _INDEX_FILE, _render_index(ledger))
    return {"command": "index", "path": f"{_EVIDENCE_DIR}/{_INDEX_FILE}"}


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "evidence", **payload}, indent=2))


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = _Parser(description="ns-qa-homologation evidence hygiene")
    commands = parser.add_subparsers(dest="command", required=True, parser_class=_Parser)
    add = commands.add_parser("add", help="normalize, hash and record one capture")
    add.add_argument("--run-dir", required=True)
    add.add_argument("--profile", required=True, metavar="PROFILE_MD")
    add.add_argument("--scenario", required=True, metavar="S-N")
    add.add_argument("--kind", required=True, choices=sorted(CAPTURE_EXTENSIONS))
    add.add_argument("--file", required=True, metavar="SOURCE")
    add.add_argument("--label", required=True, help="short description; becomes the name slug")
    add.add_argument("--pii-masked", action="append", default=[], metavar="SELECTOR",
                     help="profile evidence.pii_fields selector masked in the DOM before capture (repeat)")
    add.add_argument("--ledger", metavar="QA_LEDGER_JSON", help="append the entry to this scenario's evidence")
    checks = (("verify", "check evidence/ against the ledger"), ("index", "verify, then write evidence/index.md"))
    for name, help_text in checks:
        sub = commands.add_parser(name, help=help_text)
        sub.add_argument("--run-dir", required=True)
        sub.add_argument("--ledger", required=True, metavar="QA_LEDGER_JSON")
    return parser.parse_args(argv)


_COMMANDS = {"add": _command_add, "verify": _command_verify, "index": _command_index}


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    try:
        payload, code = {"ok": True, "errors": [], **_COMMANDS[args.command](args)}, EXIT_OK
    except Rejected as exc:
        payload, code = {"ok": False, "errors": exc.errors}, EXIT_REJECTED
    except InvalidInput as exc:
        payload, code = {"ok": False, "errors": exc.errors}, EXIT_INVALID
    except SchemaLiteError as exc:
        payload, code = {"ok": False, "errors": [f"bundled schema unsupported: {exc}"]}, EXIT_INVALID
    _emit(payload)
    return code


if __name__ == "__main__":
    sys.exit(main())
