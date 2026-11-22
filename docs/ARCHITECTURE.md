# Architecture


```text
src/server.js        Node HTTP, authentication, static serving, read-only API
src/activity.js      Combined cursor-based drive/charge timeline
src/insights.js      Battery sampling and charging summaries
src/lib.js           Route thinning and telemetry helpers
public/              Framework-free PWA, charts, appearance, local assets
public/money.js      Shared currency validation and display formatting
deploy/              Dockerfile, native service, reverse proxy and reader SQL
docs/legal/          Vehicle attribution, third-party notices and provenance
.github/             Workflows, issue template, contribution/security guidance
scripts/setup.sh     Additive Docker installer and restricted reader grants
scripts/doctor.cjs   Read-only connection/schema/privilege checks
site/                Public presentation and synthetic demo adapter
brand/               Original vector masters, exports, tokens and usage guide
dist/site/           Generated Pages artifact (ignored by Git)
```

Production static files are served only from `public/`. API endpoints use parameterized PostgreSQL queries and read-only connections with bounded query timeouts. The app has no writable persistent volume. Authentication depends on the configured passphrase/signing secret; it is separate from TeslaMate’s own authentication.

Browser preferences use local storage. Data stays in the existing database. Opening a session detail loads Leaflet locally and requests OSM tiles for the route area. Charts are native SVG with keyboard/touch inspection. The service worker precaches an explicit shell allowlist and fetches private APIs through the network only.

## Public demo boundary

`scripts/build-site.cjs` copies the UI into a separate `dist/site/demo/` artifact, rewrites asset references for a GitHub project subpath, removes the manifest/worker, disables worker registration and injects `site/demo-data.js`. That adapter supplies only invented readings in the browser. It does not exist under production `public/`, does not change the Node API, and cannot reach a TeslaMate database.

The showcase is static HTML/CSS/JS. Pages workflows upload only `dist/site`, never the backend, `.env`, private exports or database connection settings. The generated demo uses separate local-storage keys from the private app.

## Compatibility

The private app is hosted at `/` on its own origin. The public website/demo supports the GitHub Pages `/mate4mobile/` project path. These are separate deployment concerns; a Pages subpath build does not make the private backend a subpath application.

The original personal deployment used `tm-mobile` service/cache names. Cookie and preference names remain compatible. The production cache key deliberately retains the `tm-mobile` prefix so an update clears old shells belonging to this app without touching unrelated caches.
