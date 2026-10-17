# Concierge category expansion — Phase A, 17 October 2026

**Preliminary audit: production architecture and official schemas verified;
new-category live account responses pending isolated staging probe.**
Base: published main `b37919d2f57883aa2a772aa4b3f3f7d23aede68b` (PR23 cards,
PR24 supplier covers). No production/main changes. No Culture implementation or
Food/Transfer/Ferry feature has been enabled. Readiness below is deliberately
conditional; an existing/public listing is not date-specific bookability.

## Technical findings

- One Cloudflare Worker serves destinations and search. Boat/Wine preferences,
  category tag aliases and qualification are hard-coded in a small number of
  functions. New kinds currently fail validation. Several two-way ternaries
  would incorrectly treat a third kind as an existing category if naively
  extended. Do not merely add an HTML option.
- Existing Viator endpoints: `/destinations`, `/products/tags`,
  `/products/search`; auxiliary caches seven days. Supplier-enabled searches
  are fresh; one search returns at most 50 candidates and the adapter returns
  at most three recommendations. No product-detail enrichment exists today.
- Search ProductSummary has title/description, destinations/tags/flags,
  duration, summary pricing, productUrl and existing media/rating metadata.
  It does **not** have structured logistics, inclusions/exclusions,
  additionalInfo, languageGuides or option-level conditions. Current DTO
  deliberately leaves departure unknown and price basis unknown.
- Product details can supply these missing structures. Official access table
  permits single-product content even at Basic Access; therefore an upgrade
  is **not assumed necessary**. Actual `/products/{product-code}` permission
  and returned fields must be tested with this account before designing
  filters around them. Search success is not evidence of named access tier.
- Current Experience Cards, safe productUrl rendering, errors, unknown pricing
  and two/three comparison can be reused. Frontend evidence accepts only four
  existing codes and title/description/flags provenance; new evidence needs
  explicit typed allowlists rather than arbitrary natural-language reasons.
- No Ferryhopper/FerriesinGreece integration, tracking configuration, timetable
  endpoint or embedded ferry widget was found in the active site code.
  Account approval and API/widget entitlements remain unverified.

## Field evidence contract

| Criterion | Potential API evidence | Safe interpretation / limits |
| --- | --- | --- |
| Destination/theme | Search `destinations`, `tags`; resolved live taxonomy; detailed itinerary | Candidate membership, not proof of every requested feature. Subject in title only scopes the topic. |
| Duration | Search `duration`; detail `itinerary.duration` | Fixed/range only. Missing stays unknown; not a guaranteed transport arrival time. |
| Private / shared | `flags:PRIVATE_TOUR`; detail `itinerary.privateTour`; `maxTravelersInSharedTour` | Positive private flag supports private listing. Missing private flag does not prove shared; shared needs explicit false. Group maximum requires a positive integer. |
| Human guide and language | `languageGuides[].type=GUIDE`, `.language`; option-level languageGuides | AUDIO/WRITTEN are not human guides. A listed language is not guaranteed for every option/date; distinguish a guided option from guided admission inside each site. |
| Tickets | Site stop `itinerary.itineraryItems[].admissionIncluded`, explicit inclusions/exclusions, option conditions | A voucher/ticket format is not an attraction admission ticket. Global fee inclusion may concern only some stops. Contradiction/optional tickets => unknown; no queue/security-line guarantee. |
| Meeting / transport | `logistics.start/end`, `travelerPickup`, option `logistics`; location refs | Resolve actual references when necessary, never destination-centre geocoding. Option logistics override product logistics when present. Pickup availability does not prove it is included in the chosen option. |
| Physical effort / mobility | `additionalInfo[].type`, explicit operator conditions, itinerary stops | Structured easy/moderate/hard and wheelchair flags remain scoped supplier statements. Wheelchair-accessible vehicle does not prove step-free sites. No absent stairs claim or personal fitness assessment. |
| Cooking / tasting | Cooking taxonomy + explicit activity description and inclusions; itinerary type is only supporting data | A lunch, food menu or cooking demonstration alone is not hands-on cooking. Ambiguous/negative/optional claims fail qualification. |
| Diet / allergy | Explicit supplier dietary conditions, restrictions and option scope | A vegetarian dish is not a vegetarian option for all guests; gluten-free menu is not cross-contamination/allergy safety. Never guarantee allergy accommodation. |
| Transfer capacity / baggage / seats | Explicit product/option descriptions and additionalInfo; exact route/pickup | No universal reliable search field for luggage, seats, waiting or 24/7 service. Shared-tour maximum is not vehicle capacity. Child seats available does not mean included/reserved. |
| Cancellation | Search FREE_CANCELLATION; detailed cancellationPolicy/refundEligibility | Flag is not a universal deadline or guarantee of full refund; option/date terms prevail. |
| Price / availability | Existing summary fromPrice and exact productUrl | Preserve unknown price units. No final party price, seat availability, vehicle availability or selected-date guarantee. No booking/payment endpoint needed. |

