# Configuration reference

Compose reads a private `.env` in the repository root. Native Node users load the same settings through systemd or `node --env-file=.env src/server.js`. Do not commit the file. Keep generated values unchanged across app upgrades unless deliberately rotating them.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PGHOST` | libpq default | PostgreSQL host reachable from the app process/container. |
| `PGPORT` | `5432` | PostgreSQL port, never a new public database listener. |
| `PGDATABASE` | none supplied | Existing TeslaMate database. |
| `PGUSER` | none supplied | Restricted viewer role, not the logger’s owner. |
| `PGPASSWORD` | none supplied | Viewer password. |
| `PGSSLMODE` | driver default | Optional node-postgres TLS setting for remote databases; configure trusted certificates through your deployment. Do not disable verification to suppress an error. |
| `APP_PASS` | required | Shared private-dashboard passphrase. |
| `APP_SECRET` | required, 32+ characters | Persistent signing key; rotating it invalidates all current sessions. |
| `CAR_ID` | first car by ID | Optional positive TeslaMate car ID. One car is selected per instance. |
| `TZ` | `Europe/London` | IANA timezone for calendar-day grouping. |
| `CURRENCY` | `GBP` | Display currency for costs and tariffs, e.g. GBP, EUR or USD. Validated at startup; no currency conversion. |
| `HOST` | `127.0.0.1` | Native listener. Compose overrides to `0.0.0.0` **inside** its container. |
| `PORT` | `8099` | Native/internal HTTP port. |
| `BIND_ADDRESS` | `127.0.0.1` | Compose host bind address. Keep private; host proxy recommended. |
| `HTTP_PORT` | `8099` | Compose host port. |
| `TESLAMATE_NETWORK` | required by Compose | Existing Docker network containing PostgreSQL. |
| `COOKIE_SECURE` | `1` in Compose | Forces Secure cookies behind container proxies. `0` is for HTTP localhost development only. |
| `TRUSTED_PROXY_IPS` | loopback only | Comma-separated exact trusted proxy IPs for forwarded protocol/IP. No wildcard or subnet expansion. |
| `SESSION_COOKIE` | `tm_session` | Optional distinct cookie name for multiple instances on one host. |

Use a dedicated hostname for each private instance. Session cookies and service workers are scoped to `/`. The `tm_` preference/cookie names are retained for compatibility with early personal deployments.

Distance units and vehicle appearance are browser preferences. Temperature and tyre-pressure units follow TeslaMate. The display currency must match the numbers recorded in your database; changing it only changes formatting.


## Currency

Set one ISO 4217 currency code in the repository-root `.env`:

```dotenv
CURRENCY=EUR
```

| Code | Currency |
| --- | --- |
| `GBP` | British pound (default) |
| `EUR` | Euro |
| `USD` | US dollar |
| `CAD` | Canadian dollar |
| `AUD` | Australian dollar |
| `NZD` | New Zealand dollar |
| `CHF` | Swiss franc |
| `JPY` | Japanese yen |
| `CNY` | Chinese yuan |
| `HKD` | Hong Kong dollar |
| `SGD` | Singapore dollar |
| `INR` | Indian rupee |
| `SEK` / `NOK` / `DKK` | Swedish / Norwegian / Danish krone or krona |
| `PLN` | Polish zloty |
| `ZAR` | South African rand |
| `BRL` | Brazilian real |
| `AED` | UAE dirham |

Other currency codes supported by the Node runtime’s `Intl` currency data work too. Codes are normalized to uppercase. Invalid codes stop startup with a clear `CURRENCY` error instead of breaking the charging screen.

On a new installation, use `bash scripts/setup.sh --currency EUR` along with your normal setup options. For an existing Docker installation, edit `.env`, check the configuration and recreate only the companion:

```bash
docker compose -p mate4mobile run --rm --no-deps app node scripts/doctor.cjs
docker compose -p mate4mobile up -d --no-deps --force-recreate --wait app
```

A plain container restart does not reload `.env`. For native systemd installations, edit the environment file and restart `mate4mobile`. Refresh the dashboard afterwards; Preferences shows the configured currency.

The setting applies to activity, charging totals, spend charts, location breakdowns, session details and energy summaries. Dollar currencies use distinct labels where needed (for example US$ and CA$). Totals respect the currency’s decimal places; tariffs retain fractional cents, with GBP rates shown in pence.

**This is formatting, not exchange-rate conversion.** Use the currency already represented by your TeslaMate costs and tariffs. Changing `GBP` to `EUR` labels a stored `10` as €10.00; it does not convert £10 into euros. Mixed-currency journey history is not converted or detected.
