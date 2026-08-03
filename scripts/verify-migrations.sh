#!/usr/bin/env bash
# Apply every migration to a scratch database, then assert schema invariants.
#
# Catches the class of bug that motivated migration tooling here: code and
# schema drifting apart with nothing checking. Runs in CI against a plain
# Postgres service, using supabase/tests/00-shim.sql to stand in for Supabase's
# auth/storage schemas.
#
# Usage: scripts/verify-migrations.sh [--keep]
#   --keep   leave the scratch database in place for inspection
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${VERIFY_DB_NAME:-dyluxepro_verify}"
PSQL_BASE=("${PSQL:-psql}")
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

if [[ -n "${DATABASE_URL:-}" ]]; then
  ADMIN_URI="${DATABASE_URL}"
  TARGET_URI="${DATABASE_URL%/*}/${DB_NAME}"
else
  # Local dev default: peer-auth as the postgres superuser.
  PSQL_BASE=(sudo -u postgres psql)
  ADMIN_URI="postgres"
  TARGET_URI="${DB_NAME}"
fi

psql_run() {
  local target="$1"
  shift
  "${PSQL_BASE[@]}" --dbname "$target" --no-psqlrc --quiet \
    --set ON_ERROR_STOP=1 "$@"
}

echo "==> recreating scratch database '${DB_NAME}'"
psql_run "$ADMIN_URI" -c "drop database if exists ${DB_NAME} with (force);" >/dev/null
psql_run "$ADMIN_URI" -c "create database ${DB_NAME};" >/dev/null

echo "==> applying Supabase shim"
psql_run "$TARGET_URI" -f "${REPO_ROOT}/supabase/tests/00-shim.sql" >/dev/null

echo "==> applying migrations"
shopt -s nullglob
migrations=("${REPO_ROOT}"/supabase/migrations/*.sql)
if [[ ${#migrations[@]} -eq 0 ]]; then
  echo "no migrations found" >&2
  exit 1
fi
for migration in "${migrations[@]}"; do
  printf '    %s\n' "$(basename "$migration")"
  psql_run "$TARGET_URI" -f "$migration" >/dev/null
done

echo "==> re-applying migrations (idempotency check)"
for migration in "${migrations[@]}"; do
  psql_run "$TARGET_URI" -f "$migration" >/dev/null
done

echo "==> asserting schema invariants"
psql_run "$TARGET_URI" -f "${REPO_ROOT}/supabase/tests/10-assertions.sql"

if [[ $KEEP -eq 0 ]]; then
  psql_run "$ADMIN_URI" -c "drop database if exists ${DB_NAME} with (force);" >/dev/null
else
  echo "==> scratch database '${DB_NAME}' kept"
fi

echo "==> migrations verified"
