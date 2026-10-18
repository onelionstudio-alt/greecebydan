# Transfers & Day Trips — isolated implementation review

Separate branch/PR dependent on Food PR26, verified Food head cb7d258. Target
feat/concierge-food-cooking keeps this diff independently reviewable; neither PR
may be merged or deployed without owner release approval. Retarget/reconcile with
main after the Food dependency is approved and merged; rerun final checks then.
Production/main remain unchanged. TRANSFERS_ENABLED defaults off.

## What is implemented

Athens-only selector, four directed airport/city/Piraeus-port requests and day
trips departing from Athens with listed transport. Open suggestions use the
airport/hotel-transfer taxonomy and may retain explicitly unknown directions.
Airport/hotel and port tags resolve unambiguous descendants of the live Transfers
namespace (duplicate Port Transfers labels do not use array order). Day Trips
requires an unambiguous Tours by Duration / Tours, Sightseeing & Cruises lineage.
The exact Day Trips namespace labels still need real staging verification; missing
or duplicate taxonomy fails closed, never a guessed numeric fallback.

The existing destinations, products/tags, products/search and products/{code}
operations only. First50 search summaries, first12 eligible fresh details, two
concurrent, existing28-second deadline, at most3 ranked cards. Maximum13 warm /
15 cold upstream calls; no retries, extra pages, ingestion or stale-detail cache.
Existing card renderer, comparison, affiliate URL, selectionEvidence(), price
rules and supplier-cover path retained. Food/Boat/Wine/Culture are not rewritten.

Fresh ACTIVE detail plus selected taxonomy and explicit transport inclusion are
required. PRIVATE_TRANSPORTATION / AIR_CONDITIONED_VEHICLE /
PUBLIC_TRANSPORTATION or unambiguous included transport wording establish a listed
transport amenity. They do not prove taxi licensing, capacity or accessible vehicles.
A transfer listing must be UNSTRUCTURED without structured sightseeing stops or
explicit sightseeing/multi-day language. This is deliberately conservative.

Directed route evidence comes only from exact supplier product-option wording
(e.g. “from Athens City to Athens Airport”), consistent across all inspected
options. Product titles, two geographic mentions, slash/or destinations, mixed
reverse routes and missing/truncated option data do not establish direction.
No meeting address, terminal, port gate or driving route is generated.

A day trip requires STANDARD itinerary, duration at most1440 minutes, itinerary
stops, included transport and explicit scoped Athens departure/start evidence.
Option pickup conflicts and overrides with missing Athens evidence reject it.
A driver is not represented as a licensed inside-site guide. Site guiding,
admissions, return conditions and individual suitability remain checks on Viator.

Private/shared classification uses the structured itinerary and option conflicts.
A free-cancellation requirement also needs fresh STANDARD policy with no
non-refundable option conflict; the exact deadline remains unconfirmed.
Capacity, luggage, child seats, delayed-flight waiting and operating hours are
explicitly not_confirmed; none is a selectable guarantee. Advertised starting
amounts keep unknown units and are not presented as fixed whole-party fares.

## Existing authentic inventory (17 October field projection)

Source: workflow39060633333, artifact12111113224. Three sampled ACTIVE HTTP200
products from a50-summary page; not date/seat/vehicle availability. This projection
caps descriptions at160 characters, omits full option descriptions and locations,
and is not a full raw response. The fixture retains these limitations.

| Product | Observed fields | Recommendation boundary |
|---|---|---|
| 189416P13 Private Limo Transfer From ATH Airport To Athens/Pireaus/Suburbs | Included air-conditioned vehicle, meet/greet; private itinerary; option Airport To Athens/Piraeus | Mixed destination option: direction unknown. Child seats are request-dependent, not guaranteed |
| 323957P7 Departure Transfer from Athens City to Athens Airport | Explicit directed option; included private transportation; private itinerary | City→airport qualifies in the projection. Actual vehicle, terminal, time, luggage and seats still need current option verification |
| 241463P2 Luxury Athens Airport Transfer with Mercedes Benz E-class | Private transportation and itinerary; start-point meeting metadata | No directed option evidence: route unknown. Accessibility metadata is not an individual suitability guarantee |

These are observed transfer products, not a current real implementation search.
No day-trip or airport→port result count is asserted until the new staging test.

## Verification and release gates

Unit/integration: directed and ambiguous routes, option conflicts, negative or
missing transport, inactive products, one-day/departure limits, taxonomy ambiguity,
exact affiliate URL, unknown pricing, 12/2 request bound, no retry on failure,
feature gate and allowed endpoints. Recorded browser UI: Chromium/WebKit320/390/
768/1440, keyboard/axe/overflow,2/3 comparison, forged evidence, safe empty/502/429,
Food and existing category/photo regression. Physical iOS/Android unavailable.

Real new frontend staging passed on18 October:14 real cases, HTTP200, no
analytics/new photo/review calls, Chromium390/1440 and WebKit390. See
LIVE-VERIFICATION.md and evidence/live-review.json for product matrix and limits.
Airport→city and port→airport remain safe empty in the bounded window. Two
one-day sightseeing results are named Athens city tours, not confirmed excursions
outside Athens. Exact affiliate CTA444139P7 was manually followed and verified.
No booking performed. Physical iOS/Android unavailable. Production is not authorized.

Primary specification: https://docs.viator.com/partner-api/technical/ — inclusions,
product options and routes, option logistics precedence, STANDARD/UNSTRUCTURED
itineraries and productUrl. No new booking, photo/review, location or availability
endpoint is used. Ferries remains documentation-only in ../concierge-expansion/.
