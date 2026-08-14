#!/usr/bin/env bash
# Simulate `npx @nextstage-brasil/harness` against this clone (no npm publish).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="$REPO/packages/harness"
VERSION="$(node -p "require('$HARNESS/package.json').version")"
TGZ="/tmp/nextstage-brasil-harness-${VERSION}.tgz"
PROJECT="${HARNESS_SMOKE_DIR:-/tmp/harness-npx-smoke}"
PRESET="${1:-spec-driven}"

cd "$HARNESS"
npm pack --pack-destination /tmp >/dev/null

rm -rf "$PROJECT"
mkdir -p "$PROJECT"
cd "$PROJECT"
git init -q

echo "== dry-run (same argv as published npx, plus --source) =="
npx --yes --package="$TGZ" harness --preset "$PRESET" --yes --dry-run --source "$REPO"

echo "== install =="
npx --yes --package="$TGZ" harness --preset "$PRESET" --yes --source "$REPO"

echo "== installed skills =="
ls -1 .agents/skills