Unknown, unsupported, contradictory, option-dependent and supplier-listed must
remain distinguishable. Reasons carry product identity, exact field path,
checkedAt and bounded evidence value; they are not independent inspections.

## Category matrix

The Products column distinguishes existing editorial candidates from live API
confirmation. No new-category product has yet passed this account's audit.

| Direction / traveller task | Useful first questions | Fields to verify | Products currently evidenced | Confirmed now | Unknown / main risk | Complexity / readiness |
| --- | --- | --- | --- | --- | --- | --- |
| Acropolis, Athens: human-guided visit versus ticket/audio option | Private/shared; guided option; duration | GUIDE vs AUDIO; itinerary stop/admission; options; logistics; physical info | No account response yet; do not invent product codes | Schema supports scoped guide/duration/private evidence | Site admission, guide inside Acropolis, timed entry, stairs, accessible route; tour title can conceal ticket/audio-only product | Medium-high; live-data gate |
| Delphi: guided day trip or private visit | Departure place; private/shared; time available | Same + pickup/transport, itinerary duration and admission per stop | No account response yet | Single-product schema can carry relevant conditions | Athens versus Delphi meeting point; driver-only versus archaeological guide; tickets/transport options; walking surfaces | Medium-high; live-data gate |
| Meteora: guided/private visit with understood access | Departure place; private/shared; duration; access needs | GUIDE, start/pickup, transport, additionalInfo, stop admissions/options | Existing article links `6575PRIVATE`, `9451P12`, `132551P9`; **not revalidated as live API products for this expansion** | Existing article/context infrastructure and candidate identities in repository | Guide inside monasteries, stairs, dress/entry, closures, chosen pickup and route; transport does not remove steps | Medium-high; live-data gate |
| Ancient Olympia: archaeological experience | Departure place; guided/private; time | Archaeological topic + GUIDE + stop/admission + logistics | None yet | Schema only | Port excursion/transport-only can be mistaken for site guide; itinerary includes versus merely passes by | Medium; omit first release unless sufficient actual products/fields |
| Athens food walks | Walk/taste versus cooking; duration; private/shared; language | Food taxonomy, explicit activity, GUIDE, group size, inclusions | None yet | Schema can describe duration/guide/inclusions | Wine-only, market shopping or generic sightseeing; dietary/allergy terms cannot be inferred | Medium; after Culture verification + owner confirmation |
| Naxos farm cooking | Hands-on cooking; duration; language; meeting place | Cooking taxonomy + explicit participation, itinerary/inclusions/options, language | Article candidates `177192P1`, `420115P1`, `459053P1`; **no new live verification** | Existing editorial links and source article | Farm visit versus demo/class, transfers, actual group size, seasonal menu, dietary scope | Medium; after Culture + owner confirmation |
| Crete cooking / local tasting | Cooking versus tasting; locality; language; duration | Same plus actual destination/pickup scope | None yet | Schema only | Crete is not a single meeting point; lunch alone is not a class; allergy safety unknown | Medium; after Food proof + owner confirmation |
| Athens airport / port / private transfers; selected transport day trips | Exact route/direction; party size; luggage; child-seat need | Explicit route/option/vehicle conditions; pickup; additionalInfo; cancellation | None yet | Separate structured product details are possible in schema | Airport→city not airport→port; sightseeing not taxi; shared-tour size not vehicle capacity; flight delay/overnight/extra fees unknown | High; separate Transfer PR after owner approval; transport day trips remain Culture if sightseeing is the primary product |
| Ferries / island hopping | Route/date on provider only until approved integration | Approved referral URL, official widget or separately contracted live API | No configured integration or verified account entitlements | Provider publicly offers live widgets and separate B2B API/MCP | Affiliate approval does not grant custom API rights; stale timetables/fares; tracking/cookie/CSP requirements | Referral low; live integration separate; implementation prohibited until separate owner decision |

