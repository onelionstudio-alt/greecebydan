# PR #24 — supplier cover implementation and verification

**Review only: no merge or production deployment is authorized.**

## Scope and permission

Based on published PR #23 / main `d71f70347da33fc22d0c72a51784f79c459e0447`.
See [audit and redacted Partner Support permission](AUDIT.md). No private
correspondence, addresses, signatures or credentials are published.

The real account returned explicit `SUPPLIER_PROVIDED`, `isCover:true` and
integer image variants for all six selected Boat/Wine products. See
[redacted provenance](evidence/provenance-summary.json). The real CDN is
`media-cdn.tripadvisor.com`; its initial omission from our allowlist was found
by real staging, then corrected in Worker, client and CSP. Only this exact host
was added; no source checks were weakened. The other allowed hosts are
`media.tacdn.com` and `hare-media-cdn.tripadvisor.com`.

## Minimal implementation

- New `supplierCover` DTO and independent `SUPPLIER_COVERS_ENABLED` flag,
  default false in both configuration examples. Legacy `image` stays null;
  legacy photo API and interaction analytics remain disabled.
- Explicit supplier source and cover flag; validated HTTPS URL, exact host,
  `/media/` path, supported extension, bounded integer dimensions. Select one
  original variant around 720px; no URL transformation, proxy or mirroring.
- Results only: compact 128px contained image, neutral title-based alt,
  width/height, lazy load, async decode, no-referrer. No image in comparison,
  gallery, slider, new rating/review field or decorative placeholder.
- Missing, rejected, failed or expired images leave the compact text card and
  exact original affiliate CTA intact.
- When enabled, every search goes directly to `/products/search`, bypassing
  product/image response caching; upstream failure never serves stale results.
  Existing destination/tag taxonomy caches and API endpoints are unchanged.
- Visible photos expire after five minutes, also checked on resume and before
  comparison. New searches replace old results. No background polling,
  persistent client storage, catalogue ingestion or additional photo API.
- Official search contract returns active products only; its summary has no
  status field. Explicit INACTIVE/unexpected status is defensively excluded.
  This is bounded live-search freshness, not continuous status monitoring.
- Concierge img-src CSP allows only the three named CDN hosts plus existing
  self/data. No API product content added to indexable built HTML.
- Narrow Privacy Policy clarification explains direct CDN technical connection
  data, no referrer, no mirroring/traveler photos, no interaction analytics.
- `selectionEvidence` remains byte-for-byte identical to main. Boat/Wine
  ranking, pricing, exact productUrl, comparison, CMS/OAuth, articles, routes,
  SEO structure and existing disclosure are preserved.

## Remote staging identity

Owner deployed [the corrected bundle](staging-pr24-cdn-d22c0f5f.mjs) to
`greecebydan-travel-api-staging` only. Public metadata confirms:

- Runtime source `d22c0f5f169d82056db78dd0f1cbb9cfe1a777d6`.
- API SHA256 `a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916`.
- Bundle SHA256 `a3d5ce7927728b4dbb73804585a7c8b62a22831a4475c1187822f9a6dda88029`.
- `apiPhotos:false`, `interactionEvents:false`, `supplierCovers:true`.
- `imageProvenanceAudit:true`: staging-only redacted source/dimension/host
  diagnostics; no raw unapproved URLs or private fields. Not in production API.

Subsequent test/report commits do not change this runtime. No new deployment is
needed for those commits. Older original/provenance-only bundles are historical
and superseded. Preview rejects production hostname, has noindex/no-store and a
visible staging banner, and hard-disables the legacy photo/events flags.

## Automated regression

- [Full publishing regression 39041813042](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39041813042): PASS, 19 Python tests, 30 Node Worker/OAuth tests, existing browser smoke. Deploy skipped.
- [Supplier boundary and existing card QA 39041808986](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39041808986): PASS, Chromium/WebKit at 320/390/768/1440, ownership/cover/URL/dimensions, removed/replaced/expired/broken images, INACTIVE, text fallback, exact affiliate URL, unchanged evidence/ranking/price rules, 2/3 comparison, keyboard focus, overflow and axe A/AA.
- Synthetic boundary tests use a mock pixel only to exercise failure boundaries;
  it is not permission evidence or a real supplier screenshot. Real staging
  below uses actual remote frontend/API/CDN, without fixtures or asset overlay.
- Preview isolation/privacy unit tests: 4 PASS (included in the 19 Python tests).

## Real staging and screenshots

[Real staging run 39041808944](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39041808944): PASS on deployed d22c0f5f runtime, all 16 Boat/Wine scenarios in Chromium/WebKit at 320/390/768/1440. [Raw real report](evidence/real-staging.json). Source/asset hashes, original affiliate URLs, comparison for two/three, zero axe violations and no extra photo/review/analytics calls passed. Separate `/events` invalid-body probe returned 503 `Events disabled`.

