# Troubleshooting

| Symptom | Check |
| --- | --- |
| Setup says `.env` exists | This is deliberate. Use the upgrade/start steps; do not regenerate secrets over a working install. |
| Reader role already exists | Setup will not take it over. Use a new role name or verify/configure the existing restricted role manually. |
| Database connection refused | `PGHOST` must resolve inside the selected Docker network. Check the internal database port and network membership. Do not expose PostgreSQL publicly. |
| Local admin psql fails | Confirm the actual database owner, database name and your existing socket-authentication policy. Use the manual role provisioning path if necessary. |
| Doctor reports `PUBLIC` access | Privileges can be inherited even with `NOINHERIT`. Have the DBA review the shared grants; setup avoids changing permissions used by other services. |
| Missing table/column | Compare your TeslaMate version/schema with the queries. Do not let Mate4Mobile migrate the logger’s database. Report the missing identifier and version, without data. |
| Healthy container but phone cannot connect | The backend is bound to loopback. Configure a trusted HTTPS proxy/DNS address reachable from your phone. |
| Login succeeds but immediately locks | On plain HTTP, the secure cookie will not be accepted. Use HTTPS. Set `COOKIE_SECURE=0` only for localhost development. |
| 429 after failed logins | Wait the indicated cooldown. A proxy not in the exact trust list shares its failed-login bucket across clients. Fix the proxy setup rather than disabling throttling. |
| No car yet | Confirm TeslaMate has recorded a car and `CAR_ID` is correct. The default is the first car by ID. |
| Old readings while the car sleeps | This is recorded history, not a car-control client. Mate4Mobile will not wake the vehicle. Freshness labels show the latest recorded timestamp. |
| Missing cost/consumption | Set tariffs in TeslaMate through its normal workflow. Missing historical cost or efficiency calibration cannot be reconstructed reliably by the viewer. |
| Blank route tiles | Check access to `tile.openstreetmap.org`, its attribution and your browser/network policy. GPS samples may also be absent. |
| Old Home Screen name/icon | Reopen online; if the OS retains old installation metadata, remove the shortcut and reinstall from the trusted HTTPS URL. |
| Demo works but private app does not | The demo is synthetic and has no database. Run the doctor, health and endpoint checks on the private installation. |
| Native app ignores `.env` | Use systemd’s `EnvironmentFile` or `node --env-file=.env src/server.js`. Plain `npm start` does not load it. |

When asking for help, include the app version, TeslaMate/PostgreSQL versions, deployment type and sanitized error message. Never post `.env`, auth cookies, private IP/hostnames you do not want shared, VINs, home addresses, database dumps or real route screenshots.
