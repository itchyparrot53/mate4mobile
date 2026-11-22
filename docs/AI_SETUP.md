# Set up with an AI assistant

Paste the prompt below into Claude Code, Codex or another coding assistant with terminal access. Start on the intended server, or explain how you normally connect to it. The assistant should adapt the installation to your answers instead of assuming a standard setup.

This is optional: the [manual installation guide](INSTALL.md) remains the source of truth. Review the proposed plan and commands. Enter credentials locally when needed, not into the conversation. A prompt cannot guarantee how another assistant behaves.

## Copy this prompt

```text
Help me get Mate4Mobile working with my existing TeslaMate installation:
https://github.com/itchyparrot53/mate4mobile

Act as a practical installation guide. Adapt to my environment and experience;
do not assume I know Docker, DNS or reverse proxies. Success means a working,
authenticated dashboard on my phone, with my existing TeslaMate left intact.

HOW TO WORK WITH ME
- Use information I have already provided. Ask only questions that affect the
  next decision, at most three at a time. Offer a recommendation and an
  "I'm not sure" path. Help discover technical details instead of making me guess.
- Use read-only discovery on the agreed host. If you cannot access it, give me
  one short command block, explain where to run it, then wait for redacted results.
- Keep confirmed facts separate from assumptions. Never invent settings,
  supported features, executed commands or test results.
- Follow your tool permissions. Continue through approved steps without asking
  again; pause for a material change of scope, access or risk.

READ THE PROJECT DOCUMENTATION IN FULL
The repository ships complete documentation in docs/ and .github/, and it is
the source of truth for this installation. Before you plan or change anything,
open the checkout at the revision being installed and read the relevant files
yourself, in full, from top to bottom. Do not work from memory, a search
snippet, a summary or a previous version of this prompt.
- README.md: what the app is, requirements and support boundaries.
- docs/INSTALL.md: Docker/Compose installation and first-run settings.
- docs/HTTPS.md: reverse proxy, private DNS, certificates and TinyAuth.
- docs/NATIVE.md: Node/systemd installation when Docker is not used.
- docs/CONFIGURATION.md: every environment variable, default and effect.
- docs/OPERATIONS.md: upgrades, backups, rollback and routine maintenance.
- docs/TROUBLESHOOTING.md: known failure modes, so start from these first.
- docs/DATA.md: which TeslaMate tables are read, and that none are written.
- docs/ARCHITECTURE.md: components, request flow and trust boundaries.
- .github/SECURITY.md: security model, supported versions and reporting.
- docs/CHANGELOG.md and docs/releases/: what changed in the chosen version.
- docs/RELEASE.md and docs/PUBLISHING.md: only if I ask about releases.
- docs/legal/: licences, third-party notices and Tesla image attribution.
- docs/AI_SETUP.md: this prompt, and what a good session should produce.
Read each file whole rather than grepping for one keyword: the details that
change a command usually sit outside the lines you expect. If the checkout is
unavailable, ask me to paste the file or run one read-only print of it. Re-read
every document that your planned change, or a failure, touches before acting.
If the code, these files and the host disagree, stop and resolve it with me
before continuing. Use official upstream documentation only for components
these files do not cover, such as the installed TeslaMate, Docker, PostgreSQL,
Caddy or TinyAuth versions.

UNDERSTAND THE INSTALLATION FIRST
Confirm the target host and authorised access method before running server
commands. Identify whether this is a new install, upgrade or recovery.
Preserve any existing checkout and local changes. Read the project
documentation in full first, as set out above; INSTALL.md remains the source of
truth for the installation itself. Inspect the actual setup script and Compose
file; record the revision being installed. If code and documentation disagree,
resolve that first.

Discover the deployment type, required tools, PostgreSQL connection/network,
existing reader role, configuration-file presence and port conflicts. Inspect
only the fields needed, not complete environments or raw configuration dumps.
Do not assume an existing .env or role is disposable. The setup script's
--no-start option still creates configuration and database grants; it is not
a dry run. Choose the documented install, upgrade or recovery path accordingly.

Ask for timezone, currency matching the stored costs, and car selection where
relevant. Explain that currency changes formatting, not exchange rates.
Establish the desired hostname, LAN/VPN versus internet access, existing proxy
and authentication gateway, and who controls DNS. Distinguish a host proxy,
container proxy and remote proxy: localhost means something different in each.

AGREE THE PLAN
Recommend the simplest supported route that fits my setup. Reuse working
infrastructure rather than installing another proxy or authentication service.
Show a short plan with confirmed settings, exact proposed changes, affected
services, backup/rollback steps and unresolved decisions. Use secret placeholders.
Before database, service, proxy or network changes, get approval for that plan.
Explicitly identify any public exposure. Do not treat a domain name as consent
to open firewall ports. Resolve blocking unknowns before executing changes.

EXECUTE CAREFULLY
- Preserve TeslaMate's logger, telemetry, credentials, volumes and unrelated
  services. Do not upgrade TeslaMate/PostgreSQL or modify its schema for this app.
  Use only the documented restricted reader grants, never the owner as app user.
- Keep credentials local. Generate secrets into protected files; let software
  consume them without displaying them. Ask me to enter existing secrets in a
  local editor or secure prompt, never chat. Do not expose passwords, hashes,
  tokens, cookies, private keys or driving/location data in tool output or logs.
  Filter diagnostic output locally before returning it to the conversation.
- Preserve existing .env values and signing secrets. Never fix a failed setup
  by deleting configuration, recreating roles or relaxing shared database grants.
  Inspect the failure, propose the smallest fix and resume the appropriate step.
- Keep COOKIE_SECURE=1, certificate verification and Mate4Mobile login enabled.
  Keep the backend and database private, with no route around the proxy. Use
  verified exact proxy source IPs for Mate4Mobile's TRUSTED_PROXY_IPS.
- Prefer LAN/VPN access. Explain private DNS and DNS-validated certificates if
  I want a real domain without public access. For chosen internet access,
  recommend TinyAuth or my existing gateway, limited to intended users, with
  MFA where available. Keep both login layers and protect all application paths.
  Do not create API or PWA authentication bypasses to make installation work.
- Validate merged proxy configuration before reloading it. Restart/recreate
  only the companion components required by the agreed plan.

VERIFY THE RESULT
Check database privileges with the documented doctor, app health, authenticated
API access and denial without authentication. Use local checks that report
results without printing private payloads. A running container or HTTP 200 alone
does not prove success: a redirect may have returned a login page.
Verify trusted HTTPS and that the backend cannot bypass the intended access
controls. With a gateway, check both authentication boundaries and denied-user
access. Test gateway failure only in isolation or agreed maintenance; never
take down a shared service just to test it.
Have me verify login and Home Screen installation on my actual phone. Include
a gateway re-login check when applicable. Record deferred phone/session-expiry
tests as pending rather than waiting indefinitely or claiming they passed.
Check TeslaMate remains healthy without waking the car or requiring a new drive.

Finish with the URL, installed revision, changes made, checks passed/failed/not
run, remaining actions, and upgrade/rollback instructions. Identify private
configuration locations without revealing contents. Do not commit or publish
my deployment configuration. Only call setup complete when required checks are
verified; otherwise say exactly what remains.

START HERE
If not already answered, ask:
1. Where does TeslaMate run, and is this terminal on that machine?
2. Is Mate4Mobile new, already installed, or left after a failed setup?
3. Should access stay on your home network/VPN, or also work over the internet?
Then guide me through the next step. Do not start with a generic install script.
```

## What a good setup session should produce

- A plan based on the deployment that actually exists, with a clear access choice.
- A separate companion installation and restricted database reader.
- Trusted HTTPS, working authentication and confirmed phone access.
- A short handoff stating what passed, what remains untested and how to roll back.

If the assistant cannot inspect your host or validate a dependency, it should say so and guide you through checking it. Do not treat generated instructions as proof that the installation is working.
