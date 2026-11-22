# Commit naming convention

Every commit starts with two emojis: **what happened**, then **where it happened**.

```text
<Action emoji> <Scope emoji> <Short imperative description> (optional version/tag)
```

Use imperative wording (Add, Fix, Remove), and aim for fewer than 60 characters total. Choose the primary action and scope for mixed changes. These rules apply to commit subjects and squash-merge titles; bodies may explain the reasoning and validation.

## Actions — position one

| Emoji | Meaning | Use |
| --- | --- | --- |
| ✨ | Feature | New functionality, endpoints or UI |
| 🐛 | Bug fix | Broken behaviour, crashes or logic errors |
| ♻️ | Refactor | Restructure without changing behaviour |
| 🔼 | Upgrade | Versions, releases or dependency upgrades |
| 🔥 | Remove | Dead code, files or deprecated features |
| ⚡ | Performance | Queries, caching or execution speed |
| 🧪 | Test / WIP | Tests, experiments or work in progress |
| 🔒 | Security | Authentication, secrets or permissions |
| 🏁 | Milestone | Major release or stable checkpoint |
| 📝 | Documentation | Documentation-only changes |
| ⚙️ | Maintenance | Configuration or script maintenance |

The documentation and maintenance actions explicitly support the supplied `📝 ✅` and `⚙️ ⚙️` templates.

## Scopes — position two

| Emoji | Meaning | Use |
| --- | --- | --- |
| 🐳 | Docker / infrastructure | Compose, Dockerfiles, networks, CI/CD |
| ⚙️ | Configuration / scripts | Shell scripts, environment configuration |
| 🧠 | Core / API | Backend logic, services or API routes |
| 🗄️ | Database | Schemas, SQL or persistence |
| 🎨 | UI / frontend | Styles, layouts or client assets |
| 📦 | Dependencies | Packages and lockfiles |
| 📝 | Documentation | README, guides or comments |
| ✅ | Verified | A checkpoint validated by relevant checks |

Use ✅ only when the relevant checks have actually passed. Describe validation in the commit body when useful.

## Copyable examples

```text
🏁 ✅ Final v2.4.2
🔼 🐳 Bump Docker stack to v2.4.2
🔼 📦 Update dependencies and lockfile
✨ 🧠 Add activity endpoint
🐛 🧠 Fix empty journey response
♻️ 🧠 Restructure API routing
⚡ 🗄️ Optimize journey queries
🔒 🧠 Enforce session expiration
✨ 🐳 Add app service to Compose
🐛 🐳 Fix container port mapping
⚙️ ⚙️ Update setup script flags
🔥 🐳 Remove deprecated container volume
✨ 🗄️ Add restricted reader grants
🐛 🗄️ Fix connection pool timeout
🧪 🧠 Test async request handling
♻️ ⚙️ Clean up configuration formatting
🔥 🧠 Remove unused helpers
📝 📝 Simplify installation instructions
📝 ✅ Verify README setup instructions
✨ 🎨 Add charging summary
```

Existing history may predate this convention. Do not rewrite published history solely to enforce it without explicit maintainer approval.
