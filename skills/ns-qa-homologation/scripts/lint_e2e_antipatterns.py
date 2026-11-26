#!/usr/bin/env python3
"""Generic E2E spec antipattern linter (Cypress + Playwright) for ns-qa-homologation Q8. Stdlib only.

Review gate input (ADR-18): every finding blocks approval. Comments are ignored; string contents are
ignored except where a rule reads them (selector literals, the uncaught:exception event name).
Spec-only rules (raw-selector, spec-intercept, cypress-env, focused-or-skipped) apply to spec files
(*.cy.*, *.spec.*, *.test.*); support files, page objects and fixtures get the remaining rules.
Approximation: JavaScript regex literals are not tokenized (a '//' inside one starts a comment).

Usage:
  lint_e2e_antipatterns.py --root DIR [--config JSON] [--forbid-spec-intercepts] SPEC [SPEC...]
  SPEC = path relative to DIR. Config default: DIR/.e2e-antipatterns.json when present
  (the E2E repo's own override; keys: version, disable, forbidden_selectors, forbid_spec_intercepts).

Exit codes (1 never returned by design):
  0  no finding
  2  findings (JSON "findings": file, line, location file:line, rule, match, message)
  3  invalid input: path outside DIR / symlink / unreadable / not UTF-8 / too large, bad config, bad usage
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath

MIN_PYTHON = (3, 9)
if sys.version_info < MIN_PYTHON:
    print(json.dumps({"mode": "lint_e2e", "ok": False, "errors": ["python >= 3.9 required"]}))
    sys.exit(3)

EXIT_OK = 0
EXIT_FINDINGS = 2
EXIT_INVALID = 3
CONFIG_NAME = ".e2e-antipatterns.json"
CONFIG_VERSION = 1
MAX_SPEC_BYTES = 1024 * 1024
MAX_SELECTOR_RULES = 50
MAX_SELECTOR_RULE_CHARS = 200

RULES = {
    "raw-selector": "CSS/XPath selector in a locator call: use role, label, text or test id",
    "fixed-wait": "fixed time wait: wait for an element, request alias or assertion instead",
    "force-action": "force: true skips actionability checks and hides real UI defects",
    "cypress-env": "Cypress.env( inside a spec: read config/secrets through support code",
    "spec-intercept": "network intercept/route declared in a spec: move it to support code (profile/config forbids)",
    "focused-or-skipped": "focused or skipped test (.only / .skip / .fixme / x- / f- prefix)",
    "uncaught-exception": "uncaught:exception handler suppresses application errors",
}
OPTIONAL_RULES = ("spec-intercept",)  # on only when the profile or the repo config forbids spec intercepts
SPEC_ONLY_RULES = ("raw-selector", "spec-intercept", "cypress-env", "focused-or-skipped")
_SPEC_FILE = re.compile(r"\.(?:cy|spec|test)\.[A-Za-z0-9]+$")
# Selector literal shapes. _OUTSIDE scans a selector skipping [...] groups (attribute values are never judged).
_OUTSIDE = r"(?:[^\[]|\[[^\]]*\])*?"
_NOT_ENGINE = r"(?!\s*(?:@|(?:text|role|label|placeholder|title|alt|id|testid|data-testid|data-test|data-cy)\s*=))"
# Default forbidden selector shapes (re.search on the selector literal); repo config may replace the list.
DEFAULT_FORBIDDEN_SELECTORS = (
    rf"^{_NOT_ENGINE}(?:[^\[.#]|\[[^\]]*\])*[.#][A-Za-z_-]",        # class / id selector, leading or compound
    rf"^{_NOT_ENGINE}\s*(?:[^\[\s]|\[[^\]]*\]|\s+(?![A-Za-z*.#:]))*(?<=\S)\s+[A-Za-z*.#:]",  # descendant combinator
    r"(?<!>)>(?!>)(?![^\[]*\])",                                     # child combinator (not Playwright >>, not in [attr])
    rf"^{_OUTSIDE}:(?:first|last|eq|gt|lt|even|odd|contains)(?![\w-])",  # jQuery pseudo outside [...]
    r":(?:nth-[a-z-]+|first-child|last-child|first-of-type|last-of-type|only-child)",
    r"^\s*\(*\s*/{1,2}",              # xpath
    r"^\s*xpath\s*=",                 # playwright xpath engine
    r"^\s*css\s*=",                   # playwright explicit css engine
    r"\[\s*(?:class|id|style)\s*[~|^$*]?=",
)
# Locator calls whose first argument is a selector literal.
_LOCATOR_CALL = re.compile(
    r"(?:\bcy\s*\.\s*get|\.\s*(?:find|locator|waitForSelector|\$\$?|\$\$?eval))\s*\(\s*(['\"`])")
_XPATH_CALL = re.compile(r"\bcy\s*\.\s*xpath\s*\(")  # any cy.xpath( call: XPath by definition
# force only matters on action calls (cy.task('x', { force: true }) is not an action).
_ACTIONS = ("click|dblclick|rightclick|type|clear|check|uncheck|select|selectOption|trigger|fill|hover|tap|dragTo|"
            "setChecked|setInputFiles")
_ACTION_ARGS = r"\.\s*(?:%s)\s*\((?:[^()]|\([^()]*\))*?" % _ACTIONS
_CODE_RULES = {
    "fixed-wait": re.compile(r"\bcy\s*\.\s*wait\s*\(\s*[0-9.]|\.\s*waitForTimeout\s*\("),
    "force-action": re.compile(_ACTION_ARGS + r"(?P<hit>\bforce\s*:\s*true\b)"),
    "cypress-env": re.compile(r"\bCypress\s*\.\s*env\s*\("),
    "spec-intercept": re.compile(
        r"\bcy\s*\.\s*intercept\s*\(|\b(?:page|context|browserContext)\s*\.\s*route(?:FromHAR)?\s*\("),
    "focused-or-skipped": re.compile(
        r"\b(?:describe|context|it|specify|test)(?:\s*\.\s*(?:describe|serial|parallel))?\s*\.\s*(?:only|skip|fixme)\s*\("
        r"|(?<![.\w$])(?:xit|xdescribe|xcontext|xspecify|fit|fdescribe)\s*\("),
}
# Rules read on the comment-free view with strings intact (event names, quoted object keys).
_FULL_RULES = {
    "force-action": re.compile(_ACTION_ARGS + r"(?P<hit>(['\"`])force\2\s*:\s*true\b)"),
    "uncaught-exception": re.compile(r"\bon\s*\(\s*(['\"`])uncaught:exception\1"),
}
_SAFE_RELATIVE = re.compile(r"^[A-Za-z0-9._@+][A-Za-z0-9._/@+-]*$")


class LintInputError(ValueError):
    """Input the linter cannot evaluate (exit 3)."""


@dataclass(frozen=True)
class LintConfig:
    disabled: frozenset = frozenset()
    forbidden_selectors: tuple = DEFAULT_FORBIDDEN_SELECTORS
    forbid_spec_intercepts: bool = False
    source: str | None = None

    def enabled(self, flag_intercepts: bool) -> tuple[str, ...]:
        forbid = flag_intercepts or self.forbid_spec_intercepts
        return tuple(rule for rule in RULES
                     if rule not in self.disabled and (rule not in OPTIONAL_RULES or forbid))


def _selector_rules(value: object) -> tuple:
    if not isinstance(value, list) or not 1 <= len(value) <= MAX_SELECTOR_RULES:
        raise LintInputError(f"config forbidden_selectors: list of 1-{MAX_SELECTOR_RULES} regexes")
    for item in value:
        if not isinstance(item, str) or not 1 <= len(item) <= MAX_SELECTOR_RULE_CHARS:
            raise LintInputError(f"config forbidden_selectors: each 1-{MAX_SELECTOR_RULE_CHARS} chars")
        try:
            re.compile(item)
        except re.error as exc:
            raise LintInputError(f"config forbidden_selectors: {item!r} is not a regex ({exc})") from exc
    return tuple(value)


def parse_config(raw: object, source: str) -> LintConfig:
    if not isinstance(raw, dict):
        raise LintInputError("config must be a JSON object")
    unknown = sorted(set(raw) - {"version", "disable", "forbidden_selectors", "forbid_spec_intercepts"})
    if unknown:
        raise LintInputError(f"config unknown key(s): {', '.join(unknown)}")
    if raw.get("version") != CONFIG_VERSION:
        raise LintInputError(f"config version must be {CONFIG_VERSION}")
    disable = raw.get("disable", [])
    if not isinstance(disable, list) or any(rule not in RULES for rule in disable):
        raise LintInputError(f"config disable: list of rule ids ({', '.join(RULES)})")
    forbid = raw.get("forbid_spec_intercepts", False)
    if not isinstance(forbid, bool):
        raise LintInputError("config forbid_spec_intercepts must be true or false")
    selectors = _selector_rules(raw["forbidden_selectors"]) if "forbidden_selectors" in raw else DEFAULT_FORBIDDEN_SELECTORS
    return LintConfig(frozenset(disable), selectors, forbid, source)


def load_config(root: Path, explicit: str | None) -> LintConfig:
    path = Path(explicit) if explicit else root / CONFIG_NAME
    if explicit is None and not path.exists():
        return LintConfig()
    if path.is_symlink():
        raise LintInputError(f"config {path}: symlink refused")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise LintInputError(f"config {path}: {exc.strerror or exc}") from exc
    except (UnicodeDecodeError, ValueError, RecursionError) as exc:
        raise LintInputError(f"config {path}: invalid JSON ({exc})") from exc
    return parse_config(raw, str(path))


def _views(text: str) -> tuple[str, str]:
    """Same-length views: `full` (comments blanked) and `code` (comments + string contents blanked)."""
    full, code = list(text), list(text)

    def blank(view: list, start: int, end: int) -> None:
        for index in range(start, end):
            if view[index] != "\n":
                view[index] = " "

    index, length = 0, len(text)
    while index < length:
        char, pair = text[index], text[index:index + 2]
        if pair in ("//", "/*"):
            end = text.find("\n" if pair == "//" else "*/", index + 2)
            end = length if end < 0 else end + (0 if pair == "//" else 2)
            blank(full, index, end)
            blank(code, index, end)
            index = end
        elif char in "'\"`":
            end = index + 1
            while end < length and text[end] != char and (char == "`" or text[end] != "\n"):
                end += 2 if text[end] == "\\" else 1
            blank(code, index + 1, min(end, length))
            index = end + 1
        else:
            index += 1
    return "".join(full), "".join(code)


@dataclass
class _FileLint:
    path: str
    text: str
    config: LintConfig
    enabled: tuple[str, ...]
    findings: list[dict] = field(default_factory=list)

    def _applies(self, rule: str) -> bool:
        return rule in self.enabled and (rule not in SPEC_ONLY_RULES or bool(_SPEC_FILE.search(self.path)))

    def run(self) -> list[dict]:
        full, code = _views(self.text)
        for rules, view in ((_CODE_RULES, code), (_FULL_RULES, full)):
            for rule, pattern in rules.items():
                if self._applies(rule):
                    for match in pattern.finditer(view):
                        hit = match.group("hit") if "hit" in pattern.groupindex else match.group(0)
                        start = match.start("hit") if "hit" in pattern.groupindex else match.start()
                        self._add(rule, start, hit)
        if self._applies("raw-selector"):
            self._selectors(full, code)
        return sorted(self.findings, key=lambda item: (item["line"], item["rule"]))

    def _selectors(self, full: str, code: str) -> None:
        for match in _XPATH_CALL.finditer(code):
            self._add("raw-selector", match.start(), match.group(0))
        for match in _LOCATOR_CALL.finditer(code):
            quote, start = match.group(1), match.end()
            end = full.find(quote, start)
            literal = full[start:end if end >= 0 else len(full)]
            if any(re.search(pattern, literal) for pattern in self.config.forbidden_selectors):
                self._add("raw-selector", match.start(), f"{match.group(0)}{literal}{quote}")

    def _add(self, rule: str, offset: int, matched: str) -> None:
        line = self.text.count("\n", 0, offset) + 1
        self.findings.append({"file": self.path, "line": line, "location": f"{self.path}:{line}", "rule": rule,
                              "match": " ".join(matched.split())[:120], "message": RULES[rule]})


def read_spec(root: Path, relative: str) -> str:
    """Spec confined to root: relative, no '..', no symlink on any component, regular UTF-8 file <= 1 MiB."""
    parts = PurePosixPath(relative)
    if not _SAFE_RELATIVE.match(relative) or parts.is_absolute() or ".." in parts.parts:
        raise LintInputError(f"spec {relative!r} must be a path relative to --root (no '..', no leading '/' or '-')")
    target = root
    for part in parts.parts:
        target = target / part
        if target.is_symlink():
            raise LintInputError(f"spec {relative}: symlink refused")
    if not target.is_file():
        raise LintInputError(f"spec {relative}: not a regular file")
    try:
        if target.stat().st_size > MAX_SPEC_BYTES:
            raise LintInputError(f"spec {relative}: larger than {MAX_SPEC_BYTES} bytes")
        return target.read_bytes().decode("utf-8")
    except OSError as exc:
        raise LintInputError(f"spec {relative}: {exc.strerror or exc}") from exc
    except UnicodeDecodeError as exc:
        raise LintInputError(f"spec {relative}: not UTF-8 ({exc.reason})") from exc


def lint_files(root: Path, specs: list[str], config: LintConfig, forbid_spec_intercepts: bool) -> dict:
    """Findings for every spec (raises LintInputError). Used by qa_automation.py record-review."""
    if not root.is_dir() or root.is_symlink():
        raise LintInputError(f"--root {root}: not a directory (symlink refused)")
    if len(set(specs)) != len(specs):
        raise LintInputError("spec listed twice")
    enabled = config.enabled(forbid_spec_intercepts)
    findings = []
    for relative in specs:
        findings += _FileLint(relative, read_spec(root, relative), config, enabled).run()
    return {"ok": not findings, "errors": [], "findings": findings, "rules": list(enabled), "config": config.source}


class _Parser(argparse.ArgumentParser):
    def error(self, message: str):
        _emit({"ok": False, "errors": [f"usage: {message}"]})
        sys.exit(EXIT_INVALID)


def _emit(payload: dict) -> None:
    print(json.dumps({"mode": "lint_e2e", **payload}, indent=2, ensure_ascii=False))


def main(argv: list[str] | None = None) -> int:
    parser = _Parser(description="E2E spec antipattern linter (Cypress + Playwright)")
    parser.add_argument("--root", required=True, metavar="DIR")
    parser.add_argument("--config", metavar="JSON", help=f"default: DIR/{CONFIG_NAME} when present")
    parser.add_argument("--forbid-spec-intercepts", action="store_true")
    parser.add_argument("specs", nargs="+", metavar="SPEC")
    args = parser.parse_args(argv if argv is not None else sys.argv[1:])
    root = Path(args.root)
    try:
        result = lint_files(root, args.specs, load_config(root, args.config), args.forbid_spec_intercepts)
    except LintInputError as exc:
        _emit({"ok": False, "errors": [str(exc)]})
        return EXIT_INVALID
    _emit(result)
    return EXIT_OK if result["ok"] else EXIT_FINDINGS


if __name__ == "__main__":
    sys.exit(main())
