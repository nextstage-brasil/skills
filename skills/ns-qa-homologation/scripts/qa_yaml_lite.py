#!/usr/bin/env python3
"""Restricted YAML subset parser for QA profile and plan artifacts. Stdlib only.

Supported subset (everything the QA templates use):

- block mappings and block sequences, space indentation only;
- sequence items that are scalars, one-line flow collections, or block mappings;
- one-line flow lists ``[a, b]`` and flow maps ``{k: v}`` (nestable);
- double/single quoted scalars and plain scalars (null, bool, int, float, str);
- ``#`` comments. A trailing comment whose first word is ``inferred`` (any case,
  e.g. ``# inferred`` / ``# Inferred from config``) marks the key (or sequence
  item) on that line as inferred. A comment mentioning ``inferred`` elsewhere is
  also treated as inferred (fail closed) and reported in ``unclear_inferred``.

Anything else (block scalars, anchors, aliases, tags, multi-line flow,
multi-document markers) raises ``YamlLiteError``. One parser, one behavior:
no PyYAML fallback, so results never depend on the host.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_INFERRED_WORD = re.compile(r"\binferred\b", re.IGNORECASE)
_MARKER = "marker"
_MENTION = "mention"
_KEY_LINE = re.compile(
    r"""^(?P<key>[A-Za-z_][\w.-]*|"[^"]*"|'[^']*')\s*:(?:\s+(?P<value>.*))?$"""
)
_INT_PATTERN = re.compile(r"^[-+]?[0-9]{1,18}$")  # longer digit runs parse as float (int() caps digits)
_FLOAT_PATTERN = re.compile(r"^[-+]?([0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)([eE][-+]?[0-9]+)?$")
_YAML_FENCE_OPEN = re.compile(r"^\s*```\s*ya?ml\s*$", re.IGNORECASE)
_FENCE_CLOSE = re.compile(r"^\s*```\s*$")
_UNSUPPORTED_LEAD = ("|", ">", "&", "*", "!", "%", "@", "`")
_NULL_WORDS = {"null", "Null", "NULL", "~"}
_TRUE_WORDS = {"true", "True", "TRUE"}
_FALSE_WORDS = {"false", "False", "FALSE"}
_DOUBLE_ESCAPES = {'"': '"', "\\": "\\", "/": "/", "n": "\n", "t": "\t"}


class YamlLiteError(ValueError):
    """Input outside the supported subset, or malformed."""

    def __init__(self, message: str, line: int | None = None):
        super().__init__(f"line {line}: {message}" if line else message)


@dataclass(frozen=True)
class _Line:
    number: int
    indent: int
    text: str
    inferred: str | None


@dataclass
class ParseResult:
    data: object
    inferred: list[str] = field(default_factory=list)
    unclear_inferred: list[str] = field(default_factory=list)


def extract_yaml_block(markdown: str) -> str:
    """Return the single fenced ```yaml block of a Markdown document."""
    blocks: list[list[str]] = []
    current: list[str] | None = None
    for raw in markdown.splitlines():
        if current is None:
            if _YAML_FENCE_OPEN.match(raw):
                current = []
            continue
        if _FENCE_CLOSE.match(raw):
            blocks.append(current)
            current = None
            continue
        current.append(raw)
    if current is not None:
        raise YamlLiteError("unterminated ```yaml fence")
    if not blocks:
        raise YamlLiteError("no fenced ```yaml block found")
    if len(blocks) > 1:
        raise YamlLiteError(f"expected exactly one fenced ```yaml block, found {len(blocks)}")
    return "\n".join(blocks[0])


def parse(text: str) -> ParseResult:
    """Parse a YAML-subset document. Inferred paths use dotted notation."""
    parser = _BlockParser(_tokenize(text))
    data = parser.parse()
    return ParseResult(
        data=data,
        inferred=[_dotted(path) for path in parser.inferred],
        unclear_inferred=[_dotted(path) for path in parser.unclear_inferred],
    )


def _dotted(path: tuple) -> str:
    return ".".join(str(part) for part in path)


def _split_comment(raw: str) -> tuple[str, str]:
    quote: str | None = None
    index = 0
    while index < len(raw):
        char = raw[index]
        if quote == '"' and char == "\\":
            index += 2
            continue
        if quote:
            if char == quote:
                quote = None
        elif char in ('"', "'"):
            quote = char
        elif char == "#" and (index == 0 or raw[index - 1] in " \t"):
            return raw[:index].rstrip(), raw[index + 1 :]
        index += 1
    return raw.rstrip(), ""


