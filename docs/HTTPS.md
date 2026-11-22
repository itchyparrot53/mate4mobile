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
