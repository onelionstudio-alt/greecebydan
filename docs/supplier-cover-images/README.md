# PR #24 — supplier covers: implementation and validation

Review only. **No merge, production deployment or production feature activation
is authorized.** Base is published PR #23 / main
`d71f70347da33fc22d0c72a51784f79c459e0447`; PR #22 is untouched.

## Permission and actual account data

[Pre-implementation audit and redacted support permission](AUDIT.md).
The actual Partner Support reply was read; private correspondence, addresses,
signatures and message identifiers remain private. Permission covers supplier
cover variants on the registered partner site, direct original CDN URLs and
responsive fitting preserving the subject. No traveler photos or protected
unique content are used by this feature.

[Actual redacted provenance](evidence/provenance-summary.json) confirms
`SUPPLIER_PROVIDED`, `isCover:true` and integer variants including 720x480 for
all six selected Boat/Wine products. `isCover` alone is never ownership evidence.
The actual API host `media-cdn.tripadvisor.com` was missing from the initial
allowlist; real staging identified it and the exact host was added in Worker,
frontend and CSP. Two other allowed hosts are `media.tacdn.com` and
`hare-media-cdn.tripadvisor.com`. Unknown sources and lookalike hosts fail closed.
The account dashboard's named access tier/certification was not independently
read. Only actual existing search/auxiliary capabilities and supplier image
responses are confirmed; there is no claim of Full/Booking access.

## Minimal runtime changes

- Independent `SUPPLIER_COVERS_ENABLED` flag, false in both Worker configuration
  examples. Only the explicit supplier path is enabled on isolated staging.
  Legacy `image` stays null; legacy photo API and analytics remain disabled.
- One cover with explicit supplier source/cover flag, valid bounded integer
  dimensions and original HTTPS variant URL on an exact allowed host; `/media/`
  path and supported image extension. Choose around 720px, no URL rewriting.
- No image proxy, local mirroring, galleries, sliders, traveler/review photos,
  photo/review API endpoints or new rating/review fields.
- Results only: 128px contained image, neutral title-based alt, width/height,
  lazy loading, async decode and no referrer. CSS is scoped to the result card
  so the site's `.page img` rule cannot override its height. Comparison remains
  text-first with no photos.
- Missing, invalid, failed and expired photos remove themselves; text and exact
  affiliate CTA remain, without a blank photo placeholder.
- Enabled searches go straight to `/products/search`, bypassing product/image
  response caching. No stale results on upstream error. Existing destination/tag
  caches and endpoints remain unchanged. No ingestion or background polling.
- Five-minute visible-photo expiry, also checked on pageshow/visibility resume
  and before comparison. New searches replace prior photos/products. Official
  search contract returns only active products; its summary has no status field.
  Explicit inactive/unexpected status is defensively excluded. This is bounded
  live-search freshness, not continuous product-status monitoring.
- Narrow concierge img-src CSP and Privacy Policy clarification for direct CDN
  connection data. No new API content in indexable built HTML.
- `selectionEvidence` is byte-for-byte unchanged from main. Boat/Wine selection,
  ranking, prices/unknown units, original productUrl including tracking,
  comparison structure, CMS/OAuth, articles, categories, routes, SEO and existing
  disclosure are preserved. No History, Food, maps, My Trip or event collection.

## Deployed isolated staging

Owner deployed [staging-pr24-compact-1aab0a45.mjs](staging-pr24-compact-1aab0a45.mjs).
The old d22c0f5f and provenance-only bundles are superseded.

| Identity | Value |
| --- | --- |
| Runtime source | `1aab0a45510497f4829cee27b704e19e7f8c94b7` |
| API SHA256 | `a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916` |
| CSS SHA256 | `7acff9ecb013a017225db700e9769b5e680b2d2ccb8fca1a7f7dc1ccc3a6abd0` |
| Bundle SHA256 | `e87c148e299a98b5ab1486c6df99038c2b63e57e1a7cbc7c972dfcafd58b042c` |
| Legacy flags | `apiPhotos:false`, `interactionEvents:false` |
| Supplier path | `supplierCovers:true` |
| Staging diagnostic | `imageProvenanceAudit:true` |

Later commits change only QA/report/evidence, not runtime. Preview is restricted
to the staging hostname, rejects production hostname, has noindex/no-store and a
visible banner, excludes admin and hard-disables legacy photo/events even if
bindings attempt to enable them. Staging-only provenance diagnostics contain no
raw unapproved URLs or private field values and are absent from ordinary Worker.
No further owner staging replacement is needed for documentation commits.

## Automated and real validation

[Final actual staging run 39056690453](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056690453): **PASS, all 16 scenarios** on the deployed compact-height runtime. Boat/Wine × Chromium/WebKit × 320/390/768/1440. Actual computed height is 128px. [Raw final report](evidence/real-staging.json).

Verified remote source/asset metadata consistency, Worker API hash, explicit supplier DTO, successful direct CDN loads, exact affiliate href, two/three comparison, no overflow, zero axe violations and no extra photo/review/events requests. All eight browser contexts recorded zero normal UI analytics calls. A separate invalid-body `/events` diagnostic returned 503 `Events disabled`; this was not an interaction event. Across the matrix, 32 images loaded and 16 cards correctly used CDN-error text fallback.

