# Upstream integration review

Reviewed 2026-11-22. MIT remains unchanged. This is a bounded technical comparison, not legal clearance or proof of independent authorship.

## SQL comparison

Compared 29 SELECT-containing JavaScript template literals in src/server.js, src/activity.js and src/insights.js with 242 SELECT-containing query/rawSql entries extracted recursively from upstream Grafana dashboard JSON at TeslaMate revision `dd25ffed88eeb6df3d30d954eb0dd3372819ce48`. Comparison lowercased and tokenized SQL, checked exact equality and longest contiguous matching token sequences.

No complete normalized query matches were found. The longest shared sequence was 15 tokens: a conventional address/geofence join using shared schema identifiers. Other overlaps were ordinary SELECT clauses, date formats and percentile syntax. These results do not establish copyright status or exclude adapted code.

The battery implementation was also inspected: Mate4Mobile uses daily medians of position-based range extrapolation and median charge-energy/SOC-delta capacity estimates. Upstream battery-health uses materially different CTEs for derived efficiency, recent charge samples, maximum historical capacity/range and custom baselines. No battery-query transplant was identified in this comparison. No query replacement was justified by these findings.

Limits: current upstream dashboards only, not all historical revisions, upstream backend code or third-party repositories. Template extraction is not a full JavaScript parser. Public Git history does not establish the original authorship of every query. AI training/source provenance cannot be reconstructed from output. Revisit if specific source evidence emerges; do not describe this as an independent legal audit.

## Branding and supported interfaces

The current [trademark policy](https://github.com/teslamate-org/teslamate/blob/dd25ffed88eeb6df3d30d954eb0dd3372819ce48/TRADEMARK.md) requires the exact disclaimer. It is now present in the README, website, app Preferences and legal notice.

Section 4 limits its permission for Tools to integrations via MQTT, among other conditions. Mate4Mobile reads PostgreSQL directly. Therefore the disclaimer does not by itself establish permission under that policy. Written clarification/consent from the maintainers remains outstanding. No consent has been requested or represented as granted. This is a statement of the policy, not a determination of the legal reach of trademark restrictions.

The database schema is internal and unsupported. Mate4Mobile owns its compatibility and support burden. Tesla vehicle imagery is a separate rights issue: the existing attribution notice grants no permission and no blanket fair-use clearance is claimed.

## Suggested maintainer request (not sent)

Hello — I maintain Mate4Mobile, a free, MIT-licensed, self-hosted mobile viewer for an existing TeslaMate database. It has its own name and logo, uses descriptive TeslaMate references, and includes your exact unofficial-project disclaimer. It reads PostgreSQL through a restricted account rather than MQTT; we acknowledge the schema is unsupported and direct users to our own issue tracker.

I noticed the current trademark policy limits the Tools permission to MQTT integrations. Could you confirm whether you consent to our descriptive use of the TeslaMate name in the README, website and app for this database-based companion? Repository: https://github.com/itchyparrot53/mate4mobile

We compared our current queries with your current dashboards and found no complete normalized matches, but are not claiming this proves provenance. We will investigate any specific licensing concern you identify.
