# Native Node and systemd installation


For an existing Linux/LXC TeslaMate deployment without Docker. Use Node 22+ (Node 24 LTS recommended) and PostgreSQL access from this host. Do not change the logger’s service, encryption key, Tesla credentials or database owner.

1. Clone the repository and install production dependencies with `npm ci --omit=dev`.
2. Provision the restricted reader with `deploy/reader.sql`, using `psql` as the existing database owner. The script prompts for a reader password after creating the role. It deliberately refuses an existing role.
3. Copy `.env.example` to `.env`. Set the actual restricted connection values, `APP_PASS`, `APP_SECRET`, `TZ` and `CURRENCY`. Generate secrets with `openssl rand -hex 32`. Add `HOST=127.0.0.1`, `PORT=8099` and keep `COOKIE_SECURE=1`. Docker-only variables can be omitted.
4. Run `node --env-file=.env scripts/doctor.cjs` and resolve failures before starting the service.

Example service installation after preparing those files:

```bash
sudo useradd --system --home /opt/mate4mobile --shell /usr/sbin/nologin mate4mobile
sudo install -d -m 750 -o root -g mate4mobile /opt/mate4mobile
sudo cp package.json package-lock.json /opt/mate4mobile/
sudo cp -R src public node_modules scripts /opt/mate4mobile/
sudo install -m 640 -o root -g mate4mobile .env /opt/mate4mobile/.env
sudo chown -R root:mate4mobile /opt/mate4mobile
sudo chmod -R o-rwx /opt/mate4mobile
sudo install -m 644 deploy/mate4mobile.service /etc/systemd/system/mate4mobile.service
sudo systemctl daemon-reload
sudo systemctl enable --now mate4mobile
curl --fail http://127.0.0.1:8099/healthz
```

These commands assume `/usr/bin/node`; check `command -v node` and adjust `ExecStart` if your Node installation uses another path. The account creation is for a new installation; do not rerun it as an upgrade procedure. Application source is root-owned and the process runs unprivileged.

Configure your trusted HTTPS proxy using [HTTPS.md](HTTPS.md), then test the real API using `scripts/smoke.cjs` with the same environment and `BASE` set to the loopback address. It does not change database rows. The smoke script’s test client handles its cookie directly; production browser logins still require HTTPS.

For upgrades, stage a separate directory, preserve `.env`, run the doctor/tests, keep the previous app directory and unit as a rollback checkpoint, then restart **only `mate4mobile`**. Verify `/healthz` and a real login before removing any checkpoint. Existing personal deployments named `tm-mobile` can keep that service name and configuration; do not install a second instance on the same port.

When upgrading from 2.4.0, copy the new `src/` directory and update the service’s `ExecStart` to `/usr/bin/node /opt/mate4mobile/src/server.js`. Reinstall the supplied unit and run `sudo systemctl daemon-reload` before restarting the companion. Keep the previous directory and unit for rollback.
