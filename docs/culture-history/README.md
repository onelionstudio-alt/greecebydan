# Culture & History — isolated implementation

**Status: implementation and recorded-response/browser QA complete; real new
frontend + Worker staging verification awaits the owner upload in STAGING.md.**

Baseline: published main b37919d2f57883aa2a772aa4b3f3f7d23aede68b.
Branch: feat/concierge-culture-history. No production deployment or merge.
Audit: ../category-expansion on the separate audit branch; real runs
39060633333 and 39062034051. Those are data-access evidence, not this implementation's E2E.

## Scope and questions

Reuse the current concierge, compact cards and 2–3 comparison. Three places only:
Acropolis in Athens, Delphi and Meteora. The destination is the place visited,
not a verified departure city. Keep Olympia out until guided site inventory is
adequately evidenced. No Food, Transfers, Ferries, maps, articles or CMS changes.

Existing questions: destination, private/open, what matters, starting-amount
budget and cancellation. Culture adds a shared-group option and “Included guide
service” to those controls, not a separate questionnaire. The latter is selected
when switching to Culture. “Show me a few ideas” can include an itinerary whose
guide service is unknown; its guide languages stay unconfirmed. The runtime
checks and scoped unknowns, not title marketing, determine eligibility.

Duration remains a card/comparison fact rather than an unsupported hard filter.
There is no step-free, medical suitability, accessibility or inside-every-site
filter. No party/date availability or final price lookup.

## Worker and evidence

- CULTURE_ENABLED must equal `true`; absent/false leaves Boat/Wine and the old
  /destinations response unchanged. The frontend discovers the additive
  capability on its existing /destinations request and hides Culture otherwise.
- Server validates the existing six preference fields, Culture-only mood/style,
  and Greek destination IDs resolved to exactly Athens/Delphi/Meteora. Client
  cannot select tag IDs, detail paths, endpoints or URLs. Live English historical
  tag names must resolve unambiguously. A narrowly observed `Deplhi` spelling in
  product titles is treated only as a Delphi topic alias, never as feature proof.
- Preserve the body of selectionEvidence byte-for-byte. Culture appends separate
  allowlisted viator_product facts with product code, checkedAt, field and typed
  value. Existing Boat/Wine fact codes, ranking, filters and price rules remain.
- GUIDE language alone is insufficient. Included guide service requires an
  explicit licensed/professional/local/tour-guide inclusion, no negative/optional
  or extra-cost condition in it, no guide exclusion, and compatible human GUIDE
  languages across inspected options. Unknown option coverage fails this hard
  requirement. Driver/escort commentary is not promoted to site guidance.
- Explicit inclusion is still a supplier statement. Do not promise that the guide
  enters every site or that every option covers the same admissions. Inside-site
  scope must be confirmed on Viator; no invented licensed qualification claim.
- Private/shared uses itinerary.privateTour only with inspectable, nonconflicting
  options. A private/shared option conflict makes the group unknown. Structured
  shared maximum is shown only for confirmed shared scope, not vehicle capacity.
- Languages are the intersection of inspected human GUIDE option languages,
  sorted to prevent false comparison differences caused by API ordering.
- Meeting/pickup is only a logistics method; no coordinates/address invented from
  location refs. Option-specific logistics override parent logistics. Method is
  option-dependent if it differs; even matching methods do not prove identical
  addresses. Pickup area/time and transport route remain to be checked.
- Admission can be “some fees not included” from stop admissions/exclusions or
  unknown; never assume all tickets included from generic fee or voucher fields.
- Physical effort is a scoped supplier statement. Contradictory easy/hard flags
  become unknown; no wheelchair or stairs guarantee follows from missing data.

## Request and freshness budget

One live /products/search, at most six fresh /products/{validated-code} reads,
two concurrent, at most three rendered recommendations. The bound is six rather
than the audit's preliminary three-detail estimate because actual exclusions
reject nominally guided candidates. No extra page or unbounded fill-up request.
Warm maximum seven requests; cold adds two auxiliaries (nine total). A 28-second
Culture upstream deadline bounds auxiliaries/search/details; per fetch <=10s.
No automatic retries or partial/stale fallback after an upstream failure. Keep
preferences for manual retry. It may return fewer than three or no matches.

Culture does not cache search or details. Auxiliary taxonomy retains the existing
seven-day cache. INACTIVE or missing product status rejects the product. Product
identity mismatch and upstream errors fail the search safely, without exposing
upstream text or keys. Returned cover metadata comes from the fresh detail, so a
removed detail image does not survive via the earlier search response.

Keep the existing supplier-cover selector, CDN allowlist, TTL and frontend
rendering. No new image endpoint, gallery, review, analytics or availability API.
Keep exact search productUrl bytes including attribution. Prices stay unknown
unit. Protected unique content, reviews and supplier/contact details are not
copied into the new Culture DTO or indexable HTML. Existing rating behavior is
unchanged; no new review content is requested.

## Current selection limits

- Culture-specific classification is deliberately conservative, not complete
  inventory. First 50 search candidates, then at most six details; results may
  miss valid products or none may satisfy hard preferences.
- Delphi currently searches the Delphi destination. Local guided visits do not
  establish an Athens-departure day trip. Do not describe this MVP as a verified
  Athens→Delphi transport planner. No route/arrival/transport guarantee.
- Meteora transport/escort products may not include monastery interior guiding;
  they will be excluded from the included-guide filter where not confirmed.
- No physical iOS/Android device testing is available. Chromium/WebKit tests are
  browser engines with configured viewports, not physical phone verification.

## Verification / release gate

CI [39064010454](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39064010454)
PASS for source 840bcfb98044a4dc1aa2c14dfabc38b7d6aef7ab: 38 Worker/OAuth
tests, 20 Python build/preview tests, Culture recorded-response UI, existing
Boat/Wine cards and supplier boundaries in Chromium/WebKit at 320/390/768/1440.
Culture axe violations: zero; keyboard, comparison 2–3, empty/error/missing
conditions and unexpected-network checks pass. See evidence/qa-summary.json.
Screenshots labelled recorded are UI evidence, not live availability or live E2E.

Real **implementation** staging E2E is BLOCKED until the owner replaces the audit
bundle on the existing staging Worker. No secret or new binding is needed.
The deployable preview is prepared after source review; see STAGING.md for the
exact file/commit/hash. Then check each Culture place, strict and open filters,
2–3 comparison when available, exact affiliate links, disabled analytics/legacy
photo flags, and Boat/Wine regression with real responses. Do not bypass a
Cloudflare/Viator block or call a synthetic response a live PASS.

Not ready to merge/release until that real staging gate is closed. Keep the PR
as draft until evidence and any selection limitations have been reviewed.

## Screenshots

These illustrate UI states using the recorded permitted API field projection,
not fresh API availability. The before captures the existing page entry state;
after captures the new Culture result cards (no image placeholders). They are
not matched before/after search inventories. Prices are the actual recorded
search starting amounts, with units explicitly unknown.

| View | Before | Culture cards | Comparison |
| --- | --- | --- | --- |
| Mobile 390 | [Before](evidence/before-390.png) | [After](evidence/after-390-recorded.png) | [2–3 options](evidence/compare-390-recorded.png) |
| Desktop 1440 | [Before](evidence/before-1440.png) | [After](evidence/after-1440-recorded.png) | [2–3 options](evidence/compare-1440-recorded.png) |
