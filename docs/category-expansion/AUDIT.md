# Concierge category expansion — Phase A, 17 October 2026

**Live audit collected: nine staging cases returned HTTP 200, including 18
single-product details (all ACTIVE). See LIVE-RESULTS.md for reviewed limits.
Corrected Food taxonomy verified in a second run: nine additional ACTIVE
detail responses, 24 distinct products across both runs.**
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
  is **not assumed necessary**. Actual `/products/{product-code}` returned HTTP 200 for 18 products in this
  staging account. Their returned fields and conflicts were reviewed; this
  does not identify the account’s commercial tier. Search success is not evidence of named access tier.
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

Live observations below are a bounded sample, not an exhaustive catalogue or a
selected-date availability check. Exact evidence and limitations are in LIVE-RESULTS.md.

| Direction / traveller task | Useful questions / criteria | Available evidence and real products | Confirmed / unknown | Risk, complexity and readiness |
| --- | --- | --- | --- | --- |
| Athens / Acropolis guided visit | Private/shared; language; duration; tickets; meeting point; access needs | `240841P1`: ACTIVE, German GUIDE, explicit shared itinerary, entrance-fee inclusion; `349296P1`, `443226P3`: ACTIVE private listings with driver/site-guide exclusions | Details support private/shared, language, duration, inclusions/exclusions. Licensed guide inside sites is not established by GUIDE alone. All-option admission, timed entry and accessible route need scope checks | Driver/guide confusion and misleading skip-line title. Medium-high; implement conservatively after guide-role checks |
| Delphi guided visit / day trip | Departure; transport; private/shared; language; tickets; walking | `198006P36`, `464406P5`, `464406P12`: ACTIVE private guided listings meeting locally; differing ticket/transport conditions | Licensed-guide inclusion is explicit. Ticket inclusion/exclusion differs. These results do not establish Athens departures or whole-day return transport | Destination is not departure. Medium-high; local visit supported; transported day-trip coverage needs further evidence |
| Meteora guided/private visit | Departure; human-guide role; private/shared; duration; steps and admission | `356497P1` e-bike, `59728P9` photo tour, `368783P2` monastery tour: ACTIVE, explicit shared itineraries | Last product excludes guided visits inside monasteries and entrance fees; listing physical effort is moderate. Private inventory not sampled | Tags and GUIDE do not establish interior guiding; exclude activity mismatches. Medium-high; narrow shortlist, no stair/access guarantees |
| Olympia archaeological visit | Departure; licensed site guide; transport; admission | `66179P12`, `141312P3`, `5647765P2`: ACTIVE private transport/escort listings | All three exclude licensed site guiding; admissions excluded. No qualifying guided archaeological recommendation established by sample | Driver/escort versus archaeological guide. Medium; **omit from initial release** pending stronger inventory |
| Athens food walk | Walk/tasting vs cooking; language; group; dietary conditions | `417834P1`, `101933P4`: ACTIVE food walks; `342330P1`: ACTIVE wine-only candidate in same search | Group/language/dietary statements available; first explicitly limits vegan/gluten-free suitability. Broad food tags include wine-only products | Activity/negation and dietary scope required. Medium; current-taxonomy search verified; implementation waits owner approval |
| Naxos farm cooking | Hands-on vs demo; duration; language; transport; group; menu | Corrected live tag12034 returns 16 candidates; ACTIVE details: `5649732P3`, `322117P2`, `5489474P1` | Cooking inclusion, duration, language, group/option fields available. Conflicting private/shared options and a celiac restriction observed | Taxonomy ambiguity; activity/ingredient/allergy scope. Medium; data access ready, participation/option/diet scope requires qualification; no implementation yet |
| Crete cooking / tasting | Hands-on vs tasting; locality; language; transport | Corrected live tag12034 returns first 50 candidates; ACTIVE details: `432159P1`, `364920P1`, `71256P2` | Duration, group, language and option logistics available. Options differ in language and pickup; hands-on participation still needs explicit evidence | Crete-wide destination does not establish meeting locality or transfer. Medium; data access ready, later separate approval |
| Athens airport/port/private transfers | Exact direction; party/luggage; child seats; timing; delay wait | `189416P13`, `323957P7`, `241463P2`: ACTIVE private transfer listings | Details include pickup, some luggage and on-request infant-seat statements. No universal capacity/wait/24h/final-price proof | Opposite direction or wrong destination must fail; seats available is not reserved. High; separate later PR and approval |
| Ferries / island hopping | Provider-side route/date search initially | No configured integration/account entitlement. Official widgets and separate B2B API exist | Our approval, referral URL and API/widget rights unconfirmed; no live fare/timetable access claimed | Contract/tracking/privacy/CSP gate. Separate owner decision; no ferry feature in Culture PR |

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
| A: this audit branch | Code/schema review, matrix, bounded staging diagnostic | Completed: code/schema audit, two real staging runs, reviewed matrix and limits |
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

1. **API access/data collection gate PASS:** two real staging runs completed;
   24 distinct ACTIVE products, actual details and current Food taxonomy verified.
   No owner access action or account upgrade is currently required.
2. **Culture implementation/release gates remain:** guide-role qualification,
   option conflicts, departure/transport scope, conservative admission and
   accessibility handling, actual frontend staging and browser regression tests.
   The bounded sample is not exhaustive; local Delphi tours do not prove Athens
   departure products. Fail closed where a hard preference has no evidence.
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

Local: 30 existing Worker/OAuth tests PASS; 8 diagnostic/bundle tests PASS after
the taxonomy correction. Actual new-category API collection completed (18
details), with corrected Food follow-up (nine detail requests). Culture
mobile/Chromium/WebKit and physical-device checks have **not** run. Physical iOS/Android unavailable.
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
