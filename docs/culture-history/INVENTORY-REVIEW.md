# Targeted Culture inventory review — pending fresh supplier responses

No production deployment or merge is authorised. Existing Culture qualification,
Boat/Wine, selectionEvidence, price rules, affiliate URLs and UI are unchanged.

## Confirmed selection bottlenecks

Source `840bcfb98044a4dc1aa2c14dfabc38b7d6aef7ab`:

- `Accept-Language: en-US` requests localized content; it does not select an English-speaking human guide.
- Culture resolves the first unambiguous live taxonomy label in this order:
  Historical Tours, Archaeology Tours, Cultural Tours. Thus only Historical Tours
  is currently searched when present; the other labels are fallbacks, not unions.
- Search is scoped to the selected destination, first 50 results, traveler rating
  descending. Athens is used for Acropolis; Delphi destination is used for Delphi.
  A Delphi destination search is not a search for departures from Athens.
- Only the first six surviving summaries receive fresh product-detail checks.
  Up to three qualified products are returned. This bounded window can concentrate
  suppliers/languages. It cannot establish that other qualifying products do not exist.
- Human guide inclusion requires explicit inclusion text, no guide exclusions or
  conflicting options, and a common GUIDE language across all inspected options.
  English content, product title or GUIDE metadata alone does not prove inclusion.
- Pickup method does not establish included transport, departure city or route.
- Official search filtering matches a destination included in product content,
  not necessarily the departure location. Tags in one request use AND semantics,
  so the diagnostic searches each tag separately rather than accidentally narrowing
  results by combining all three. The documented maximum page size is 50.
- The official search filtering schema has no human-guide language field.

Schema references inspected for this audit:
[Filtering](https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSearchFiltering.yaml),
[Pagination](https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSearchPagination.yaml).

## Last verified matrix, before expanded audit

Counts below are unique qualified products in the previously tested bounded
selection, **not the whole catalogue or date/party availability**.

| Place | Confirmed guide language | Tour scope | Included human guide | Transport | Count | Limits |
|---|---|---|---|---|---:|---|
| Acropolis / Athens | German (`de`) | Shared visits | Yes, under current strict rules | Not established | 2 | 240841P1 / 240841P3; English coverage unresolved, not proven absent |
| Delphi | English; Greek also on P36/P12 | Private local visits | Yes | Not established for P36/P5; transport excluded on P12 in earlier detail audit | 3 | 198006P36 / 464406P5 / 464406P12; does not establish Athens departures |
| Delphi from Athens | Not established | Athens day trip | Not established | Not established | Not measured | Separate geographic cohort in the new diagnostic |
| Meteora | English, Greek, Spanish, French, Italian, Romanian, Russian | Private monastery visit | Yes | Not established | 1 | 6575P20; site-specific scope/admission still require checking |

No English Acropolis option or additional guided Meteora option is claimed until
fresh details qualify it. No arbitrary quantity target or date availability claim.

## New isolated staging diagnostic

Upload `staging-pr25-inventory.mjs` **only** into the existing
`greecebydan-travel-api-staging` Worker. It preserves the exact previously reviewed
PR25 frontend and ordinary API implementation, adds a temporary fixed-case route
`/__culture-inventory`, and adds `cultureInventoryAuditRevision: 1` to preview meta.
Production Worker code is not changed. No API keys are requested or embedded.
Legacy photo API and event collection remain hard off; existing supplier covers
retain their previous setting. No review, photo, availability or booking endpoints.

Fixed matrix: four scopes (Acropolis/Athens, Delphi local, Delphi searched from
Athens, Meteora) × three live exact tag names × first and second six-detail
windows of page 1. Acropolis and Meteora also inspect first six eligible candidates
on page 2 (`start: 51`, `count: 50`). Total: 30 cases; at most 180 details and
90 taxonomy/search calls, no retries. Two concurrent details per request and a
28-second shared upstream deadline. The runner paces cases by 20 seconds and
stops on the first HTTP error/rate limit. No taxonomy IDs are guessed.

The projection returns only capped inclusion/exclusion excerpts, option language
metadata, typed conditions and exact already-validated affiliate URLs. No raw
upstream payload, addresses/location refs, protected unique content, reviews,
image URLs, credentials or personal data are returned. Truncation is explicit;
missing/conditional/option-conflicting transport stays unconfirmed. Textual
Athens/Delphi mentions are diagnostic clues, not inclusion evidence.

After owner uploads the file, verify `/_preview/meta` includes the revision.
Then trigger `Culture inventory audit (staging only, no deployment)` by updating
`docs/culture-history/RUN_INVENTORY_AUDIT` on the PR branch. The workflow does not
deploy anything. Its artifact is `culture-inventory-audit`; keep successful data
from a partial failed run, but do not treat it as a complete inventory review.

Review products across cohorts by product code, distinguish local visits from
Athens departures using explicit inclusions and option scope, and count only
fresh ACTIVE qualifying details. Any subsequent shortlist improvement needs
its own updated regression tests and real frontend staging verification.
Remove the temporary diagnostic from the eventual release package.

## Current validation / blocker

- 43 Node tests pass (38 existing + 5 diagnostic tests).
- Generated module passes `node --check`.
- Expanded real inventory run is **BLOCKED pending owner staging upload**.
- Earlier real PR25 staging/browser results remain valid for their original scope;
  they do not validate this expanded inventory or any as-yet-unmade selection fix.
- Physical iOS/Android not tested in this follow-up.