## Minimal architecture proposal — not implemented

1. Add a small server category-rule registry for tag aliases, valid preferences,
   candidate qualification and category-specific evidence. Preserve Boat/Wine
   rules and their defaults exactly; test against the current fixtures.
2. Keep the existing `selectionEvidence` function/contract and old fact codes.
   For Culture, append dedicated validated product-detail facts through a
   category adapter; do not rewrite the legacy function or accept raw reasons.
3. Keep one search pipeline and renderer. For the first Culture scope, use
   verified Athens/Acropolis, Delphi and Meteora destinations/topics only.
   Never accept arbitrary tag IDs, detail paths or URLs from clients.
4. One search and at most three detail requests for the selected shortlist;
   warmed taxonomy remains cached. Cold upper bound: two auxiliary + search +
   three detail calls = six upstream requests. Bound concurrency (at most two),
   deadlines and field sizes. No bulk/modified-since/catalogue ingestion,
   no availability/check, bookings, reviews or photo endpoints. Manual retry
   retains preferences; no automatic retry loop or stale suitability fallback.
5. Shared/private, duration and guide-type questions only where actual fields
   support them. If a required condition is unknown, fail that match and explain
   limited selection. Do not pad to three cards. Optional unknowns go into the
   existing disclosure, with short “Check on Viator” text.
6. Preserve original affiliate productUrl, unknown pricing rules, current
   supplier cover policy and disabled analytics. New compare fields only when
   known and compatible for every selected product; no suitability winner.
7. Site-wide design, articles, CMS/OAuth, routes and SEO stay unchanged. Small
   concierge labels/questions and additive DTO fields are sufficient. A shared
   universal ontology or a new recommendation engine is unnecessary.

## Sequence and effort estimate

Engineering estimates for one implementation stream; exclude owner/API-provider
waiting, contract changes and new editorial writing. Re-estimate after live audit.

| Step / proposed PR | Work | Estimate / release gate |
| --- | --- | --- |
| A: this audit branch | Code/schema review, matrix, bounded staging diagnostic | Initial audit prepared; 1–3 additional working hours to inspect real responses after staging deployment |
| B: Culture & History only | Additive rules/DTO/UI; Acropolis, Delphi, Meteora; Olympia only if evidenced; regression, real staging, browser/mobile/a11y | 18–30 working hours; independent implementation PR, no merge/deploy without owner approval |
| C1: Food & Cooking | Separate rules for hands-on cooking vs tasting, group/language/inclusions and explicit unknown dietary conditions | 12–20 working hours after Culture verification **and explicit owner confirmation** |
| C2: Transfers & Day Trips | Route/type/option matching, capacity/baggage/seat uncertainty; transport-only versus excursion separation | 22–38 working hours; separate owner-approved PR; narrow or postpone unsupported criteria |
| D: Ferries | Account/rights decision first; approved external referral as minimum | Referral-only 1–3 working hours once approved URL/terms exist; widget roughly 4–8 after rights/privacy/CSP review; custom API estimate requires agreed contract/scope |

No subsequent category work starts automatically. PR numbering is assigned by
GitHub when the Culture implementation PR is actually created.

## Ferry integration findings

Ferryhopper publishes live Search/Trips Widgets; setup is through the approved
affiliate dashboard, with the Trips Widget key requested from its team. FerryhAPI
is a separate B2B offering and can serve schedules/prices without ticket issuing.
MCP also exists; this is not an account entitlement or a reason to add another
agent/tool to our current concierge. Account approval and widget/API access have
not been verified here. Do not downgrade these options to “only referral exists,”
and do not claim our account has live access.