[Final repeated publishing regression 39056694124](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056694124): PASS; production deploy skipped. This marker-only run uses the same runtime as the already-passing corrected-code regression below.

- [Corrected-code full publishing regression 39056206977](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056206977): PASS, 19 Python tests, 30 Node Worker/OAuth tests, existing browser smoke; deploy skipped.
- [Corrected-height card and supplier QA 39056202824](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056202824): PASS, Chromium/WebKit at 320/390/768/1440. Source/cover, invalid/missing URL/dimensions, image removal/replacement, explicit INACTIVE, expiry/broken image, text fallback, computed 128px height, original affiliate URL, two/three comparison, keyboard/focus return, overflow and axe A/AA.
- Four preview privacy/isolation tests are included in the 19 Python tests.
- Synthetic boundary tests use a mock pixel solely to exercise boundaries, not
  as supplier permission evidence or real-photo screenshots. Real staging uses
  actual deployed frontend, actual Worker and API CDN photos, no fixture/overlay.
- [Independent actual cloud-browser check](evidence/manual-staging.json): matching
  Oneiro Viator landing page opened from real results/comparison with original
  tracking parameters, no purchase. Actual idle five-minute expiry removed all
  photos while retaining three cards and three booking links.

## Known CDN fallback

Each earlier real scenario loaded two verified covers (200) and left the third
as a text card. [Actual network probe](evidence/performance-baseline.json) shows
CSP rejects the third image's redirect to `dynamic-media-cdn.tripadvisor.com`.
That additional destination is not admitted in this PR. It is not evidence of
missing supplier provenance or permission to scrape/replace a photo. Partial
CDN coverage is an explicit limitation; missing-photo fallback is supported.

## Before / after screenshots

| Viewport | Published PR23 before | Final actual staging after |
| --- | --- | --- |
| Mobile 390px | [Boat before](evidence/before-production-boat-390.png) | [Boat after](evidence/after-real-chromium-boat-390.png) |
| Desktop 1440px | [Boat before](evidence/before-production-boat-1440.png) | [Boat after](evidence/after-real-chromium-boat-1440.png) |

Additional final samples: [Wine mobile](evidence/after-real-chromium-wine-390.png), [Wine desktop](evidence/after-real-chromium-wine-1440.png). All four viewport sizes in both engines, including 320px WebKit, are in the final run artifact.

Production before captures show published PR23; final after captures must come
from the owner-deployed compact-height staging. Prices/review totals in a
screenshot are observed API samples, not a quotation or availability guarantee.
All real matrix viewport/engine screenshots remain in its Actions artifact.
No synthetic photo screenshot is represented as a real before/after result.

## Performance and accessibility limits

Gzip JS: 5,995 → 6,447 bytes (+452); CSS: 4,508 → 4,514 (+6).
No new frontend library/font. Two successful 720px images transferred about
216 KiB total in the controlled probe; loading is direct and lazy. CDN failures
remain possible and fall back to text. Fresh search bypasses the legacy search
cache deliberately, so API timing is not isolated photo overhead.

[Actual baseline/staging probe 39056202814](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39056202814) observed zero initial-viewport layout shifts at 320/390px during four seconds after results, before scripted scrolling/comparison. It is not a field CWV guarantee. Final full-interaction accumulated non-input layout-shift values range 0.108–0.378 and include form/results/comparison changes across the scripted journey; these are not a photo-only or standard field CLS measurement. They must not be presented as a passing Core Web Vitals score. The controlled initial-viewport probe above does not cover every scrolled interaction or slow device. WebKit does not expose LCP/CLS in this environment. Cross-origin transfer size can be unavailable without timing permission; zero is not assumed to mean zero bytes.

Final actual matrix: search response **548–939ms**, images settled **723–1284ms** after search click. These are CI lab observations without mobile-network/CPU throttling, not promised user timings. Existing text results/CTA do not wait for image success. No Lighthouse score or physical-device performance claim is made.

Axe A/AA, keyboard disclosure/selection and focus return are verified by browser
suites; this is not a complete assistive-technology certification. Physical
iOS/Android, VoiceOver/TalkBack and field performance were not tested.

## Failure history and release boundary

Initial real gate 39040390054 correctly rejected the then-unallowlisted actual
CDN. Provenance run 39040867501 identified it. Run 39041289885 exposed a test
locator race on intended image removal; tests now record each card's loaded or
fallback outcome. Run 39041517887 timed out before form loading; no pass was
inferred. Real run 39041808944 then passed 16 scenarios, but screenshot review
found height overridden by global CSS. Runtime 1aab0a45 fixes specificity and
adds computed-height assertions. Performance probe 39056101504 had a test-only
request-event API error; corrected 39056202814 completed. Failed/partial runs
are not silently counted as release PASS.

**Ready for owner review**, with the known partial-CDN-coverage and physical-device/field-performance limitations above. There is no remaining required staging replacement. A separate explicit owner decision is still required before merge or production activation. Only the new supplier-only path may then be considered; legacy photo APIs and analytics must remain off. Named access-tier/certification is a documented unverified dashboard detail, not represented as confirmed by these endpoint tests.

Main and production remain unchanged. No merge, production deploy, feature
activation or analytics collection without separate explicit owner approval.
