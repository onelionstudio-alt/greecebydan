# Supplier cover images — pre-implementation audit (2026-10-17)

Base: main `d71f70347da33fc22d0c72a51784f79c459e0447` (published PR #23).
Production API source was owner-deployed and its additive evidence DTO was
verified in the production browser. Cloudflare dashboard configuration and the
account's named access tier are not accessible to this development environment.

## Permission and schema

The owner's actual Partner Support reply of 17 October was read. This is a
redacted technical summary, not a reproduction of private correspondence:
supplier-provided cover variants may appear in search, comparison and editorial
recommendations on the registered partner site; load original variant URLs from
the CDN; responsive fitting must preserve the subject; no photographer credit
is mandatory; captions are optional. Removed URLs and inactive products must
be removed promptly. Preserve exact API productUrl and external booking handoff.
Exclude review photos and protected unique content. Original correspondence
remains private; no sender/recipient addresses, message IDs or signatures are
included here. The reply also discusses reviews, ingestion and timeouts; it is
not evidence that this account has Full or Booking access.

Official schema inspected on 17 October:
- https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/Image.yaml
- https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ImageSourceType.yaml
- https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ImageVariant.yaml
- https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSummary.yaml
- https://docs.viator.com/partner-api/technical/#operation/productsSearch
- https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/paths/products@search.yaml
- https://partnerresources.viator.com/travel-commerce/managing-product-availability-data/
- https://partnerresources.viator.com/travel-commerce/levels-of-access/

ProductSummary.images uses Image; imageSource can be SUPPLIER_PROVIDED or
PROFESSIONAL. isCover means leading image **for that source**, not ownership.
imageSource is optional, so unknown/missing source must fail closed. Variants
contain original url and integer width/height. Official examples use
media.tacdn.com and hare-media-cdn.tripadvisor.com. Subsequent real account
provenance verification (run 39040867501) confirmed media-cdn.tripadvisor.com
with SUPPLIER_PROVIDED cover variants for six Boat/Wine products. The corrected
implementation adds this third exact CDN host. Actual account responses,
CDN sizes and image loading remain a required real staging gate, not inferred
from schema examples. No photo/review endpoint is needed.

## Existing architecture and findings

Only /destinations, /products/tags and /products/search are used for Viator.
Search requests contain up to 50 candidates; existing Boat/Wine filtering and
ranking return at most three. This is the live search model, with auxiliary
data cached for seven days and raw search responses cached for 900 seconds.
No local catalogue, ingestion or modified-since feed exists. Official search
documentation says only active products are returned; ProductSummary has no
status field. Do not invent an ACTIVE field or add detail/ingestion calls.

The dormant legacy photo path selects isCover without checking imageSource.
It also permits an image URL from a cached response and has no visible-page
expiry. It must remain disabled and must not be reused as authorization.
All API content is loaded at runtime; API responses have no-store and noindex.
No new API product content is to be added to built HTML. Existing ratings and
review handling are unchanged by this work; support's broader review-indexing
guidance merits a separate compliance review, not silent expansion of PR #24.

## Minimal safe design

Introduce a distinct supplierCover DTO and SUPPLIER_COVERS_ENABLED flag;
VIATOR_IMAGES_APPROVED and INTERACTIONS_ENABLED remain false. Require exact
SUPPLIER_PROVIDED + isCover true + HTTPS allowlisted CDN + valid dimensions.
Keep the legacy image DTO null even if the legacy flag is accidentally enabled.
Choose one supplied variant around 720px wide, without URL rewriting.

When supplier covers are enabled, bypass search-response caching entirely.
Never serve stale results after an upstream failure. New searches replace the
whole result/shortlist and removed images disappear immediately. Explicit
INACTIVE (or unexpected explicit status) is rejected defensively before ranking;
the normal status-less search schema remains supported. No claim of continuous
status monitoring: a new user search rechecks current search eligibility.
Expire visible supplier photos after five minutes, also on visibility resume
and before comparison; no automatic API calls or persistent client storage.
This bounds an idle-page image's lifetime without mixing ingestion models.
No image bytes are downloaded, mirrored, proxied or stored by our servers.

Use compact, uncropped, contained photos on result cards only. Keep comparison
text-first and structurally unchanged. Missing, invalid, expired and failed
images leave the existing text card, not an empty placeholder. Neutral tour
alt text; width/height, fixed compact display slot and lazy decoding/loading.
Do not change recommendations, evidence, pricing, CTA URLs, CMS, OAuth or SEO.

## Files expected to change

- travel-worker/worker.mjs, worker.test.mjs and wrangler examples: strict DTO,
  fresh search only when enabled, independent default-off supplier flag.
- assets/js/concierge.js, assets/css/style.css: bounded image rendering/fallback.
- scripts/build.py: separate supplier-only client gate; legacy flags stay off.
- scripts/build_staging_preview.py and tests/test_staging_preview.py: explicit
  opt-in supplier staging mode, still hard-off legacy photos/events.
- tests/browser-smoke.cjs: retire legacy photo-enable fixture expectations.
- new supplier-specific browser/unit QA and read-only CI; existing card
  regression remains required.
- privacy page only if its current image description requires an accurate,
  narrowly scoped CDN-processing clarification; no analytics activation.
- docs/supplier-cover-images: redacted audit, test report, deployment bundle
  and before/after evidence; no private email or image binaries.

## Release gates

No production activation or merge. Real staging must show explicit source,
dimensions and original CDN URLs for Boat/Wine, successful direct image loads,
unchanged affiliate URLs and no added API/photo/review/analytics calls.
Physical iOS/Android are unavailable. Named account tier/certification status
requires owner dashboard confirmation; do not infer this from a working search.