The 2 October 2026 affiliate terms require written participation approval,
approved channels/materials, conspicuous nearby affiliate disclosure, accurate
fares/schedules, unchanged tracking links, and prohibit scraping/mirroring the
platform. Use only provider-approved embeds; a generic iframe prohibition in
terms is not permission to invent our own frame. Do not install anything now.

FerriesinGreece publicly offers an affiliate booking-system option; it is a
candidate alternative, not evidence of live API access or this site's approval.
Its program page could not be fully fetched in this audit; commercial terms,
tracking and data rights remain unverified. A new provider is not a reason to
create a fake timetable. A later approved minimal CTA could read:
“Check ferry routes and dates on Ferryhopper” with a visible affiliate disclosure,
without local schedules, price cards or availability claims.

## Blockers and owner decisions

1. **Real new-category data gate:** existing `/search` rejects other kinds and
   does not expose raw taxonomy/details. Key remains only in Cloudflare. Deploy
   the prepared read-only audit preview to the existing staging Worker; never
   production. Then test actual tags, Acropolis/Delphi/Meteora candidates and
   single-product detail status/field coverage. Do not paste a key in chat.
2. Actual new-category inventory, current supplier conditions and detail
   entitlements remain unconfirmed. If details are denied, show a summary-only
   limitation or narrow the MVP; do not assume Full API upgrade is mandatory.
3. Ferry account approval/referral URL and permitted widget/API model require
   owner/account evidence; no secret value is needed in chat. Ferries need a
   separate explicit owner implementation decision regardless.
4. Recommended Culture scope: three initial destinations, with stairs, accessible
   route and admission shown as unknown unless correctly scoped evidence exists.
   No “skip the line,” step-free or medical suitability promise. No owner decision
   about later categories is needed now; they remain paused.

## Prepared diagnostic and checks

`staging-category-audit.mjs` is a generated temporary staging preview, not a
Culture implementation or a production Worker. It preserves the current
supplier-cover path and hard-off legacy photos/events, adds only the fixed
`/__category-audit` POST cases and keeps normal Boat/Wine source unchanged.
Cases: taxonomy, culture_athens/delphi/meteora/olympia,
food_athens/naxos/crete, transfers_athens. These later-category cases inspect
fields only and do not implement their selectors or recommendations.

Exact tag IDs/destination IDs are resolved from the real account taxonomy;
missing names produce BLOCKED, never invented numeric IDs. Each case performs
at most one search and three selected-product detail requests, plus at most two
cached auxiliaries. No booking, availability, location, attraction, review or
photo endpoint, no automatic retries, image downloads or event writes. A
candidate audit is not recommendation, date availability or booking approval.
Only allowlisted fields and short operator-condition excerpts are returned;
protected unique content, reviews, image URLs, private supplier/contact objects
and upstream error bodies are excluded. Public staging is not authentication;
strict host/origin/cases, existing rate limiter, bounded requests and no-store/
noindex contain the diagnostic. Remove it when the audit is complete.

Local: 30 existing Worker/OAuth tests PASS; 7 new diagnostic/bundle boundary and integration
tests PASS. Actual new-category API, Culture mobile/Chromium/WebKit and
physical-device checks have **not** run. Physical iOS/Android unavailable.
Do not reuse PR24 staging success as evidence for new-category correctness.

## Primary sources inspected

- Viator access levels: https://partnerresources.viator.com/travel-commerce/levels-of-access/
- Viator technical reference (search vs product content; option logistics; tags): https://docs.viator.com/partner-api/technical/
- Official ProductSummary schema: https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSummary.yaml
- Full product, language, logistics, itinerary and inclusion schemas in that same official repository; field inventory checked against downloaded official OpenAPI snapshot.
- Ferry widgets: https://partners.ferryhopper.com/affiliate-widgets
- Separate B2B API: https://partners.ferryhopper.com/ferryhapi
- MCP: https://partners.ferryhopper.com/mcp
- Affiliate terms, updated 2 October 2026: https://partners.ferryhopper.com/affiliate-program-terms-conditions
- Candidate alternative (full fetch unavailable): https://www.ferriesingreece.com/affiliate-program/