def _tokenize(text: str) -> list[_Line]:
    lines: list[_Line] = []
    for number, raw in enumerate(text.splitlines(), start=1):
        content, comment = _split_comment(raw)
        if not content.strip():
            continue
        leading = content[: len(content) - len(content.lstrip())]
        if "\t" in leading:
            raise YamlLiteError("tab indentation is not supported", number)
        stripped = content.strip()
        if stripped in ("---", "..."):
            raise YamlLiteError("document markers are not supported", number)
        lines.append(
            _Line(
                number=number,
                indent=len(leading),
                text=stripped,
                inferred=_inferred_kind(comment),
            )
        )
    return lines


def _inferred_kind(comment: str) -> str | None:
    """Marker = first word 'inferred' (any case). Other mention = fail closed."""
    words = comment.split()
    if words and words[0].lower() == "inferred":
        return _MARKER
    return _MENTION if _INFERRED_WORD.search(comment) else None


def _is_sequence_item(text: str) -> bool:
    return text == "-" or text.startswith("- ")


def _unquote_key(token: str) -> str:
    if len(token) >= 2 and token[0] == token[-1] and token[0] in ('"', "'"):
        return token[1:-1]
    return token


class _BlockParser:
    def __init__(self, lines: list[_Line]):
        self.lines = lines
        self.pos = 0
        self.inferred: list[tuple] = []
        self.unclear_inferred: list[tuple] = []

    def _record_inferred(self, line: _Line, path: tuple) -> None:
        if line.inferred:
            self.inferred.append(path)
        if line.inferred == _MENTION:
            self.unclear_inferred.append(path)

    def parse(self) -> object:
        if not self.lines:
            return {}
        node = self._block(self.lines[0].indent, ())
        if self.pos < len(self.lines):
            raise YamlLiteError("unexpected indentation", self.lines[self.pos].number)
        return node

    def _current(self) -> _Line | None:
        return self.lines[self.pos] if self.pos < len(self.lines) else None

    def _block(self, indent: int, path: tuple) -> object:
        line = self.lines[self.pos]
        if _is_sequence_item(line.text):
            return self._sequence(indent, path)
        return self._mapping(indent, path)

    def _mapping(self, indent: int, path: tuple) -> dict:
        result: dict = {}
        while (line := self._current()) is not None and line.indent >= indent:
            if line.indent > indent:
                raise YamlLiteError("unexpected indentation", line.number)
            if _is_sequence_item(line.text):
                raise YamlLiteError("sequence item where a mapping key was expected", line.number)
            match = _KEY_LINE.match(line.text)
            if not match:
                raise YamlLiteError("expected 'key: value'", line.number)
            key = _unquote_key(match.group("key"))
            if key in result:
                raise YamlLiteError(f"duplicate key '{key}'", line.number)
            child = path + (key,)
            value_text = match.group("value")
            self.pos += 1
            if value_text:
                result[key] = _parse_scalar(value_text, line.number)
            else:
                result[key] = self._nested(indent, child)
            self._record_inferred(line, child)
        return result

    def _nested(self, parent_indent: int, path: tuple) -> object:
        line = self._current()
        if line is None:
            return None
        if line.indent > parent_indent:
            return self._block(line.indent, path)
        if line.indent == parent_indent and _is_sequence_item(line.text):
            return self._sequence(parent_indent, path)
        return None

    def _sequence(self, indent: int, path: tuple) -> list:
        items: list = []
        while (line := self._current()) is not None and line.indent >= indent:
            if line.indent > indent:
                raise YamlLiteError("unexpected indentation", line.number)
            if not _is_sequence_item(line.text):
                break
            item_path = path + (len(items),)
            rest = line.text[1:].lstrip()
            if _is_sequence_item(rest):
                raise YamlLiteError("nested compact sequence ('- - x') is not supported", line.number)
            if not rest:
                self.pos += 1
                nxt = self._current()
                items.append(
                    self._block(nxt.indent, item_path) if nxt and nxt.indent > indent else None
                )
            elif _KEY_LINE.match(rest):
                offset = indent + len(line.text) - len(rest)
                self.lines[self.pos] = _Line(line.number, offset, rest, line.inferred)
                items.append(self._mapping(offset, item_path))
            else:
                self.pos += 1
                items.append(_parse_scalar(rest, line.number))
                self._record_inferred(line, item_path)
        return items


