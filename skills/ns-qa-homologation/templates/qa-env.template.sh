#!/usr/bin/env bash
# qa-env: project implementation of the ns-qa-homologation qa-env contract
# (skills/ns-qa-homologation/references/qa-env-contract.md).
#
# How to adopt:
#   1. Copy to the path set in qa-profile `environment.script` (e.g. scripts/qa-env.sh).
#   2. Keep ONE provider block below (fixed_url | compose | slot); delete the other two.
#   3. Replace every <placeholder> default (or export the QA_ENV_* variable instead).
#
# Usage:
#   qa-env.sh up     --run <run_id> --ref <branch|commit>
#   qa-env.sh health --run <run_id>
#   qa-env.sh seed   --run <run_id> --prefix <data.run_prefix>
#   qa-env.sh reset  --run <run_id> --prefix <data.run_prefix>
#   qa-env.sh info   --run <run_id>
#   qa-env.sh down   --run <run_id> --manifest <run.json> [--resource <kind>:<id>]...
#
# Stdout: exactly one JSON object (contract_version 1). Diagnostics go to stderr.
# Exit:   0 = "ok": true · 1 = "ok": false (operation failed) · 2 = usage error or refused (nothing changed).
#
# Safety: every resource this script creates embeds the run namespace (qa-<run_id>) and is
# printed in "created_resources". `down` removes only resources listed in that run's run.json
# (via qa-env) that also embed the run id. It never touches anything else.
# Needs: bash, git, python3 (manifest parsing); docker for the compose block; curl for fixed_url.

set -euo pipefail
# Byte-wise ASCII ranges in [[ =~ ]] and tr: under UTF-8 locales [A-Za-z] can match letters like é or ß.
export LC_ALL=C

PROVIDER="${QA_ENV_PROVIDER:-<fixed_url | compose | slot>}"
SEED_CMD="${QA_ENV_SEED_CMD:-<seed command: prints one line per entity: entity<TAB>ref<TAB>real|db_fixture>}"
RESET_CMD="${QA_ENV_RESET_CMD:-<reset command: restores the run database to its post-seed state>}"

# Internal rows use the unit separator (not tab: tab is IFS whitespace and collapses empty fields).
SEP=$'\x1f'
# Resource ids end up in docker/git/stack arguments: same rule as qa-run.schema.json resourceId.
ID_PATTERN='^[A-Za-z0-9.][A-Za-z0-9._/:@+-]*$'

COMMAND=""
RUN_ID=""
REF=""
PREFIX=""
MANIFEST=""
SELECTED=()
CREATED=()
URLS=()
CHECKS=()
DATA=()
REMOVED=()
SKIPPED=()
FAILED=""
COMMIT=""
UNOWNED=""
FAILING=""

# ---------------------------------------------------------------- JSON output

json_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  s=$(printf '%s' "$s" | tr -d '\000-\010\013\014\016-\037\177')
  printf '"%s"' "$s"
}

json_pairs() { # <key>... -- <rows: fields joined by $SEP>...
  local keys=() row first=1 i rest value
  while [ "$1" != "--" ]; do keys+=("$1"); shift; done
  shift
  printf '['
  for row in "$@"; do
    [ "$first" -eq 1 ] || printf ','
    first=0
    rest=$row
    printf '{'
    for i in "${!keys[@]}"; do
      if [[ $rest == *"$SEP"* ]]; then
        value=${rest%%"$SEP"*}
        rest=${rest#*"$SEP"}
      else
        value=$rest
        rest=""
      fi
      [ "$i" -eq 0 ] || printf ','
      if [ "${keys[$i]}" = ok ]; then
        if [ "$value" = true ]; then printf '"ok":true'; else printf '"ok":false'; fi
      else
        printf '%s:%s' "$(json_escape "${keys[$i]}")" "$(json_escape "$value")"
      fi
    done
    printf '}'
  done
  printf ']'
}

json_or_null() { if [ -n "$1" ]; then json_escape "$1"; else printf 'null'; fi; }

emit() { # <true|false> [error]
  local ok=$1 error=${2:-}
  printf '{"contract_version":1,"command":%s,"run_id":%s,"ok":%s,"error":%s' \
    "$(json_escape "$COMMAND")" "$(json_escape "$RUN_ID")" "$ok" "$(json_or_null "$error")"
  case $COMMAND in
    up) printf ',"urls":%s,"commit":%s,"created_resources":%s' \
      "$(json_pairs name url -- ${URLS[@]+"${URLS[@]}"})" "$(json_or_null "$COMMIT")" \
      "$(json_pairs kind id -- ${CREATED[@]+"${CREATED[@]}"})" ;;
    health) printf ',"checks":%s' "$(json_pairs name ok detail -- ${CHECKS[@]+"${CHECKS[@]}"})" ;;
    seed) printf ',"data":%s' "$(json_pairs entity ref data_source -- ${DATA[@]+"${DATA[@]}"})" ;;
    reset) printf ',"data":%s,"created_resources":%s' \
      "$(json_pairs entity ref data_source -- ${DATA[@]+"${DATA[@]}"})" \
      "$(json_pairs kind id -- ${CREATED[@]+"${CREATED[@]}"})" ;;
    down)
      printf ',"removed":%s,"failed":' "$(json_pairs kind id -- ${REMOVED[@]+"${REMOVED[@]}"})"
      if [ -n "$FAILED" ]; then json_pairs kind id reason -- "$FAILED" | sed 's/^\[//; s/\]$//'; else printf 'null'; fi
      printf ',"skipped":%s' "$(json_pairs kind id -- ${SKIPPED[@]+"${SKIPPED[@]}"})" ;;
    info) printf ',"urls":%s,"commit":%s' "$(json_pairs name url -- ${URLS[@]+"${URLS[@]}"})" "$(json_or_null "$COMMIT")" ;;
  esac
  printf '}\n'
}

