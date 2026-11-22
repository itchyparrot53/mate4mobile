# Changelog

## Unreleased

- Fixed the installer integration test racing PostgreSQL's temporary bootstrap server. Readiness now requires a successful query against the target database over TCP.
- Added deliberately delayed database initialization to exercise that race on every installer test run.
- Expanded installer validation to use the shipped Compose configuration, including database doctor, container health, authentication and Secure cookies, with isolated project/image names and a random loopback port.
- Tightened failure diagnostics, request timeouts, the excessive-grant assertion and disposable-volume cleanup.

## 2.4.0 — Mate4Mobile identity and public-source preparation

- Established the Mate4Mobile name, original road-M symbol, M4M compact form, palette, wordmarks, brand board and exportable design tokens.
- Branded the PWA, favicons, Apple touch icon, Android maskable icon, login screen, loading state and preferences.
- Aligned the website/demo vehicle catalogue with the live app’s Tesla renders; added ownership attribution, provenance and a separate legal notice.
- Added a public showcase, isolated synthetic app demo and GitHub Pages workflow.
- Added Docker packaging, an additive installer, named-table database grants, a privilege doctor and a disposable PostgreSQL installer test.
- Documented installation, HTTPS, native services, upgrades/rollback, security, data definitions, contribution and publication.

This public preparation follows an existing personal 2.3 deployment. Existing functionality includes the home summary, combined activity timeline, battery history, linked route/telemetry charts, charging energy/spend breakdowns and baseline-aware estimates. Historical personal deployment artifacts are intentionally not part of the public repository.
