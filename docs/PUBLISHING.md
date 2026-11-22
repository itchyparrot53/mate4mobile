# Publish the repository and GitHub Pages

This checkout is prepared for **`itchyparrot53/mate4mobile`**. It is a clean export, not the parent working folder. Only publish this repository. The parent folder may contain personal deployment credentials and driving records.

## 1. Review the release

```bash
npm ci
npm test
npm run site
npm run check
npm run test:install
git status --short
git ls-files
```

Confirm the file list contains no `.env`, private keys, certificates, database exports, local production screenshots or route logs. The automated content check catches common artifacts but does not replace reviewing the staged files. Read `LICENSE`, `docs/legal/THIRD_PARTY_NOTICES.md` and `.github/SECURITY.md`.

## Publish using GitHub Desktop on your PC

GitHub Desktop only needs to be installed on the PC holding this checkout. The TeslaMate host continues running the app and database independently.

1. Sign in to GitHub Desktop as `itchyparrot53`.
2. Choose **File → Add local repository**, and select the `mate4mobile` folder containing this README and its `.git` directory. Do not select the parent working folder or a ZIP file.
3. Review the Changes list and your commit author in **Repository → Repository settings → Git**. The initial files are already staged; create the first commit on `main`, for example `Introduce Mate4Mobile`.
4. Choose **Publish repository**, name it `mate4mobile`, and confirm the account is `itchyparrot53`. Keep it private for a preliminary review or make it public when ready. Publishing is a separate action from committing.
5. Once published, enable Pages using the steps below. The website workflow builds the showcase and synthetic demo; it does not redeploy the private app.

The placeholder remote was removed from the prepared local checkout so Desktop can offer **Publish repository** and create the GitHub repository itself. For the command-line route instead, use the remote-add instructions below. This follows [GitHub's existing-project Desktop workflow](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop?platform=windows).

Future app changes can be committed/pushed from this PC and deployed separately over SSH, as in the current setup. GitHub Desktop is not needed on the app server. Publishing or pushing source does not automatically update that server.

## 2. Create the GitHub repository

Under `itchyparrot53`, create an **empty** repository named `mate4mobile`. Choose public only when ready to release. Do not initialize another README/licence on GitHub; this checkout already contains them.

Review your commit identity and create the initial commit if this checkout has no commits yet:

```bash
git config --get user.name
git config --get user.email
git add .
git commit -m "Introduce Mate4Mobile"
```

If you are starting from the source ZIP, run `git init -b main` first. Use GitHub’s normal authentication on your machine, then:

```bash
git remote add origin https://github.com/itchyparrot53/mate4mobile.git
git push -u origin main
```

If `origin` is already configured, verify `git remote -v` instead of adding it twice. Review your Git author name/email before creating the first commit. No token belongs in a Git remote URL or source file.

Suggested repository description: **“Every mile, in view. A private, mobile-first TeslaMate companion.”**

Suggested topics: `teslamate`, `tesla`, `pwa`, `self-hosted`, `dashboard`, `postgresql`, `javascript`, `docker`.

Use `brand/exports/social-card.png` as the repository social preview. Set the About website to `https://itchyparrot53.github.io/mate4mobile/` after Pages succeeds. Enable private vulnerability reporting in repository security settings before inviting public security reports.

## 3. Enable Pages

In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The supplied `.github/workflows/pages.yml` builds and uploads only `dist/site` from `main`. Trigger it from Actions if the initial push happened before Pages was enabled.

After a successful deployment, the intended addresses are:

- Website: `https://itchyparrot53.github.io/mate4mobile/`
- Demo: `https://itchyparrot53.github.io/mate4mobile/demo/`
- Brand board: `https://itchyparrot53.github.io/mate4mobile/brand/`

Verify the website and demo at that real subpath. Check the README screenshots, install links, social image and brand downloads. GitHub’s [custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) explains the Pages environment and `pages:write` / `id-token:write` permissions.

**Do not upload the private app environment or connect Pages to PostgreSQL.** Pages is static hosting; the showcase’s synthetic data is the only data it needs.

## 4. Release

Use [RELEASE.md](RELEASE.md), tag a reviewed revision and write concise release notes identifying the supported installation paths and known limits. Do not advertise a container registry image until an actual image publishing workflow exists; this release builds its Docker image locally.

If the repo is renamed/forked, update the GitHub links and canonical/Open Graph URLs in `README.md`, `site/index.html`, `scripts/build-site.cjs`, this guide and `site/site.js` if commands change. Asset paths are relative, so the site/demo can be served under a different project path without changing production app paths.
