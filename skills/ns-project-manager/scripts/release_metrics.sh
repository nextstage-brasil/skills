#!/usr/bin/env bash
# release_metrics.sh — delivery metrics between production version (base) and new version (target)
# Usage, inside the repository:
#   release_metrics.sh <label> <role:processamento|interface> <area-map.tsv> [base] [target] > metrics-<label>.json
# default base: origin/main · default target: origin/release
set -euo pipefail
LABEL="$1"; ROLE="$2"; MAP="$3"; BASE="${4:-origin/main}"; TARGET="${5:-origin/release}"
export EXCL='(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.snap$|(^|/)dist/|(^|/)build/|\.min\.(js|css)$)'
export TESTRX='(\.(spec|test)\.[jt]sx?$|(^|/)tests?/)'
export MAP
CODE_GLOBS=('*.ts' '*.tsx' '*.js' '*.jsx' '*.sql' '*.prisma' '*.css' '*.scss')
TEST_CASE='^[[:space:]]*(it|test)(\.each)?[[:space:]]*[(`]'
NUC=$(awk -F'\t' '$3=="nucleo"{print $2}' "$MAP" | paste -sd'|' -); NUC=${NUC:-'^$'}

git fetch -q origin

files()  { git ls-tree -r --name-only "$1" | grep -Ev "$EXCL" | wc -l | tr -d ' '; }
nucleo() { { git ls-tree -r --name-only "$1" | grep -Ec "$NUC"; } || true; }
loc()    { { git grep -I -c '' "$1" -- "${CODE_GLOBS[@]}" || true; } | grep -Ev "$EXCL" | awk -F: '{s+=$NF} END{print s+0}'; }
tests()  { { git grep -E -c "$TEST_CASE" "$1" -- '*.spec.*' '*.test.*' || true; } | awk -F: '{s+=$NF} END{print s+0}'; }

commits=$(git rev-list --count "$BASE..$TARGET")
behind=$(git rev-list --count "$TARGET..$BASE")
first=$(git log --reverse --format=%cs "$BASE..$TARGET" | awk 'NR==1')
last=$(git log -1 --format=%cs "$TARGET")
new_files=$(git diff --diff-filter=A --name-only "$BASE...$TARGET" | grep -Ev "$EXCL" | wc -l | tr -d ' ')

areas=$(git diff --numstat "$BASE...$TARGET" | awk -F'\t' '
BEGIN { while ((getline l < ENVIRON["MAP"]) > 0) { if (l ~ /^#/ || l == "") continue; split(l, p, "\t"); n++; nm[n]=p[1]; rx[n]=p[2]; pa[n]=p[3] } }
$1 == "-" { next }
$3 ~ ENVIRON["EXCL"] { next }
{ a = "Demais áreas"; r = "apoio"
  if ($3 ~ ENVIRON["TESTRX"]) { a = "Qualidade e testes" }
  else for (i = 1; i <= n; i++) if ($3 ~ rx[i]) { a = nm[i]; r = pa[i]; break }
  arq[a]++; add[a] += $1; rem[a] += $2; papel[a] = r }
END { s = ""; for (a in arq) { printf "%s{\"area\":\"%s\",\"papel\":\"%s\",\"arquivos\":%d,\"adicionadas\":%d,\"removidas\":%d}", s, a, papel[a], arq[a], add[a], rem[a]; s = "," } }')

cat <<JSON
{"repo":"$LABEL","papel":"$ROLE","base":"$BASE","alvo":"$TARGET",
 "commits":$commits,"commits_na_base_fora_do_alvo":$behind,"primeiro_commit":"$first","ultimo_commit":"$last",
 "arquivos":{"base":$(files "$BASE"),"alvo":$(files "$TARGET"),"novos":$new_files},
 "nucleo_arquivos":{"base":$(nucleo "$BASE"),"alvo":$(nucleo "$TARGET")},
 "linhas_codigo":{"base":$(loc "$BASE"),"alvo":$(loc "$TARGET")},
 "casos_de_teste":{"base":$(tests "$BASE"),"alvo":$(tests "$TARGET")},
 "areas":[$areas]}
JSON
