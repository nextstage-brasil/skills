#!/usr/bin/env bash
# Optional first-pass scan for technical leakage in a reverse-spec markdown file.
# Usage: scripts/scan_leakage.sh path/to/spec.md
# Review every hit manually — this catches patterns, not intent.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <spec-file.md>" >&2
  exit 1
fi

FILE="$1"
if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

# Patterns grouped by category. Case-insensitive match.
PATTERNS=(
  # Languages
  'Python|JavaScript|TypeScript|PHP|Java\b|Golang|\bGo\b|Rust|Ruby|C#|Kotlin|Swift'
  # Frameworks
  'React|Vue\.?js|Angular|Laravel|Django|Rails|Express|Spring|Flask|FastAPI|Next\.js|Nuxt'
  # ORM / data libs
  'Eloquent|Hibernate|Prisma|Sequelize|ActiveRecord|TypeORM|Drizzle|SQLAlchemy'
  # Databases / BaaS
  'PostgreSQL|MySQL|MariaDB|MongoDB|Redis|SQLite|Supabase|Firebase|DynamoDB'
  # Infra
  'Docker|Kubernetes|K8s|AWS|GCP|Azure|Vercel|Heroku|Nginx|Apache'
  # Protocol / auth jargon
  '\bREST\b|\bGraphQL\b|WebSocket|\bJWT\b|\bOAuth\b|Bearer token'
  # Architecture labels
  'microservice|monolith|serverless|\bMVC\b|middleware pipeline'
  # Code-structure words often leaked
  '\bendpoint\b|\bpayload\b|\bschema\b|\bmigration\b|foreign key|primary key'
  'VARCHAR|BIGINT|TIMESTAMP|JSONB|UUID type'
)

echo "=== Leakage scan: $FILE ==="
echo "(Review each hit — false positives are expected for provider names, etc.)"
echo

FOUND=0
LINE_NUM=0

while IFS= read -r line; do
  LINE_NUM=$((LINE_NUM + 1))
  for pattern in "${PATTERNS[@]}"; do
    if echo "$line" | grep -qiE "$pattern"; then
      echo "L$LINE_NUM: $line"
      FOUND=$((FOUND + 1))
      break
    fi
  done
done < "$FILE"

echo
if [[ $FOUND -eq 0 ]]; then
  echo "No pattern hits. Still run references/anti_leakage_checklist.md manually."
else
  echo "$FOUND line(s) with potential leakage. Rewrite or justify each."
fi

exit 0