log() { printf 'qa-env: %s\n' "$*" >&2; }

fail() { # <reason>: report what exists so far, then exit 1
  if [ -z "$FAILING" ] && { [ "$COMMAND" = up ] || [ "$COMMAND" = reset ]; }; then
    FAILING=1
    provider_call collect >/dev/null 2>&1 || true
  fi
  emit false "$1"
  exit 1
}

refuse() { # <reason>: nothing changed
  log "refused: $1"
  emit false "$1"
  exit 2
}

run_step() { # <description> <command...>: command output goes to stderr, never stdout
  local description=$1
  shift
  log "$description"
  "$@" >&2 || fail "$description failed"
}

# ------------------------------------------------------------ run ownership

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
safe_id() { [[ $1 =~ $ID_PATTERN ]] && [[ $1 != *..* ]]; }
run_id_regex() { # boundary-aware, same rule as qa_common.run_id_regex
  local iid=${RUN_ID%%-*} rest=${RUN_ID#*-}
  local date=${rest%%T*} time=${rest#*T}
  printf '(^|[^0-9])%s[-_.]?%st%sz([^0-9a-z]|$)' "$iid" "$date" "${time%Z}"
}
owned() { # <id>: safe for arguments and embeds this run id
  local re
  re=$(run_id_regex)
  safe_id "$1" && [[ $(lower "$1") =~ $re ]]
}

register() { # <kind> <id>: record a run-owned resource (idempotent); unowned ids fail the command later
  local entry="$1$SEP$2" existing
  if ! owned "$2"; then
    log "not run-owned or unsafe id, not registered: $1:$2"
    UNOWNED="$1:$2"
    return 0
  fi
  for existing in ${CREATED[@]+"${CREATED[@]}"}; do
    if [ "$existing" = "$entry" ]; then return 0; fi
  done
  CREATED+=("$entry")
}

require_owned() { [ -z "$UNOWNED" ] || fail "resource $UNOWNED is not run-owned (unsafe id or no run id $RUN_ID)"; }

add_url() { URLS+=("$1$SEP$2"); }
add_check() { CHECKS+=("$1$SEP$2$SEP$3"); }

seed_data() { # runs SEED_CMD; each output line: entity<TAB>ref<TAB>real|db_fixture
  local line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    DATA+=("${line//$'\t'/$SEP}")
  done < <(QA_RUN_ID="$RUN_ID" QA_DATA_PREFIX="$PREFIX" bash -c "$SEED_CMD" || echo "__seed_failed__")
  case "${DATA[*]-}" in *__seed_failed__*) DATA=(); fail "seed command failed" ;; esac
}

manifest_resources() { # prints kind<TAB>id for this run's qa-env resources, in removal order
  python3 - "$MANIFEST" "$RUN_ID" "$ID_PATTERN" <<'PY'
import json, re, sys
order = ["container", "volume", "database", "image", "worktree"]
with open(sys.argv[1], encoding="utf-8") as handle:
    run = json.load(handle)
if run.get("run_id") != sys.argv[2]:
    sys.exit(f"manifest run_id {run.get('run_id')} != {sys.argv[2]}")
items = [r for r in run.get("created_resources", []) if r.get("via") == "qa-env" and r.get("kind") in order]
for item in items:
    if not isinstance(item.get("id"), str) or not re.fullmatch(sys.argv[3], item["id"], re.ASCII) or ".." in item["id"]:
        sys.exit(f"unsafe resource id {item.get('id')!r}")
for item in sorted(items, key=lambda r: order.index(r["kind"])):
    print(f"{item['kind']}\t{item['id']}")
PY
}

# ===================================================== provider: fixed_url
# An environment someone else deploys (e.g. a review app per MR) that is dedicated to this run.
# Creates and removes nothing. Prefer profile `environment.provider: url` when no seed/reset is needed.

FIXED_APP_URL="${QA_ENV_APP_URL:-<app URL dedicated to the run>}"
FIXED_API_URL="${QA_ENV_API_URL:-<api URL dedicated to the run>}"
FIXED_VERSION_URL="${QA_ENV_VERSION_URL:-<URL returning the deployed commit: bare SHA or JSON {\"commit\": \"<sha>\"}>}"

fixed_url_urls() { add_url app "$FIXED_APP_URL"; add_url api "$FIXED_API_URL"; }
fixed_url_commit() {
  local body
  body=$(curl -fsS --max-time 20 "$FIXED_VERSION_URL") || fail "version URL unreachable"
  COMMIT=$(printf '%s' "$body" | tr -d '[:space:]' | sed -n 's/.*"commit":"\([0-9a-f]\{7,40\}\)".*/\1/p; /^[0-9a-f]\{7,40\}$/p' | head -n 1)
  [ -n "$COMMIT" ] || fail "version URL returned no commit"
}
fixed_url_up() { fixed_url_urls; }
fixed_url_collect() { :; }
fixed_url_health() {
  local name url code
  for name in app api; do
    url=$FIXED_APP_URL
    if [ "$name" = api ]; then url=$FIXED_API_URL; fi
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" || true)
    case $code in 2* | 3*) add_check "$name" true "HTTP $code" ;; *) add_check "$name" false "HTTP ${code:-none}" ;; esac
  done
}
fixed_url_reset() { QA_RUN_ID="$RUN_ID" QA_DATA_PREFIX="$PREFIX" run_step "reset run data" bash -c "$RESET_CMD"; }
fixed_url_remove() { log "fixed_url creates no resources"; return 1; }
fixed_url_info() { fixed_url_urls; fixed_url_commit; }

