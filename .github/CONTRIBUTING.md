# Contributing

Small, focused improvements to the daily experience are welcome. Open an issue for substantial changes so the intended behaviour is clear before implementation.

## Local development

Use Node 22+ and run `npm ci`. `npm run site && npm run preview` opens the full synthetic demo without a database. It is the easiest way to work on the interface safely.

For backend work, use your own disposable PostgreSQL fixture or a restricted reader against your own installation. Copy `.env.example`, supply local values, then run:

```bash
node --env-file=.env scripts/doctor.cjs
node --env-file=.env src/server.js
```

For localhost-only HTTP testing, set `HOST=127.0.0.1` and `COOKIE_SECURE=0`. Production stays behind HTTPS.

## Before a pull request

```bash
npm test
npm run site
npm run check
```

Run `npm run test:install` when changing deployment, database grants, proxy/cookie handling or Docker files. It creates its own disposable PostgreSQL container/network, tests restrictive grants and rerun behaviour, and cleans up those named resources. Docker must be running. On Windows, Git Bash at its standard path is supported; use `BASH_EXE` to override it.

For UI changes, check 320px and 390px phones, a tablet-width layout and desktop. Check keyboard focus, reduced motion, missing data, no car, offline state and chart inspection. Include only synthetic screenshots.

## Design and data principles

- Keep the interface vehicle-first and readable. Follow [the brand kit](../brand/README.md).
- Keep missing values, zero and estimates distinct. Preserve timestamps and telemetry gaps.
- Do not add Tesla API calls, vehicle wakeups, write queries or analytics without an explicit project-level design discussion.
- Private APIs must never enter the service-worker cache. The public demo must never enter the production app.
- Avoid unrelated framework/build dependencies. The production app currently requires only Node and `pg`.
- Preserve upstream licences and credit original contributions.

Pull requests should describe the user-visible problem, the resulting behaviour and relevant validation. Be respectful, assume good intent, and discuss the work rather than the contributor. Do not post someone else’s location, vehicle identity, tokens or private logs.
