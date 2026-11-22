# HTTPS and Home Screen installation


The private app must be reachable from the phone through trusted HTTPS. GitHub Pages hosts the public showcase, not your dashboard. PWA installation and service workers depend on a secure browser context; `localhost` is a development exception, not a remote-phone address.

## Host-installed Caddy

The supplied Compose file binds the app to host loopback. A Caddy process running on the **same host** can reach it. Add a site block to your existing Caddy configuration; do not replace unrelated sites:

```caddyfile
mate4mobile.home.arpa {
    tls internal
    encode zstd gzip
    reverse_proxy 127.0.0.1:8099
}
```

Set local DNS so `mate4mobile.home.arpa` resolves to the server’s LAN address. Validate the combined Caddy configuration, then reload Caddy using your existing installation’s procedure. The app is designed to run at the root of its own hostname, not `/mate4mobile` under another private app.

Caddy’s internal CA must be trusted by each phone/browser through the operating system’s certificate management. On iOS, installing a root profile and enabling full trust are separate steps. Use your organization/home CA procedure; never dismiss a certificate interstitial as the installation method. If managing a local CA is impractical, use an existing private HTTPS/VPN gateway or a domain and publicly trusted certificate with your normal access controls.

For details, consult [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https) and the [reverse_proxy directive](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Use your own domain with Caddy

Use a dedicated hostname such as `drive.example.com`. A real domain does not require public access to your dashboard: LAN/VPN access with split DNS and a DNS-01 certificate is a good option. For an internet-reachable hostname, we recommend an additional authentication gateway such as TinyAuth, as shown below. Keep the app's own login enabled in either case.

For **Caddy installed on the same host** as Mate4Mobile, the basic site block is:

```caddyfile
drive.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8099
}
```

Replace the hostname with one you control and merge the block into your existing Caddyfile. Do not include `tls internal` when requesting a publicly trusted certificate. **This basic block has no external authentication gate; use it behind your private network, or replace it with the TinyAuth version before enabling internet access.**

Choose the certificate route that matches your network:

- **Public HTTP/TLS validation:** point the hostname's A/AAAA records at the Caddy endpoint and make the required ACME challenge port reachable there. Caddy's usual automatic HTTPS setup uses ports 80 and 443; forward those only to Caddy, never to the app or database. Check IPv6 routing too if publishing an AAAA record.
- **Private access with a public certificate:** use your own domain, private/split DNS for clients and DNS-01 validation. This requires a Caddy build with your DNS provider's module and narrowly scoped DNS credentials stored privately. The exact `tls { dns ... }` configuration is provider-specific. DNS-01 does not require inbound ACME ports. Do not add router forwards just to obtain the certificate.

Keep Caddy's certificate storage persistent. See [automatic HTTPS and ACME challenges](https://caddyserver.com/docs/automatic-https#acme-challenges) for the requirements of each method.

### Add TinyAuth as another login layer

For domain-based access, **we recommend TinyAuth as an optional outer authentication gate**, especially if the hostname can be reached from the internet. It supplements Mate4Mobile's shared passphrase; it does not add per-user permissions inside Mate4Mobile or make the app a public multi-user service. Private LAN/VPN access remains the preferred baseline.

The flow is: phone → Caddy → TinyAuth check → Mate4Mobile login → dashboard. Reuse a working TinyAuth installation where possible. Configure it to allow only intended users and enable MFA where supported. Do not allow every account at an OAuth provider by default.

The following example assumes host-installed Caddy, Mate4Mobile bound to `127.0.0.1:8099`, and TinyAuth reachable through a **loopback-only** host mapping at `127.0.0.1:3000`. Replace that upstream if your actual private mapping differs.

```caddyfile
# The authentication service must be reachable without authenticating to itself.
auth.example.com {
    reverse_proxy 127.0.0.1:3000
}

drive.example.com {
    encode zstd gzip
    route {
        forward_auth 127.0.0.1:3000 {
            uri /api/auth/caddy
        }
        reverse_proxy 127.0.0.1:8099
    }
}
```

The explicit `route` keeps the authentication check before the app proxy. There are no path exceptions: API, login, health and asset requests through this hostname all pass the gate. Local container/loopback health checks can still run directly. Mate4Mobile does not use forwarded identity headers for login, so `copy_headers` is not needed. See [Caddy forward_auth](https://caddyserver.com/docs/caddyfile/directives/forward_auth) for how gateway responses control access.

For a new TinyAuth deployment, follow its [getting-started guide](https://tinyauth.app/docs/getting-started/) rather than adding it to TeslaMate's stack. The current v5 guide uses `TINYAUTH_APPURL=https://auth.example.com` and `TINYAUTH_AUTH_USERS` for locally generated user hashes. Older releases use different settings; do not silently upgrade an existing gateway. Use compatible sibling hostnames (`auth.example.com` and `drive.example.com`) for its shared-domain cookie. Check the documented restrictions before using a shared DDNS domain.

TinyAuth's [community Caddy integration](https://tinyauth.app/docs/community/caddy/) documents `/api/auth/caddy`. Its `TINYAUTH_AUTH_TRUSTEDPROXIES` setting is separate from Mate4Mobile's `TRUSTED_PROXY_IPS`: identify the source Caddy actually uses to reach each service, particularly across Docker NAT. Avoid blanket trust of client-supplied forwarding headers. The example is a documented integration pattern, not a claim of end-to-end testing on your domain.

### Validate, reload and check both logins

Save a private backup of your existing Caddyfile. For a normal host installation using `/etc/caddy/Caddyfile`, validate the complete merged configuration before reloading it:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# Run only if validation succeeds; adapt the path/service to your installation.
sudo systemctl reload caddy
```

See [Caddy's validation command](https://caddyserver.com/docs/command-line#caddy-validate). Use your existing container/service procedure if Caddy is not managed by host systemd. Validation checks configuration; it does not prove DNS, certificates, upstream connectivity or login works.

Before relying on the setup:

1. Check the local app with `curl --fail http://127.0.0.1:8099/healthz`. Keep `BIND_ADDRESS=127.0.0.1` and `COOKIE_SECURE=1`. A remote client must not be able to use port 8099 to bypass Caddy.
2. In a fresh browser session, open `https://drive.example.com`. With TinyAuth, expect its login first, then Mate4Mobile's passphrase screen. Confirm the certificate is trusted without bypassing warnings.
3. Without a TinyAuth session, `/api/summary` must redirect to authentication or deny access, never return driving data. After gateway login but before Mate4Mobile login, that API must still deny access. A redirect followed to a login page can end with HTTP 200, so inspect the destination and response rather than treating any 200 as success.
4. Verify an unauthorised user cannot pass the gateway. Confirm gateway failure denies access using an isolated test or planned maintenance, not by unexpectedly stopping a shared authentication service. Do not configure a fallback that proxies directly to the app.
5. Test on the actual phone after adding it to the Home Screen, including reauthentication after gateway-session expiry. If API requests redirect to an HTML login page, the app may show a connection error; reopen the HTTPS address and sign in again. Do not exempt `/api/*`, the manifest or service worker to work around it.

The two sessions are independent. Locking Mate4Mobile does not log you out of TinyAuth, and gateway logout does not revoke Mate4Mobile's signed cookie. For shared devices, sign out of both. An open app may still hold already-rendered data in memory; an outer gateway does not remotely erase it. See the [security model](../.github/SECURITY.md).

## Existing container reverse proxy

`127.0.0.1` inside a proxy container means that container, not the Docker host. Attach the proxy and Mate4Mobile to an appropriate shared network and route to the app’s network alias `app:8099`, or give it a unique alias in a Compose override to avoid collisions with other services called `app`.

Keep `COOKIE_SECURE=1`. If per-client throttling needs forwarded IPs, set `TRUSTED_PROXY_IPS` to the proxy’s **exact, stable source IP**, not an entire subnet or `*`. The proxy must overwrite forwarding headers from clients. Without that setting, proxied clients share the source IP’s failed-login bucket. Do not expose the backend port directly.

## Install on the phone

**iPhone/iPad:** Open the trusted private HTTPS address in Safari, sign in, use Share → Add to Home Screen, and confirm Mate4Mobile’s name/icon. Menu wording can vary by iOS version.

**Android:** Open it in Chrome, sign in, and choose Install app or Add to Home Screen from the browser menu. The app’s Preferences page also offers an install button when the browser exposes an installation prompt.

**Desktop:** Use the browser’s install option when available, or keep it as a normal tab. The app adapts to a larger display.

The manifest includes 192px/512px standard icons and a separate maskable icon; the mark fits inside the central safe circle described by [MDN’s icon guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons). A dedicated 180px Apple touch icon and SVG/ICO favicons are included.

## Updates and offline behaviour

The service worker caches only the app shell and selected vehicle images. API responses and authentication are network-only. Opening an already-installed shell offline shows a connection message; it does not provide an offline archive of your private history.

If the old icon/name remains after a branding update, reopen the app online. Some operating systems retain the installed metadata; remove that Home Screen shortcut and add it again if necessary. Browser-stored appearance preferences are independent of the database.
