# Inline Viator editorial cards — review only

## Technical audit and scope

Baseline: main `6213a71af025953940203e052c50f5428c4cb6d9` (released Food/Transfers). Decap already has a portable affiliate-button editor component. Markdown is rendered and sanitized by `scripts/build.py`. Article HTML contains author copy; concierge supplier covers are already validated by `supplierCover()` with explicit provenance, original CDN URLs and five-minute expiry. There was no public product-detail route suitable for articles.

This change adds one Decap component, one optional article-only frontend script, scoped CSS and a small `/article-cover` adapter. It reuses the existing allowed `/partner/products/{productCode}` endpoint and supplier validator. It does not alter `selectionEvidence`, ranking, pricing, comparison, article content, routes, OAuth or existing image permissions. No price, rating, review, API title/description or `viatorUniqueContent` is exposed by the adapter.

## How Dan inserts a card

In the article Body, use the insert menu → **Viator-карточка с фото**. Enter an English title, optional English explanation (up to 500 characters), and the complete Viator product affiliate URL. The component appears exactly where inserted. Use factual author copy and check that the linked product supports any claim. The title is limited to 180 characters; at most three cards are accepted per page.

Portable Markdown:

````markdown
```viator-card
{"title":"Explore a Milos sailing option","text":"Review the route, weather policy and meeting instructions on Viator before choosing.","url":"https://www.viator.com/tours/Milos/Milos-oneiro/d22323-345728P2?mcid=42383&pid=P00320497&medium=api&api_version=2.0"}
```
````

The text above is **proposed preview copy only**, not an edit to an existing article. No real article was changed. Do not copy protected supplier descriptions into author fields. Existing plain links/buttons and end-of-article links remain valid.

## Data and fallback

- Static HTML: escaped English author title/text, exact supplied affiliate URL, sponsored/noopener/noreferrer, inline commission disclosure. No API media or protected content in indexed HTML.
- JS: only pages containing a card load the script. Up to three near-viewport cards; duplicate product IDs share one request. No retry, localStorage, event collector, photo or review endpoint.
- Adapter: exact product-code validation, same site Origin and existing shared IP rate limit; a single fresh product detail request with a ten-second limit; no own cache, proxy or image download. No keys, upstream errors or raw product bodies returned. Anonymous CORS is not authentication; the rate limiter remains the cost control, as on `/search`.
- Only explicit ACTIVE, matching product code and SUPPLIER_PROVIDED cover permit media. Unknown status/source, missing/removed/invalid image, timeout or error → compact text fallback with the editorial link, without an empty media block. An explicit INACTIVE response removes the CTA for that page view and displays an inactive notice. Without JS/network, the original editorial link remains; the card never promises availability.
- Images come directly from allowed Viator CDN domains at an original supplied variant URL. Fixed display bounds and object-fit:contain preserve the whole image. Neutral alt, width/height, lazy decoding/loading and no-referrer are set. Expired media is removed within five minutes and rechecked on page visibility/pageshow; no auto refresh loop.
- Prices and ratings are absent. Existing supplier feature flag must be true. Legacy API-photo flag and interactions remain false.
- Article pages previously had no `img-src` CSP; this feature adds no broad policy affecting existing editorial hero sources. Both adapter and client validate the existing three CDN hosts, HTTPS, path, file type, dimensions and expiry. No arbitrary image URL is accepted from the editor.

## Review staging (never production)

Generate after committing the branch:

```sh
python scripts/build.py
python scripts/build_article_card_preview.py
python scripts/build_staging_preview.py --help
```

Package the normal staging wrapper with supplier covers and existing Culture/Food/Transfers enabled. The preview generator adds only `/article-card-preview/` to the temporary build, noindex and omitted from sitemap. The normal production build does not include it. The staging packager now rewrites `article-offers.js` to staging as well.

A remote real-response test is still required after the owner replaces **only** `greecebydan-travel-api-staging` with the reviewed staging module. Keep production unchanged, existing secrets/bindings intact, `INTERACTIONS_ENABLED=false` and `VIATOR_IMAGES_APPROVED=false`. No additional API key or photo permission is needed. Verify the preview actual image or honest no-photo fallback, original product URL, inactive/error behavior, and no forbidden requests. Local/mock tests do not establish a live supplier cover for this specific product.

## Validation

`article-offers.yml` runs full Node/Python checks plus Chromium/WebKit at 320/390/768/1440, axe, keyboard/fallback/expiry/source boundaries and the existing Boat/Wine/Culture/Food/Transfers and comparison suites. Its screenshots containing the single-pixel media fixture are explicitly **synthetic UI boundaries, not real tour photos**. Text-only screenshots are representative fallback previews. Real staging validation and photographs must be reported separately. Physical iOS/Android are not available/tested.

Do not merge or publish until review and separate owner approval.
