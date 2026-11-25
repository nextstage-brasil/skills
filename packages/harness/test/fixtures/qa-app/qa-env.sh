#!/usr/bin/env bash
# Fake qa-env for CI (ADR: skill evaluation with a fake environment). Offline: no network, no docker.
# Implements the ns-qa-homologation qa-env contract (skills/ns-qa-homologation/references/qa-env-contract.md)
# by simulating resources as files under $QA_APP_STATE_DIR/<kind>/<id>.
set -euo pipefail

STATE_DIR="${QA_APP_STATE_DIR:?QA_APP_STATE_DIR is required}"
APP_URL="file://$(cd "$(dirname "$0")" && pwd)/index.html"
COMMAND="${1:-}"
shift || true
RUN_ID="" REF="" PREFIX="" MANIFEST=""
SELECTED=()
while [ $# -gt 0 ]; do
  case $1 in
    --run) RUN_ID=$2; shift 2 ;;
    --ref) REF=$2; shift 2 ;;
    --prefix) PREFIX=$2; shift 2 ;;
    --manifest) MANIFEST=$2; shift 2 ;;
    --resource) SELECTED+=("$2"); shift 2 ;;
    *) echo "usage error: $1" >&2; exit 2 ;;
  esac
done
[[ $RUN_ID =~ ^[0-9]+-[0-9]{8}T[0-9]{4}Z$ ]] || { echo "usage error: --run" >&2; exit 2; }
NS="qa-$(printf '%s' "$RUN_ID" | tr '[:upper:]' '[:lower:]')"
RESOURCES=("container/$NS-web-1" "volume/${NS}_data" "image/$NS-web:latest")

envelope() { printf '{"contract_version":1,"command":"%s","run_id":"%s","ok":%s,"error":%s' "$COMMAND" "$RUN_ID" "$1" "$2"; }
resource_json() { printf '{"kind":"%s","id":"%s"}' "${1%%/*}" "${1#*/}"; }
join() { local IFS=,; printf '[%s]' "$*"; }
existing_resources() {
  local item out=()
  for item in "${RESOURCES[@]}"; do
    if [ -e "$STATE_DIR/$item" ]; then out+=("$(resource_json "$item")"); fi
  done
  join ${out[@]+"${out[@]}"}
}
urls() { printf '[{"name":"app","url":"%s"}]' "$APP_URL"; }
commit() { cat "$STATE_DIR/deployed-$NS"; }
data() {
  printf '[{"entity":"customer","ref":"%s%s","data_source":"real"},{"entity":"invoice","ref":"%s%s-1","data_source":"db_fixture"}]' \
    "$PREFIX" "$RUN_ID" "$PREFIX" "$RUN_ID"
}

case $COMMAND in
  up)
    [[ $REF =~ ^[0-9a-f]{7,40}$ ]] || { echo "usage error: --ref must be a commit" >&2; exit 2; }
    for item in "${RESOURCES[@]}"; do mkdir -p "$STATE_DIR/${item%%/*}"; : >"$STATE_DIR/$item"; done
    printf '%s' "$REF" >"$STATE_DIR/deployed-$NS"
    envelope true null; printf ',"urls":%s,"commit":"%s","created_resources":%s}\n' "$(urls)" "$REF" "$(existing_resources)"
    ;;
  health)
    if [ -e "$STATE_DIR/container/$NS-web-1" ]; then
      envelope true null; printf ',"checks":[{"name":"%s-web-1","ok":true,"detail":"running"}]}\n' "$NS"
    else
      envelope false '"web container missing"'; printf ',"checks":[{"name":"%s-web-1","ok":false,"detail":"missing"}]}\n' "$NS"
      exit 1
    fi
    ;;
  seed)
    [ -n "$PREFIX" ] || exit 2
    envelope true null; printf ',"data":%s}\n' "$(data)"
    ;;
  reset)
    [ -n "$PREFIX" ] || exit 2
    envelope true null; printf ',"data":%s,"created_resources":%s}\n' "$(data)" "$(existing_resources)"
    ;;
  info)
    envelope true null; printf ',"urls":%s,"commit":"%s"}\n' "$(urls)" "$(commit)"
    ;;
  down)
    [ -f "$MANIFEST" ] || exit 2
    mapfile -t LISTED < <(python3 - "$MANIFEST" "$RUN_ID" <<'PY'
import json, sys
order = ["container", "volume", "database", "image", "worktree"]
run = json.load(open(sys.argv[1], encoding="utf-8"))
if run["run_id"] != sys.argv[2]:
    sys.exit(3)
items = [r for r in run["created_resources"] if r["via"] == "qa-env"]
for r in sorted(items, key=lambda r: order.index(r["kind"])):
    print(f"{r['kind']}/{r['id']}")
PY
)
    TARGETS=()
    if [ ${#SELECTED[@]} -eq 0 ]; then TARGETS=(${LISTED[@]+"${LISTED[@]}"}); fi
    for wanted in ${SELECTED[@]+"${SELECTED[@]}"}; do
      wanted="${wanted%%:*}/${wanted#*:}"
      found=0
      for item in ${LISTED[@]+"${LISTED[@]}"}; do if [ "$item" = "$wanted" ]; then found=1; fi; done
      if [ "$found" -eq 0 ]; then
        envelope false "\"${wanted/\//:} not in run.json\""; printf ',"removed":[],"failed":null,"skipped":[]}\n'
        exit 2
      fi
      TARGETS+=("$wanted")
    done
    REMOVED=()
    for item in ${TARGETS[@]+"${TARGETS[@]}"}; do rm -f "$STATE_DIR/$item"; REMOVED+=("$(resource_json "$item")"); done
    envelope true null; printf ',"removed":%s,"failed":null,"skipped":[]}\n' "$(join ${REMOVED[@]+"${REMOVED[@]}"})"
    ;;
  *) echo "usage error: command" >&2; exit 2 ;;
esac