# ======================================================= provider: compose
# One docker compose project per run, named qa-<run_id>, built from a git worktree checked out at --ref.
# The compose file should publish container ports without fixed host ports ("3000", not "3000:3000")
# so parallel runs never collide; URLs are read back with `docker compose port`.

COMPOSE_FILE="${QA_ENV_COMPOSE_FILE:-<compose file path relative to the repo root>}"
COMPOSE_APP_SERVICE="${QA_ENV_APP_SERVICE:-<frontend service name>}"
COMPOSE_APP_PORT="${QA_ENV_APP_PORT:-<frontend container port>}"
COMPOSE_API_SERVICE="${QA_ENV_API_SERVICE:-<api service name>}"
COMPOSE_API_PORT="${QA_ENV_API_PORT:-<api container port>}"
DROP_DATABASE_CMD="${QA_ENV_DROP_DATABASE_CMD:-<command dropping database \$1 created by this run>}"

compose_project() { printf 'qa-%s' "$(printf '%s' "$RUN_ID" | tr '[:upper:]' '[:lower:]')"; }
compose_worktree() { printf '.worktrees/%s' "$(compose_project)"; }
compose() { docker compose -p "$(compose_project)" --project-directory "$(compose_worktree)" -f "$(compose_worktree)/$COMPOSE_FILE" "$@"; }

