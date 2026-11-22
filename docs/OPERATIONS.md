# Operations

Run commands from this repository, with `-p mate4mobile`. Avoid running them in the TeslaMate checkout.

## Health and logs

```bash
docker compose -p mate4mobile ps
docker compose -p mate4mobile logs --tail=100 app
docker compose -p mate4mobile run --rm --no-deps app node scripts/doctor.cjs
curl --fail http://127.0.0.1:8099/healthz
```

The health endpoint checks database connectivity, not every table/feature. The doctor checks role privileges and core schema. For a complete read-only endpoint check:

```bash
node --env-file=.env scripts/smoke.cjs
```

The latter runs from a native Node host able to reach the app on `BASE` (default `http://127.0.0.1:8099`); it needs the dashboard passphrase but no admin credentials.

## Upgrade with a rollback point

Keep the current Git revision and image before pulling a reviewed release. The repository must be clean; preserve local configuration and any custom artwork separately.

```bash
git rev-parse HEAD
docker image tag mate4mobile:local mate4mobile:rollback
git pull --ff-only
docker compose -p mate4mobile build app
docker compose -p mate4mobile run --rm --no-deps app node scripts/doctor.cjs
docker compose -p mate4mobile up -d --no-deps --wait app
```

Verify the health endpoint, sign in, inspect one real drive and charge, and check the PWA refreshes. If a build or doctor fails, the running container remains on its old image; fix the issue before recreating it.

To restore the saved image after a failed recreation:

```bash
docker image tag mate4mobile:rollback mate4mobile:local
docker compose -p mate4mobile up -d --no-deps --no-build --force-recreate --wait app
```

Restore the matching saved source revision as well before a later build. Keep `.env` unchanged. A version’s service-worker cache key must change when shell assets change; see [RELEASE.md](RELEASE.md).

## Backups

Mate4Mobile has no separate telemetry database or persistent app volume. Back up your existing TeslaMate database through its normal process, plus Mate4Mobile’s private `.env`, proxy configuration and any local artwork. Store these privately. The signing secret preserves sessions across restarts.

## Credentials and sessions

Changing `APP_PASS` changes future logins. **Also rotate `APP_SECRET` to revoke existing sessions.** Restart/recreate only the app container after updating `.env`. Rotate the database reader password with your DBA tools and update `PGPASSWORD` together; do not change the logger’s password or role.

“Lock this device” clears its cookie and rendered private state. Since sessions are signed bearer cookies rather than a database of sessions, a copied cookie remains valid until expiry unless `APP_SECRET` is rotated. Do not use this shared-passphrase app as a public multi-user service.

## Remove the companion

```bash
docker compose -p mate4mobile down
```

This stops/removes only this Compose project. Its external network is not removed. Remove the corresponding reverse-proxy site and Home Screen shortcut if no longer needed. Keep your private configuration until you know you no longer need rollback.

The restricted PostgreSQL role can remain disabled or be revoked/dropped by a DBA after checking it is used only by Mate4Mobile. Do not run blanket `DROP OWNED`, drop a database, remove TeslaMate volumes, or use the logger’s Compose project for cleanup.
