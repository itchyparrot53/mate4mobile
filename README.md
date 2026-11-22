<div align="center">

<img src="brand/exports/social-card.png" alt="Mate4Mobile — Every mile, in view." width="100%">

**Journeys, charging and battery history. Made for your phone.**

[![Last commit](https://img.shields.io/github/last-commit/itchyparrot53/mate4mobile?style=flat&color=9ce6c5&labelColor=202223)](https://github.com/itchyparrot53/mate4mobile/commits/main/)
[![Stars](https://img.shields.io/github/stars/itchyparrot53/mate4mobile?style=flat&color=9ce6c5&labelColor=202223)](https://github.com/itchyparrot53/mate4mobile/stargazers)
[![Code licence: MIT](https://img.shields.io/badge/code-MIT-9ce6c5?style=flat&labelColor=202223)](LICENSE)

[Website](https://itchyparrot53.github.io/mate4mobile/) · **[Try the demo](https://itchyparrot53.github.io/mate4mobile/demo/)** · [Install](docs/INSTALL.md) · [Documentation](#documentation)

</div>

---

## What is Mate4Mobile?

TeslaMate records the story of your car. **Mate4Mobile makes it easy to read.**

Check the latest recorded battery level, scroll through your day, follow a journey on the map or see what a charge actually added. A restrained dark interface, large readings and touch-friendly charts keep the useful information close on your phone and desktop.

Mate4Mobile is a **self-hosted, read-only viewer** for your existing TeslaMate database. TeslaMate keeps collecting your data; Mate4Mobile gives it a home on your phone. No Tesla API connection, vehicle commands or additional telemetry collection.

---

<a id="screenshots"></a>

## A dashboard for every day

<p align="center">
  <img src="docs/images/app-mobile.jpg" alt="Vehicle overview showing the Tesla render, battery level and daily summary with synthetic data" width="280">
  <img src="docs/images/charging-mobile.jpg" alt="Charging overview with energy trends and location breakdowns using synthetic data" width="280">
</p>

<p align="center"><strong>A quick check before you leave. A clearer picture when you get back.</strong></p>

<details>
<summary><strong>Explore the desktop view</strong></summary>

Follow a recorded journey with a route map and linked speed, power and battery charts.

![Journey map and linked telemetry chart using synthetic data](docs/images/journey-desktop.jpg)

</details>

<details>
<summary><strong>Preview the project website</strong></summary>

![Mate4Mobile showcase website](docs/images/website-desktop.jpg)

</details>

*Screenshots and the public demo use invented data. Vehicle renders © Tesla, Inc. and/or their respective owners; used for identification and illustration. See [LEGAL.md](docs/legal/LEGAL.md).*

**[Try the interactive demo →](https://itchyparrot53.github.io/mate4mobile/demo/)** No server, sign-in or vehicle connection needed.

---

<a id="features"></a>

## Features

| View | What you get |
| --- | --- |
| **Vehicle** | Latest recorded battery, range, climate and location; today’s distance, driving time and charging; configurable vehicle imagery. |
| **Activity** | Drives and charges in one timeline, grouped by local date with details a tap away. |
| **Journeys** | Route maps and linked speed, power and battery charts. Scrub through a drive to follow the recorded position. |
| **Charging** | Energy or spend over a week, month or three months; location breakdowns, charging curves and cost coverage. |
| **Energy** | Driving totals and clearly labelled battery estimates that build context as your history grows. |
| **Every screen** | Responsive desktop layouts, mobile sheets, keyboard navigation, reduced-motion support and an installable PWA shell. |

---

<a id="getting-started"></a>

## Getting started

### Before you start

- An existing **TeslaMate installation with PostgreSQL**.
- A **Linux Docker host with Compose v2**, plus `git`, `bash` and `openssl`.
- Access to the database owner for one-time reader setup.
- A **private HTTPS address** for secure sign-in and Home Screen installation.

### Docker setup

```bash
git clone https://github.com/itchyparrot53/mate4mobile.git
cd mate4mobile
bash scripts/setup.sh
```

The guided setup asks for your existing PostgreSQL container and network. It creates a **new restricted reader**, generates credentials in a local `.env`, checks the database privileges and starts a **separate Mate4Mobile container**. It does not edit your TeslaMate Compose file, restart the logger or migrate its tables.

The app initially listens on **host loopback port 8099**. Add your HTTPS reverse proxy, open that address on your phone and add it to the Home Screen. HTTPS is required for the default secure session cookie and reliable PWA installation.

**[Complete installation guide](docs/INSTALL.md)** · **[HTTPS and Home Screen setup](docs/HTTPS.md)** · **[Native Node/systemd installation](docs/NATIVE.md)**

<details>
<summary><strong>Setup with explicit container and network names</strong></summary>

```bash
bash scripts/setup.sh \
  --container teslamate-database-1 \
  --network teslamate_default \
  --db-admin teslamate \
  --timezone Europe/London \
  --currency GBP
```

Replace the example container and network names with yours. Setup refuses to overwrite an existing `.env` or take over an existing database role. Existing installations should use the [upgrade guide](docs/OPERATIONS.md).

</details>

<details>
<summary><strong>Install without Docker</strong></summary>

Use the [native Node/systemd guide](docs/NATIVE.md) for an existing Linux host. It covers a dedicated app user, restricted database credentials, the service unit and a private HTTPS reverse proxy.

</details>

> **Already installed?** Follow the [upgrade guide](docs/OPERATIONS.md). The setup script is for a new installation and deliberately refuses to overwrite an existing `.env` or database role.


---

## How it fits

```mermaid
flowchart LR
    Car[Your Tesla] --> TM[Existing TeslaMate logger]
    TM --> DB[(Existing PostgreSQL)]
    DB -->|Restricted reader| M4M[Mate4Mobile]
    M4M --> HTTPS[Your private HTTPS proxy]
    HTTPS --> Phone[Phone or desktop]
```

**GitHub Pages hosts the showcase and synthetic demo only.** Your private dashboard runs on your own server; no GitHub workflow connects to your database.

---

## Privacy & data

- The installer grants `SELECT` on ten named telemetry/configuration tables. It does **not** grant access to TeslaMate’s `tokens` table, all tables or future tables.
- The backend uses read-only database transactions. The doctor checks effective grants, including privileges inherited through `PUBLIC`.
- Sessions use signed, expiring, HttpOnly cookies and login throttling. Production deployments should stay on a trusted LAN or private VPN behind HTTPS.
- Private API responses are not stored in the service worker cache. The shell and selected illustrations can load offline; fresh readings require your server. An already-open page may retain its current readings in memory.
- There are no analytics scripts or external fonts. Opening a route map requests OpenStreetMap tiles and shares the requested map area and your network address with that provider.
- Missing values remain missing. Recorded spend is separate from the current tariff. Battery capacity and full-range figures are estimates, not a battery diagnostic.

Read the [security model](.github/SECURITY.md), [data guide](docs/DATA.md) and [architecture](docs/ARCHITECTURE.md).

---

## Make it yours

Set `CURRENCY=GBP`, `EUR`, `USD` or another supported code in `.env` to use your currency throughout costs and tariffs. See [currency configuration](docs/CONFIGURATION.md#currency) for options and how to apply changes. Stored amounts are not converted.

Choose a vehicle family, generation and paint in Preferences. Seven model/generation presets and 39 colour choices use the same Tesla renders as the app. Year ranges and representative trims are guides, not exact VIN configurations. Preferences and distance units stay on the device.

The [brand kit](brand/README.md) includes SVG masters, light/dark wordmarks, a compact M4M lockup, favicons, maskable PWA icons, Apple touch icons, social artwork, design tokens and usage guidance. The [visual brand board](https://itchyparrot53.github.io/mate4mobile/brand/) brings it together.

---

<a id="faq"></a>

## Frequently asked questions

<details>
<summary><strong>Does this replace TeslaMate or wake the car?</strong></summary>

No. TeslaMate remains your logger. Mate4Mobile reads its PostgreSQL records and does not call Tesla’s API or send commands to the car. Readings are as recent as the data TeslaMate has recorded.

</details>

<details>
<summary><strong>Does GitHub Pages host my private dashboard?</strong></summary>

No. Pages hosts the public website and a demo with synthetic data. Your dashboard runs on your own server, connected to your database. Publishing this repository does not upload your driving history.

</details>

<details>
<summary><strong>How do I install it on my phone?</strong></summary>

Open your private HTTPS address in Safari on iPhone or a supported browser on Android, sign in and use Add to Home Screen or Install app. Your phone must trust the HTTPS certificate. Follow the [HTTPS and PWA guide](docs/HTTPS.md) for the full setup.

</details>

<details>
<summary><strong>Can I choose my model and paint colour?</strong></summary>

Yes. Preferences includes seven model/generation presets and 39 colour choices. These are representative vehicle renders, not exact VIN configurations. Your selection stays on your device.

</details>

<details>
<summary><strong>Does it work offline?</strong></summary>

The installed shell and selected illustrations can load offline. Fresh readings require access to your server; private API responses are not stored in the service worker cache. An already-open page may retain its current readings in memory.

</details>

<details>
<summary><strong>Why are some costs or battery figures missing?</strong></summary>

The app keeps missing data visible rather than treating it as zero. Recorded charging costs are separate from estimates using your current tariff, and battery capacity and full-range figures are estimates. More driving and charging history gives them context. See the [data guide](docs/DATA.md).

</details>

---

<a id="documentation"></a>

## Documentation

| Guide | What it covers |
| --- | --- |
| [Installation](docs/INSTALL.md) · [Native installation](docs/NATIVE.md) | Add Mate4Mobile to an existing deployment. |
| [HTTPS & PWA](docs/HTTPS.md) | Private access, certificates and Home Screen installation. |
| [Configuration](docs/CONFIGURATION.md) | Environment variables and deployment options. |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Diagnose startup, database and connection issues. |
| [Operations](docs/OPERATIONS.md) | Upgrades, backups and removal. |
| [Data guide](docs/DATA.md) · [Architecture](docs/ARCHITECTURE.md) | Understand the readings and how the app works. |
| [Security](.github/SECURITY.md) | Access controls, privacy and vulnerability reporting. |
| [Publishing](docs/PUBLISHING.md) | GitHub Desktop and GitHub Pages setup. |
| [Brand kit](brand/README.md) | Logos, icons, colours and usage guidance. |
| [Release checklist](docs/RELEASE.md) · [Changelog](docs/CHANGELOG.md) | Validation record and release history. |

---

## Development

Node **22 or newer** is required; the container uses Node 24 LTS. The app is plain JavaScript and Node HTTP with PostgreSQL—no frontend framework or production build step.

```bash
npm ci
npm test
npm run site
npm run preview
```

Open `http://localhost:4173/mate4mobile/` for the website and demo. A database is not needed for these commands. For the private app, supply your own restricted database credentials as described in [CONTRIBUTING.md](.github/CONTRIBUTING.md).

<details>
<summary><strong>All development commands</strong></summary>

| Command | Purpose |
| --- | --- |
| `npm start` | Start the private app; environment variables must be loaded. |
| `npm test` | Run data, authentication, chart, asset and service-worker regressions. |
| `npm run brand` | Regenerate Mate4Mobile brand artwork and icon exports; preserve vehicle renders. |
| `npm run site` | Build the Pages site and isolated demo into `dist/site`. |
| `npm run preview` | Serve the showcase locally, including its project subpath. |
| `npm run check` | Check release content, local links, icons and demo isolation. |
| `npm run test:install` | Test the installer and image with disposable Docker PostgreSQL. |
| `npm run doctor` | Read-only database configuration and privilege checks. |

</details>

---

## Contributing & project status

An early public release, developed from a running personal installation. The public installer targets the standard single-database TeslaMate Docker layout. Native deployments are documented separately. Review the [validation record](docs/RELEASE.md) for what has actually been tested; unusual database schemas and proxy topologies may need configuration.

Bug reports and focused improvements are welcome. Please use synthetic examples and remove locations, VINs and credentials before sharing an issue.

Start with [CONTRIBUTING.md](.github/CONTRIBUTING.md), [report a bug](https://github.com/itchyparrot53/mate4mobile/issues/new/choose) or open a pull request with a focused improvement.

---

## Credits & licence

Made possible by [TeslaMate](https://github.com/teslamate-org/teslamate), [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/copyright), [Inter](https://rsms.me/inter/) and [node-postgres](https://node-postgres.com/).

Mate4Mobile code and original brand artwork are [MIT licensed](LICENSE). Tesla vehicle imagery is excluded from that licence; see [LEGAL.md](docs/legal/LEGAL.md). Bundled third-party components retain their own licences; see [THIRD_PARTY_NOTICES.md](docs/legal/THIRD_PARTY_NOTICES.md).

Mate4Mobile is independent and is not affiliated with, endorsed by or sponsored by Tesla, Inc. or the TeslaMate project. Tesla, Model 3, Model Y, Model S and Model X are trademarks of their respective owners.
