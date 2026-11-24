#!/usr/bin/env python3
"""Helpers shared by the qa_gate rule modules. Stdlib only."""

from __future__ import annotations


def find_duplicates(ids: list[str]) -> list[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for item in ids:
        (duplicates if item in seen else seen).add(item)
    return sorted(duplicates)
