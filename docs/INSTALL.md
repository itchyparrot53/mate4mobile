# Install alongside an existing TeslaMate deployment

Mate4Mobile reads TeslaMate’s internal PostgreSQL schema, which is not a supported integration interface and may change without notice. MQTT is TeslaMate’s supported integration surface. Database compatibility and support for this app are maintained here, not by TeslaMate. Back up before upgrading and check Mate4Mobile compatibility; report app or installation problems to [Mate4Mobile issues](https://github.com/itchyparrot53/mate4mobile/issues).


The installer adds one app container and one restricted PostgreSQL role. Your TeslaMate containers, telemetry tables and logger configuration stay in place. It assumes the [standard TeslaMate Docker layout](https://docs.teslamate.org/docs/installation/docker/): an existing PostgreSQL container on a Docker network reachable by other containers.

## 1. Check the prerequisites

- Linux Docker host; Docker Engine and Compose v2 available to your user.
- `bash`, `git`, `openssl` and normal Unix core utilities.
- Working TeslaMate database with the current telemetry schema.
- The PostgreSQL database owner for **one-time role creation and grants**. Its credentials are not stored in Mate4Mobile.
- Private HTTPS reverse proxy access for the phone. See [HTTPS.md](HTTPS.md).

Back up your existing TeslaMate deployment using its normal backup process before adding integrations. Do not upgrade PostgreSQL or replace TeslaMate’s Compose file for this app.

```bash
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}'
```

Identify the PostgreSQL container, not the TeslaMate application. Discover its networks:

```bash
docker inspect --format '{{range $name, $value := .NetworkSettings.Networks}}{{println $name}}{{end}}' YOUR_POSTGRES_CONTAINER
```

Compose connects the app to that **existing external network**. It does not create or reconfigure the TeslaMate network. See [Docker’s external-network documentation](https://docs.docker.com/compose/how-tos/networking/).

## 2. Get the source and run setup

```bash
git clone https://github.com/itchyparrot53/mate4mobile.git
cd mate4mobile
bash scripts/setup.sh
```

Setup prompts for the PostgreSQL container, network and database owner. The database name defaults to `teslamate`; use flags for a different name:

```bash
bash scripts/setup.sh \
  --container YOUR_POSTGRES_CONTAINER \
  --network YOUR_EXISTING_NETWORK \
  --db-name teslamate \
  --db-admin teslamate \
  --db-host database \
  --db-user mate4mobile_reader \
  --timezone Europe/London \
  --currency GBP
```

`--db-host` is a hostname/alias visible **inside the selected Docker network**. It defaults to the container name. `localhost` inside the app container is not your database. If your existing database has a custom internal port, use `--no-start`, edit `PGPORT` in the generated `.env`, then run the start commands below.

The one-time admin connection uses `docker exec ... psql` inside PostgreSQL. The standard official Postgres image permits local socket administration by the configured owner. If your setup requires additional admin authentication, use your existing DBA process to provision the role using [reader.sql](../deploy/reader.sql), then manually configure `.env`; the script does not collect or save your admin password.

## 3. What setup does

1. Validates names, confirms the network membership and refuses an existing `.env` or reader role.
2. Generates a dashboard passphrase, signing secret and database reader password into `.env` with mode `600`.
3. Creates a new login role with no administrative powers or role memberships, read-only transactions by default, and `SELECT` on ten named tables.
4. Builds the app image, runs the read-only database doctor and starts only the `mate4mobile` Compose project.
5. Waits for its health check. Credentials are never printed by setup.

The named grants are `cars`, `settings`, `states`, `positions`, `drives`, `charging_processes`, `charges`, `updates`, `addresses` and `geofences` in the `public` schema. No grants are made on `tokens`, sequences or future tables. PostgreSQL privileges are additive, so the doctor also checks existing `PUBLIC` grants; see [PostgreSQL privileges](https://www.postgresql.org/docs/current/ddl-priv.html).

Read your dashboard passphrase locally, without posting it in an issue:

```bash
sed -n 's/^APP_PASS=//p' .env
```

## 4. Add HTTPS, then open the app

The default listener is `127.0.0.1:8099` on the Docker host. Test its health from that host:

```bash
curl --fail http://127.0.0.1:8099/healthz
docker compose -p mate4mobile ps
```

Configure your reverse proxy using [HTTPS.md](HTTPS.md), then sign in from your phone at the trusted HTTPS address. A phone cannot connect to the server’s loopback address. Do not solve that by exposing an unencrypted login to the internet.

`COOKIE_SECURE=1` is the production default. Plain HTTP is suitable for the health check; authentication requires HTTPS. Only local development should use `COOKIE_SECURE=0`.

## Manual configure/start

For an already-provisioned restricted database role, copy `.env.example` to `.env`, replace all credential placeholders, set the external network and protect the file with `chmod 600 .env`. Do not use your TeslaMate owner role for normal app access.

```bash
docker compose -p mate4mobile build app
docker compose -p mate4mobile run --rm --no-deps app node scripts/doctor.cjs
docker compose -p mate4mobile up -d --wait --wait-timeout 90 app
```

The startup command reads `.env` through Compose. `npm start` alone does not load it.

## Recovering a partial setup

Setup deliberately keeps `.env` if a later step fails. Do not rerun it blindly or change generated passwords independently.

- If role creation/grants failed, that SQL transaction rolled back. Inspect the reported schema/admin issue. Keep a secure copy of `.env`, move it out of the checkout, confirm the proposed new role does not exist, and rerun setup with corrected options.
- If the role exists and the build, doctor or startup failed, keep `.env`, fix the reported problem, and use the manual configure/start commands above. Do not recreate the role.
- If the doctor finds inherited `PUBLIC` access, ask the database administrator to review those grants. The installer intentionally does not revoke shared privileges that may affect TeslaMate or another client.
- A leftover `.setup.lock` is a concurrency guard. Remove the empty directory only after confirming no setup process is running.

Use [troubleshooting](TROUBLESHOOTING.md) for network, schema and authentication problems. Use [operations](OPERATIONS.md) for upgrades rather than setup.
