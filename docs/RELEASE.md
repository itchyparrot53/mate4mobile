# Release checklist and validation

## Preparing a release

1. Update `package.json`, the lockfile, `/healthz` version, Preferences version text and `CHANGELOG.md`.
2. Change the service-worker cache key whenever any shell asset changes. Keep its `tm-mobile` prefix for cleanup compatibility and never add an API endpoint to the shell.
3. Run `npm ci`, `npm test`, `npm run site`, `npm run check` and, for deployment/security changes, `npm run test:install`.
4. Check website/demo at the **project subpath**, narrow/mobile/tablet/desktop layouts, keyboard focus, touch targets and reduced motion. Try a drive, charge, appearance choice and unit change.
5. Use only synthetic screenshots for README/site. Inspect the staged file list and diffs for private source artifacts, credentials, routes and third-party asset rights and attribution. Tesla vehicle imagery is explicitly excluded from MIT and documented in LEGAL.md.
6. Upgrade a private test installation with rollback available. Check trusted HTTPS health, login, APIs and shell/manifest updates. Verify the existing logger has not restarted.
7. Publish only after reviewing the concrete repository. Enable Pages and verify its real published URL separately; local testing is not proof of remote deployment.

## 2.4 preparation — 22 November 2026

- 30 Node regressions cover authentication, static-path handling, API caching boundaries, asset integrity, appearance migration, activity pagination, charts, telemetry sampling and charging null/zero costs.
- A disposable PostgreSQL 17 Docker integration test checks actual role creation, named-table access, denial of token reads and table writes, refused credential overwrite, production-image startup, database doctor, HTTP health, authentication and Secure cookies. It also verifies the doctor rejects extra access granted through `PUBLIC`.
- The Docker image uses Node 24 and an unprivileged process with a read-only filesystem in Compose. Unit tests also run locally on Node 22.
- Source/Pages checks validate local asset and documentation links, icon dimensions, the installable manifest, and isolation of the synthetic demo from production.
- Browser checks covered the showcase at 320, 390, 1024 and 1440 pixels, plus the app demo on phone and desktop layouts. Copy buttons, FAQ disclosure, appearance/paint, units, charging periods/spend, journey details and keyboard chart inspection were exercised. Synthetic screenshots are included in `docs/images/`.
- The existing private installation was upgraded to 2.4 and its trusted HTTPS health and authenticated read endpoints passed. The service worker replaced its old shell, and browser sign-in/preferences displayed the new name and assets. Its existing logger remained running.

Limits: the installer test uses a minimal synthetic schema to verify provisioning and deployment, not a full TeslaMate migration suite. Existing query behaviour was tested against the personal deployment separately. Physical iOS/Android Home Screen installation and the future GitHub-hosted Actions/Pages run still require verification on those actual targets. No claim is made that every historical TeslaMate schema, proxy arrangement or phone browser has been tested.