compose_collect() { # registers everything the project owns right now
  local name
  if [ -d "$(compose_worktree)" ]; then register worktree "$(compose_worktree)"; fi
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    register container "$name"
  done < <(compose ps -a --format '{{.Name}}' 2>/dev/null)
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    register volume "$name"
  done < <(docker volume ls -q --filter "label=com.docker.compose.project=$(compose_project)")
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    register image "$name"
  done < <(docker image ls --filter "label=com.docker.compose.project=$(compose_project)" --format '{{.Repository}}:{{.Tag}}')
}
compose_urls() {
  local app api
  app=$(compose port "$COMPOSE_APP_SERVICE" "$COMPOSE_APP_PORT") || fail "app port not published"
  api=$(compose port "$COMPOSE_API_SERVICE" "$COMPOSE_API_PORT") || fail "api port not published"
  add_url app "http://localhost:${app##*:}"
  add_url api "http://localhost:${api##*:}"
}
compose_up() {
  if [ ! -d "$(compose_worktree)" ]; then
    run_step "git worktree add $(compose_worktree) $REF" git worktree add --detach "$(compose_worktree)" "$REF"
  fi
  register worktree "$(compose_worktree)"
  run_step "docker compose up" compose up -d --build
  compose_collect
  compose_urls
  COMMIT=$(git -C "$(compose_worktree)" rev-parse HEAD)
}
compose_health() {
  local name state
  while IFS= read -r name; do
    [ -n "$name" ] || continue
    state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo missing)
    case $state in healthy | running) add_check "$name" true "$state" ;; *) add_check "$name" false "$state" ;; esac
  done < <(compose ps -a --format '{{.Name}}' 2>/dev/null)
}
compose_reset() { QA_RUN_ID="$RUN_ID" QA_DATA_PREFIX="$PREFIX" run_step "reset run data" bash -c "$RESET_CMD"; compose_collect; }
compose_remove() { # <kind> <id>; already gone = removed (idempotent)
  case $1 in
    container) if docker container inspect "$2" >/dev/null 2>&1; then docker rm -f "$2" >&2; fi ;;
    volume) if docker volume inspect "$2" >/dev/null 2>&1; then docker volume rm "$2" >&2; fi ;;
    image) if docker image inspect "$2" >/dev/null 2>&1; then docker image rm "$2" >&2; fi ;;
    database) bash -c "$DROP_DATABASE_CMD" _ "$2" >&2 ;;
    worktree) if [ -d "$2" ]; then git worktree remove "$2" >&2; fi ;; # never --force: pending changes stop cleanup
    *) return 1 ;;
  esac
}
compose_info() { compose_urls; COMMIT=$(git -C "$(compose_worktree)" rev-parse HEAD); }

# ========================================================== provider: slot
# An isolated slot managed by the project's own stack tool, named qa-<run_id>.
# Adapt each <stack-command> call to the real tool; keep the output formats shown.

STACK_CMD="${QA_ENV_STACK_CMD:-<stack-command>}"

slot_name() { printf 'qa-%s' "$(printf '%s' "$RUN_ID" | tr '[:upper:]' '[:lower:]')"; }
stack() { bash -c "$STACK_CMD \"\$@\"" _ "$@"; }

