#!/usr/bin/env bash
# Adds only Mate4Mobile. Never runs Compose in the TeslaMate project.
set -euo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
usage() {
  cat <<'HELP'
Mate4Mobile setup — for an existing Docker TeslaMate installation
Usage: bash scripts/setup.sh [options]
  --container NAME    Existing PostgreSQL container (prompted if omitted)
  --network NAME      Existing Docker network shared with that container
  --db-name NAME      TeslaMate database (default: teslamate)
  --db-admin NAME     Existing database owner for the one-time grants
  --db-host NAME      Database network alias (default: container name)
  --db-user NAME      NEW reader role (default: mate4mobile_reader)
  --port NUMBER       Loopback HTTP port (default: 8099)
  --timezone ZONE     IANA timezone (default: Europe/London)
  --currency CODE     GBP, EUR, USD or another ISO currency (default: GBP)
  --no-start          Configure and grant only; do not build/start the app
  --help              Show this help without making changes
Run from a Linux host with Docker Compose v2 and access to the DB container.
HELP
}
fail(){ printf 'Setup stopped: %s\n' "$*" >&2; exit 1; }
container=''; network=''; dbname=teslamate; admin=teslamate; dbhost=''; reader=mate4mobile_reader; port=8099; zone=Europe/London; currency=GBP; start=1
while (($#)); do
  case "$1" in
    --help|-h) usage; exit 0;;
    --no-start) start=0; shift; continue;;
    --container|--network|--db-name|--db-admin|--db-host|--db-user|--port|--timezone|--currency) (($#>=2)) || fail "Missing value for $1";;
    *) fail "Unknown option: $1";;
  esac
  case "$1" in
    --container) container=$2;; --network) network=$2;; --db-name) dbname=$2;; --db-admin) admin=$2;; --db-host) dbhost=$2;; --db-user) reader=$2;; --port) port=$2;; --timezone) zone=$2;; --currency) currency=$2;;
  esac
  shift 2
done
for command in docker openssl; do command -v "$command" >/dev/null || fail "$command is required"; done
docker compose version >/dev/null || fail 'Docker Compose v2 is required'
[[ ! -e .env && ! -L .env ]] || fail '.env already exists. Use docs/OPERATIONS.md to upgrade; setup never overwrites credentials.'
if [[ -z "$container" || -z "$network" ]]; then
  [[ -t 0 ]] || fail 'Supply --container and --network when running without a terminal'
  docker ps --format 'table {{.Names}}\t{{.Image}}'
  [[ -n "$container" ]] || read -r -p 'Existing PostgreSQL container: ' container
  docker inspect --format '{{range $name, $value := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$container"
  [[ -n "$network" ]] || read -r -p 'Existing network listed above: ' network
  read -r -p "Database owner [$admin]: " answer; admin=${answer:-$admin}
fi
currency=${currency^^}
dbhost=${dbhost:-$container}
for identifier in "$dbname" "$admin" "$reader"; do [[ "$identifier" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || fail 'Database and role names must use lowercase SQL identifiers'; done
for value in "$container" "$network" "$dbhost"; do [[ "$value" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || fail 'Invalid container, network or host name'; done
[[ "$port" =~ ^[0-9]{4,5}$ && "$port" -le 65535 && "$port" -ge 1024 ]] || fail 'Port must be 1024–65535'
[[ "$zone" =~ ^[A-Za-z0-9_+/-]+$ && "$currency" =~ ^[A-Z]{3}$ ]] || fail 'Invalid timezone or currency'
docker inspect --format '{{range $name, $value := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$container" | grep -Fxq "$network" || fail 'Database container is not on the selected network'
psql_command=(docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U "$admin" -d "$dbname")
existing=$(printf "SELECT count(*) FROM pg_roles WHERE rolname='%s';\n" "$reader" | "${psql_command[@]}" -At)
[[ "$existing" == 0 ]] || fail "Role $reader already exists. Choose a new --db-user; existing roles are never modified."
[[ "$reader" != "$admin" ]] || fail 'Reader and owner must differ'
mkdir .setup.lock 2>/dev/null || fail 'Another setup is running (or .setup.lock needs checking)'
trap 'rmdir .setup.lock 2>/dev/null || true' EXIT
dbpass=$(openssl rand -hex 24); apppass=$(openssl rand -hex 16); secret=$(openssl rand -hex 32)
# noclobber prevents a concurrent setup from replacing credentials.
(set -o noclobber; cat > .env <<ENV
TESLAMATE_NETWORK=$network
PGHOST=$dbhost
PGPORT=5432
PGDATABASE=$dbname
PGUSER=$reader
PGPASSWORD=$dbpass
APP_PASS=$apppass
APP_SECRET=$secret
TZ=$zone
CURRENCY=$currency
BIND_ADDRESS=127.0.0.1
HTTP_PORT=$port
COOKIE_SECURE=1
ENV
)
chmod 600 .env
printf 'Creating restricted reader in %s; starting a separate Mate4Mobile project.\n' "$dbname"
# All DDL is transactional. There is no blanket SELECT grant, role inheritance,
# default grant on future tables, schema migration, or access to Tesla tokens.
# Credentials travel over stdin, not command-line arguments or script output.
if ! "${psql_command[@]}" >/dev/null <<SQL
BEGIN;
CREATE ROLE "$reader" LOGIN PASSWORD '$dbpass' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
ALTER ROLE "$reader" SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE "$dbname" TO "$reader";
GRANT USAGE ON SCHEMA public TO "$reader";
GRANT SELECT ON public.cars, public.settings, public.states, public.positions, public.drives, public.charging_processes, public.charges, public.updates, public.addresses, public.geofences TO "$reader";
COMMIT;
SQL
then
  fail 'Database grants failed and rolled back. .env is retained for inspection. See docs/INSTALL.md#recovering-a-partial-setup before retrying.'
fi
unset dbpass apppass secret
if ((start)); then
  docker compose -p mate4mobile build app
  docker compose -p mate4mobile run --rm --no-deps app node scripts/doctor.cjs
  docker compose -p mate4mobile up -d --wait --wait-timeout 90 app
fi
printf '\nConfiguration saved in .env (mode 600). Credentials were not printed.\n'
printf 'Next: configure HTTPS using docs/HTTPS.md, then install on your phone.\n'
printf "To view your dashboard passphrase locally: sed -n 's/^APP_PASS=//p' .env\n"