Each scenario loaded two actual supplier covers (HTTP 200) and safely removed a third whose CDN request reported `Redirect was not allowed`. A later [read-only network probe](evidence/performance-baseline.json) identifies a CSP rejection at `dynamic-media-cdn.tripadvisor.com`. We have not approved that redirect destination in this PR; the strict existing CSP remains. No fallback image is invented. This is a known partial-CDN-coverage limitation, not an API provenance failure.

**A screenshot review then found a CSS specificity issue:** `.page img` overrode the intended 128px height. Runtime correction 1aab0a45 scopes the selector to `.concierge-result .concierge-supplier-cover`; both browser suites now assert the computed 128px height. The previous matrix proves API/CDN behavior but does not certify the final compact layout. The corrected package needs isolated staging replacement and one final real matrix.

Prior actual after captures remain [in the Actions artifact](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39041808944); they show the pre-correction taller photos. They must not be represented as final compact-layout screenshots.

Independent [manual cloud-browser observation](evidence/manual-staging.json):
Boat and Wine each returned three real cards with two observed loaded 720x480
supplier images and one text fallback. Actual two-tour comparison worked.
The Oneiro CTA opened the matching Viator product with exact tracking parameters;
no purchase was made. After five minutes, all images disappeared while all three
cards and booking links remained. The manual observation alone does not identify
why the third image was absent; use automated network evidence for that claim.

Published PR23 before captures: [mobile 390px](evidence/before-production-boat-390.png)
and [desktop 1440px](evidence/before-production-boat-1440.png).

## Performance and limitations

Gzipped concierge JS grows from 5,995 to 6,447 bytes (+452); CSS from 4,508 to
4,512 (+4). No new frontend library, font or gallery. Direct CDN loading adds
third-party requests and can fail; compact fallback is deliberate. Performance
observations are lab samples, not field guarantees or a Lighthouse score.
Cross-origin transfer sizes may be unavailable without Timing-Allow-Origin;
unsupported LCP/CLS observations must be reported as unavailable, not zero.

Real pre-correction samples: search responses 538–855ms and images settled
684–1080ms in this CI environment. Chromium observed whole-navigation layout
shift sums of 0.115–0.312; WebKit does not expose LCP/CLS here. Those figures
include dynamic form/results/comparison updates and are not a photo-only CLS
measurement. [Controlled actual baseline/staging probe 39056202814](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056202814) records **zero observed layout shift** in both versions at 320/390px during the initial viewport and four seconds after results, before scripted scrolling/comparison. This does not prove field CWV or zero shift everywhere; it shows why the earlier whole-interaction sums cannot be attributed to photo loading alone. Two successful 720px images transferred 96,420 and 125,217 bytes (about 216 KiB total); the redirected image had unavailable transfer size. API samples: published baseline 154–211ms, staging 468–504ms. Different Workers/caching/requests make this observational, not an isolated photo latency benchmark. The enabled path deliberately fetches fresh search data instead of the legacy search cache.

Physical iOS/Android, VoiceOver/TalkBack and field performance were not tested.
The partner dashboard's named account tier/certification was not independently
read; only actual existing search/auxiliary access and typed supplier image
responses are confirmed. We do not claim Full/Booking access.

Computed-height correction: [browser QA 39056101440](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056101440) PASS in Chromium/WebKit at all four widths, including actual 128px computed height. All 30 Node tests also pass after this CSS-only runtime change.

## Next isolated staging package

[staging-pr24-compact-1aab0a45.mjs](staging-pr24-compact-1aab0a45.mjs)
contains the CSS specificity correction only in runtime assets; no Worker API,
ranking, evidence, price, affiliate or permission changes.

- sourceCommit `1aab0a45510497f4829cee27b704e19e7f8c94b7`
- API SHA256 unchanged: `a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916`
- bundle SHA256 `e87c148e299a98b5ab1486c6df99038c2b63e57e1a7cbc7c972dfcafd58b042c`
- 376,811 bytes; syntax, source/flags/CSS metadata, events 503 even with enabling binding and production-host rejection all PASS locally. Flags stay legacy photos/events false and supplier covers true.

Replace only the existing staging Worker's code, preserving secrets/bindings.
Do not deploy to production. Final compact-layout screenshots and real staging
assertions are BLOCKED until this owner action. No access key should be shared.

## Failure history and release boundary

Initial real run 39040390054 correctly rejected the then-unallowlisted real CDN.
Provenance-only run 39040867501 identified it. Runtime correction d22c0f5f adds
that exact host. Run 39041289885 exposed a test locator race when an image was
removed by the intended fallback; the test now checks each card and records
loaded versus fallback. Run 39041517887 timed out before the staging form loaded;
no passing real matrix is inferred from that partial run. The successful 39041808944 run added
HTTP/error diagnostics. Performance probe 39056101504 failed due to a test-only request-event API error; corrected probe 39056202814 succeeded. Failed runs are not silently counted as PASS.

Do not merge, enable production supplier covers or deploy without explicit owner
approval. PR #22, main and production are unchanged.
