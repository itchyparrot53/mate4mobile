# Security policy

Mate4Mobile is intended for a trusted household LAN or private VPN, behind trusted HTTPS. It uses one shared passphrase, not per-user accounts or a public identity system. Do not publish the backend as an unaudited public service.

## Reporting a vulnerability

Use GitHub’s **Report a vulnerability** option on the repository Security tab when private reporting is enabled. If it is unavailable, open a minimal issue requesting a private contact method; do not include exploit details, credentials or personal telemetry in public. The maintainer enables private reporting as part of the [publishing checklist](docs/PUBLISHING.md).

## Boundaries

- Authentication uses HMAC-signed 30-day bearer cookies, HttpOnly and SameSite=Strict. Production Compose forces Secure. Failed attempts are throttled in process memory; a restart clears that throttle.
- Changing the passphrase alone does not invalidate old cookies. Rotate `APP_SECRET` to revoke all sessions. Logging out clears the current browser cookie, not a server-side session registry.
- The database role must have only the named `SELECT` grants. Read-only transaction defaults are defense in depth, not a substitute for restrictive privileges. The doctor checks effective table grants, role membership, administrative flags and schema/database creation permissions. It is not a comprehensive PostgreSQL security audit of arbitrary custom functions or extensions.
- API and health requests are network-only in the worker. Private responses use no-store. The worker caches public shell assets and selected vehicle imagery; an open page can still hold rendered readings in memory.
- Secrets live in `.env`, outside Git and outside the image build context. Docker operators and host administrators can inspect container environment variables; treat Docker access as privileged.
- The app cannot send Tesla commands and needs no Tesla OAuth tokens. Its restricted role must not read the TeslaMate `tokens` table.
- Route tiles are requested from OpenStreetMap when maps are opened. “Open in Maps” explicitly opens Google Maps with the selected coordinates. No analytics scripts or remotely hosted fonts are included.
- Forwarded headers are trusted only from loopback and explicitly configured exact proxy IPs. Proxy operators must overwrite those headers from clients. Never add all clients or an entire network to the trust list.

This is an early public release. Review exposure, host updates and backups using your normal self-hosting practices. Automated tests and an isolated installer test are provided; they are not a claim of independent security certification.
