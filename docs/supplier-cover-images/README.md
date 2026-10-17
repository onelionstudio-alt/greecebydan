# PR #24 — supplier covers

**Draft / do not merge / no production deployment.**

## Actual staging result — blocked, 17 October

Owner deployed the correct original b2f45883 package; public hashes match.
Real browser searches returned three Boat/Milos and three Wine/Santorini tours.
Both safely render text cards without photos. The actual CI image gate
39040390054 failed: no verifiable supplier covers in the returned DTO. This is
not permission to weaken source/CDN checks. It does not yet identify which raw
image field failed validation.

A new staging-only diagnostic package is prepared:
[staging-pr24-provenance-4656aae4.mjs](staging-pr24-provenance-4656aae4.mjs).
Source commit `4656aae440bd4039b7d8cc0d378a3a631e9da4be`, ordinary API SHA256
unchanged (`9a889827d5a1fd1a902e79d178e7a964cf521c6143d72b087287883787b578ca`).
Bundle SHA256 `14b1ac6e04429650dd1bfd87f59711cc6eb712213c51ca33233cdc48de9363c9`.
It adds only redacted image provenance to staging /search responses for the
selected products: source/cover/dimensions/host/syntax indicators, no raw image
URLs, captions, reviews, private field values, headers or secrets. The ordinary
Worker source and runtime assets are unchanged. Public metadata adds
`imageProvenanceAudit:true`; analytics and legacy photos stay forced false.
New preview privacy/isolation tests: 4 PASS locally. Further owner staging
replacement is required. The next real QA is provenance-only, not image release
verification. Before/after photo improvement and performance remain unverified.


## What changed

See [the pre-implementation audit](AUDIT.md) for the redacted permission summary,
current live-search architecture and official schema links. No private email is
published. Only the new `supplierCover` DTO may render; the old `image` remains
null. Worker `SUPPLIER_COVERS_ENABLED` is false in both configuration examples.
Legacy `VIATOR_IMAGES_APPROVED` and `INTERACTIONS_ENABLED` remain false. The
client supplier gate cannot activate legacy images or events.

- Exact `imageSource=SUPPLIER_PROVIDED` and `isCover=true` required. Missing or
  other sources are never inferred from a filename, cover flag or list position.
- Original variant URL and dimensions; two allowlisted CDN hosts; around 720px
  wide, bounded dimensions, no URL rewriting, proxying or image storage.
- Result cards only: 128px contained image, full subject, neutral title-based
  alt, dimensions, lazy loading, async decode and no referrer. No comparison
  images, galleries, new reviews or recommendation changes.
- A failed/invalid/missing/expired image removes itself; existing text/CTA remain.
- When enabled, every search goes straight to `/products/search`. No cached
  product/image response is reused and no stale fallback is served on failure.
  Auxiliary taxonomy caches remain as before. No new Viator endpoints.
- Five-minute visible-page expiry, also checked on visibility/pageshow and
  comparison. No background API polling, persistent client storage or ingestion.
- Search's official active-only contract is the status source; its ProductSummary
  has no status field. An explicit INACTIVE/unexpected status is rejected
  defensively. Fresh search replaces results, so removed products/photos cannot
  survive in our result cache. Idle page photos expire; this is not a claim of
  instant/continuous product-status monitoring.
- Concierge img-src CSP permits self/data and the two exact CDN hosts. Other
  existing directives/Cloudflare policies must also permit images; validate on
  remote staging. The privacy draft now explains direct CDN processing.

## Validation recorded so far

- 30 Node Worker/OAuth tests: PASS locally (existing 25 + 5 supplier tests).
- Existing full Python suite: 17 PASS; the new explicit supplier staging mode
  was also tested separately (3 preview tests PASS).
- Existing browser regression plus new synthetic boundary tests: CI pending.
- The synthetic boundary tests exercise ownership, URL, expiry, broken images,
  empty fallback, exact CTA, 2/3 comparison, keyboard focus, overflow and axe at
  320/390/768/1440 in Chromium and WebKit. A mock pixel is only a test resource,
  not a supplier photograph or permission evidence; no mock photo screenshots
  are presented as before/after.
- Real staged payload/CDN loading, actual before/after screenshots, observed
  network/performance metrics and remote flags: **BLOCKED until owner deploys**.
- Physical iOS/Android, VoiceOver/TalkBack and field performance: not tested.
- This environment has not independently read the partner dashboard's named
  access tier or certification status. Search/auxiliary endpoints were previously
  verified; image payload capability still needs the new staged response.

## Isolated staging deployment

Original bundle (superseded for diagnosis): [staging-pr24-b2f45883.mjs](staging-pr24-b2f45883.mjs).

Local package checks PASS: syntax, wrong-host 404, public source metadata, and
/events 503 even with the enabling analytics binding.

API source SHA256: `9a889827d5a1fd1a902e79d178e7a964cf521c6143d72b087287883787b578ca`.
Bundle SHA256: `7227fb4f046871a56984335a963823b5ad8197eb8a743174cf979b396b0016d8`.
Runtime source b2f458831e71857ead87866013fb9e4efee52521; subsequent changes
only repair browser-test races and document validation, not runtime assets.

It packages
only the reviewed branch frontend and ordinary API source; no API keys, image
bytes or private email. Deploy **only** to
`greecebydan-travel-api-staging`, preserving existing secrets and SEARCH_LIMIT.
Never deploy the staging bundle to `greecebydan-travel-api` or production routes.
The wrapper rejects any other hostname and hard-forces legacy photos/events
false. Only the explicit `--supplier-covers` packaging option enables the new
supplier-only path. Public `/_preview/meta` records source and asset hashes.

After owner deployment, run `tests/browser-supplier-staging.cjs` via the read-only
staging QA workflow. Trigger by updating the RUN_REAL_STAGING marker on this
branch. It uses no fixtures or asset overlay; verifies deployed hashes, actual
DTO source/size/URL, direct CDN loads, text comparison, original affiliate URLs,
flags, no extra API/review/events requests, axe and all four viewport widths in
both engines. It records observed CLS/LCP and resource durations/transfer sizes,
not a guaranteed Lighthouse score; cross-origin transfer sizes may be zero
without Timing-Allow-Origin. Real before captures should use the published
PR23 production frontend; after captures use actual deployed staging.

## Gates still open

Real payload provenance and eligible CDN variants; current account tier/status;
real staging image loads and no unexpected request paths; actual before/after;
performance observations. Publication stays blocked until these are resolved
and the owner explicitly authorizes release. No production settings changed.
