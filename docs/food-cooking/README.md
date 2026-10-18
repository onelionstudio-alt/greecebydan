# Food & Cooking — implementation review

Baseline: published main b83fdae18d7bf8dfc727c6eb0c4951340a1da869 (PR25).
Production is unchanged. The production feature is OFF unless the owner later
sets Text FOOD_ENABLED=true on a separately approved production Worker release.

## Data and recommendation contract

The existing destinations, products/tags, products/search and products/{code}
operations are reused. No booking, availability, photo/review, freetext, location
or new third-party endpoint. English localization is not evidence of guide language.

Food taxonomy resolves the unambiguous Food & Drink root and named descendant;
never the first label match. Cooking Classes is used for an explicit cooking
request and default Naxos/Crete suggestions; Food Tours for Athens/default food
walks and local tastings. Categories are not themselves inclusion evidence.

Up to 50 search summaries and twelve fresh single-product requests (two concurrent),
one 28-second total deadline; no retries, paging, stale-detail fallback or saved
food search cache. Maximum upstream calls: 13 warm / 15 cold, as Culture. At most
three cards using the existing ranking, exact search productUrl and unknown price
unit. ACTIVE indicates product status, never date/seat availability.

An activity needs an explicit, non-conditional inclusion or the documented
ACTIVITY itinerary.activityInfo.description. Title, meal, menu, photo, tag and
wine tasting alone cannot qualify it. Complete inspected text and option conflicts
win over positive matching. Ambiguous/truncated/oversized/missing option data
fails closed. This deliberately may exclude genuine cooking experiences.

The existing Culture option checks are reused for group and pickup metadata;
Food language labels use common GUIDE entries across all inspected options and
do not promise included instruction. No dietary/allergy, step-free or safety filter.
Ingredients/drinks and cancellation deadline remain checks on the selected listing.
Free-cancellation filtering also requires fresh STANDARD cancellation policy;
CUSTOM/unknown conflicts with a summary flag do not pass that requirement.

Cards, comparison, approved supplier covers, price rules and selectionEvidence()
are retained. New reasons use a separate bounded viator_product evidence contract.
Additional facts stay in the existing disclosure. Shared-group input is available
for Food; it is reset when switching back to Boat/Wine.

## Authentic inventory already observed (not current availability)

Recorded API projection: 17 October 2026, workflow 39062034051,
artifact real-category-audit / 12111782550. Nine HTTP200 ACTIVE detail responses;
50 Athens, 16 Naxos, 50 Crete returned summaries (page cap, not catalogue totals).
The compact fixture explicitly preserves its projection/truncation limitations.

| Place / products | Confirmed in recorded fields | Not established / limitation |
|---|---|---|
| Athens 417834P1 | Explicit food/drink tastings; common English/Greek human-guide metadata; max 8 listed | Walking participation not proven by this projection; dietary accommodation unknown |
| Athens 101933P4 | Explicit food/culinary walking inclusion; English GUIDE; hotel pickup excluded | Ingredients, walking distance, allergy suitability and exact meeting conditions |
| Athens 342330P1 | Wine tasting product in Food Tours results | Excluded from Food: food-walk/cooking/food-tasting evidence missing |
| Naxos 5649732P3 | Explicit cooking-class inclusion; common English/Greek; shared maximum 15 | Participation depth, dietary requirements and exact logistics |
| Naxos 322117P2 | Lunch/drinks; conflicting privateTour + Small Group Tour option | Do not classify all options private; cooking activity needs fresh itinerary evidence; celiac suitability cannot be promised |
| Naxos 5489474P1 | Lunch/drinks; English GUIDE; private transport excluded | Fresh cooking-participation evidence needed; dietary request is not guarantee |
| Crete 432159P1 | Lunch; English GUIDE; shared max 8 | Cooking title is insufficient; fresh activity description needed |
| Crete 364920P1 | Snacks/drinks; common option language English | Italian is not common to every option; fresh cooking proof needed |
| Crete 71256P2 | Vehicle/meal; mixed private/regular option and pickup methods | No all-option private/pickup claim; fresh cooking-participation evidence needed |

These are real observed products, not nine approved Food recommendations. Current
live frontend/staging evidence must be collected before approval. Do not inflate
the count with products rejected by the evidence rules.

## Verification and release gates

- Unit/integration tests: taxonomy duplication/order, activity vs title/menu,
  negations, optional/excluded/demonstration, missing/oversized option scope,
  common languages, private conflicts, ACTIVE, exact URL, unknown unit, 12/2 cap,
  upstream failure, current endpoints, separate feature gate.
- Recorded browser QA: Chromium/WebKit 320/390/768/1440, keyboard/axe, 2-card Food
  comparison, malicious evidence rejection, no-results/502/429, switching to Boat,
  existing Boat/Wine/Culture 2/3 comparisons and supplier covers. Recorded screenshots
  must not be labelled live.
- Real new frontend staging is BLOCKED until owner replaces ONLY the staging
  Worker module. Follow STAGING.md; do not alter production variables.
- No physical iOS/Android devices available. Browser emulation is not a phone test.
- No merge, production deploy or subsequent category implementation until this
  category has successfully completed its real staging check. Transfers remains next.

## Primary specification

https://docs.viator.com/partner-api/technical/ — ACTIVITY activityInfo.description,
foodMenus, inclusions/exclusions, product options, languageGuides and productUrl.
https://partnerresources.viator.com/travel-commerce/managing-product-availability-data/
— search summaries omit detailed inclusions/itinerary; use the existing Live API model.

Ferries audit (documentation only): ../concierge-expansion/FERRIES-AUDIT.md.