def _parse_scalar(text: str, line: int | None = None) -> object:
    """Parse one inline value: flow collection, quoted, or plain scalar."""
    text = text.strip()
    if text.startswith(_UNSUPPORTED_LEAD):
        raise YamlLiteError(f"unsupported YAML construct '{text[0]}'", line)
    if text[0] in "[{\"'":
        return _FlowParser(text, line).parse()
    if ": " in text:
        raise YamlLiteError("plain value contains ': '; quote it", line)
    return _plain(text)


def _plain(text: str) -> object:
    if text in _NULL_WORDS:
        return None
    if text in _TRUE_WORDS:
        return True
    if text in _FALSE_WORDS:
        return False
    if _INT_PATTERN.match(text):
        return int(text)
    if _FLOAT_PATTERN.match(text):
        return float(text)
    return text


class _FlowParser:
    def __init__(self, text: str, line: int | None):
        self.text = text
        self.line = line
        self.index = 0

    def parse(self) -> object:
        value = self._value(",]}")
        self._skip_ws()
        if self.index != len(self.text):
            self._fail("unexpected trailing content")
        return value

    def _fail(self, message: str):
        raise YamlLiteError(message, self.line)

    def _peek(self) -> str:
        return self.text[self.index] if self.index < len(self.text) else ""

    def _skip_ws(self):
        while self._peek() in (" ", "\t"):
            self.index += 1

    def _expect(self, char: str):
        self._skip_ws()
        if self._peek() != char:
            self._fail(f"expected '{char}'")
        self.index += 1

    def _value(self, stops: str) -> object:
        self._skip_ws()
        char = self._peek()
        if char == "[":
            return self._list()
        if char == "{":
            return self._map()
        if char in ('"', "'"):
            return self._quoted()
        return _plain(self._plain_token(stops))

    def _plain_token(self, stops: str) -> str:
        start = self.index
        while self._peek() and self._peek() not in stops:
            self.index += 1
        token = self.text[start : self.index].strip()
        if not token:
            self._fail("empty value in flow collection")
        if token.startswith(_UNSUPPORTED_LEAD):
            self._fail(f"unsupported YAML construct '{token[0]}'")
        if any(char in token for char in "[]{}"):
            self._fail(f"bracket inside plain flow value '{token}'; quote it")
        return token

    def _list(self) -> list:
        self.index += 1
        items: list = []
        self._skip_ws()
        if self._peek() == "]":
            self.index += 1
            return items
        while True:
            items.append(self._value(",]"))
            self._skip_ws()
            char = self._peek()
            self.index += 1
            if char == "]":
                return items
            if char != ",":
                self._fail("expected ',' or ']' in flow list")

    def _map(self) -> dict:
        self.index += 1
        result: dict = {}
        self._skip_ws()
        if self._peek() == "}":
            self.index += 1
            return result
        while True:
            self._skip_ws()
            key = self._quoted() if self._peek() in ('"', "'") else self._plain_token(":,}")
            if not isinstance(key, str):
                self._fail("flow map key must be a string")
            self._expect(":")
            if key in result:
                self._fail(f"duplicate key '{key}'")
            result[key] = self._value(",}")
            self._skip_ws()
            char = self._peek()
            self.index += 1
            if char == "}":
                return result
            if char != ",":
                self._fail("expected ',' or '}' in flow map")

    def _quoted(self) -> str:
        quote = self.text[self.index]
        self.index += 1
        out: list[str] = []
        while self.index < len(self.text):
            char = self.text[self.index]
            if quote == '"' and char == "\\":
                escaped = self.text[self.index + 1 : self.index + 2]
                if escaped not in _DOUBLE_ESCAPES:
                    self._fail(f"unsupported escape '\\{escaped}'")
                out.append(_DOUBLE_ESCAPES[escaped])
                self.index += 2
                continue
            if char == quote:
                if quote == "'" and self.text[self.index + 1 : self.index + 2] == "'":
                    out.append("'")
                    self.index += 2
                    continue
                self.index += 1
                return "".join(out)
            out.append(char)
            self.index += 1
        self._fail("unterminated quoted string")
        return ""