slot_collect() { # stack prints kind<TAB>id per resource it created for the slot
  local kind id
  while IFS=$'\t' read -r kind id; do
    [ -n "$kind" ] || continue
    register "$kind" "$id"
  done < <(stack resources "$(slot_name)" 2>/dev/null)
}
slot_urls() { # stack prints name<TAB>url per entry point
  local name url
  while IFS=$'\t' read -r name url; do
    [ -n "$name" ] || continue
    add_url "$name" "$url"
  done < <(stack urls "$(slot_name)")
  [ "${#URLS[@]}" -gt 0 ] || fail "stack urls returned nothing"
}
slot_up() {
  run_step "stack create $(slot_name)" stack create "$(slot_name)" --ref "$REF"
  slot_collect
  slot_urls
  COMMIT=$(stack commit "$(slot_name)") || fail "stack commit failed"
}
slot_health() { # stack prints name<TAB>ok|fail<TAB>detail per check
  local line rest name status detail
  while IFS= read -r line; do
    name=${line%%$'\t'*}
    rest=${line#*$'\t'}
    status=${rest%%$'\t'*}
    detail=""
    if [[ $rest == *$'\t'* ]]; then detail=${rest#*$'\t'}; fi
    [ -n "$name" ] || continue
    if [ "$status" = ok ]; then add_check "$name" true "$detail"; else add_check "$name" false "$detail"; fi
  done < <(stack health "$(slot_name)" 2>/dev/null)
}
slot_reset() { run_step "stack reset $(slot_name)" stack reset "$(slot_name)"; slot_collect; }
slot_remove() { stack remove "$(slot_name)" "$1" "$2" >&2; }
slot_info() { slot_urls; COMMIT=$(stack commit "$(slot_name)") || fail "stack commit failed"; }

# ================================================================ commands

provider_call() { # <operation> [args...]
  local fn="${PROVIDER}_$1"
  shift
  declare -F "$fn" >/dev/null || refuse "provider '$PROVIDER' has no ${fn#"${PROVIDER}_"} operation"
  "$fn" "$@"
}

cmd_up() { provider_call up; require_owned; emit true; }
cmd_health() {
  local row
  provider_call health
  [ "${#CHECKS[@]}" -gt 0 ] || { emit false "no health check ran"; exit 1; }
  for row in "${CHECKS[@]}"; do
    case $row in *"${SEP}false${SEP}"*) emit false "health check failed"; exit 1 ;; esac
  done
  emit true
}
cmd_seed() { seed_data; emit true; }
cmd_reset() { provider_call reset; require_owned; seed_data; emit true; }
cmd_info() { provider_call info; emit true; }

cmd_down() {
  local listed=() targets=() row wanted found kind id i
  [ -n "$MANIFEST" ] && [ -f "$MANIFEST" ] || refuse "--manifest <run.json> is required"
  while IFS= read -r row; do
    [ -n "$row" ] || continue
    listed+=("${row//$'\t'/$SEP}")
  done < <(manifest_resources || echo "__manifest_error__")
  case "${listed[*]-}" in *__manifest_error__*) refuse "manifest unreadable or belongs to another run" ;; esac
  for wanted in ${SELECTED[@]+"${SELECTED[@]}"}; do
    found=0
    for row in ${listed[@]+"${listed[@]}"}; do
      if [ "$row" = "$wanted" ]; then found=1; fi
    done
    [ "$found" -eq 1 ] || refuse "resource ${wanted/$SEP/:} is not a qa-env resource in run.json"
  done
  for row in ${listed[@]+"${listed[@]}"}; do
    if [ "${#SELECTED[@]}" -eq 0 ]; then targets+=("$row"); continue; fi
    for wanted in "${SELECTED[@]}"; do
      if [ "$row" = "$wanted" ]; then targets+=("$row"); fi
    done
  done
  for row in ${targets[@]+"${targets[@]}"}; do
    owned "${row#*"$SEP"}" || refuse "resource ${row/$SEP/:} is not run-owned (unsafe id or no run id)"
  done
  for i in "${!targets[@]}"; do
    kind=${targets[$i]%%"$SEP"*}
    id=${targets[$i]#*"$SEP"}
    if provider_call remove "$kind" "$id"; then
      REMOVED+=("${targets[$i]}")
    else
      FAILED="$kind$SEP$id${SEP}removal failed"
      SKIPPED=("${targets[@]:$((i + 1))}")
      emit false "stopped at $kind:$id"
      exit 1
    fi
  done
  emit true
}

usage() { log "usage: qa-env.sh {up|health|seed|reset|down|info} --run <run_id> [--ref R] [--prefix P] [--manifest F] [--resource kind:id]..."; exit 2; }

value_of() { # <flag> <value>: a valued flag without a value is a usage error (exit 2)
  if [ $# -lt 2 ] || [ -z "$2" ] || [[ $2 == --* ]]; then usage; fi
}

parse_args() {
  [ $# -ge 1 ] || usage
  COMMAND=$1
  shift
  while [ $# -gt 0 ]; do
    case $1 in
      --run) value_of "$@"; RUN_ID=$2; shift 2 ;;
      --ref) value_of "$@"; REF=$2; shift 2 ;;
      --prefix) value_of "$@"; PREFIX=$2; shift 2 ;;
      --manifest) value_of "$@"; MANIFEST=$2; shift 2 ;;
      --resource) value_of "$@"; SELECTED+=("${2%%:*}$SEP${2#*:}"); shift 2 ;;
      *) usage ;;
    esac
  done
  case $COMMAND in up | health | seed | reset | down | info) ;; *) usage ;; esac
  [[ $RUN_ID =~ ^[0-9]+-[0-9]{8}T[0-9]{4}Z$ ]] || usage
  if [ "$COMMAND" = up ] && [ -z "$REF" ]; then usage; fi
  if [[ $REF == -* ]]; then usage; fi # never an option to git worktree add / the stack tool
  if { [ "$COMMAND" = seed ] || [ "$COMMAND" = reset ]; } && [ -z "$PREFIX" ]; then usage; fi
}

main() {
  parse_args "$@"
  "cmd_$COMMAND"
}

main "$@"
