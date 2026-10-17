# Reviewed live category audit — 17 October 2026

Baseline: main b37919d; deployed audit source 9ac4202e. Read-only staging only.
Evidence collection: [GitHub Actions run 39060633333](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39060633333), artifact `real-category-audit`.
A compact non-content field inventory is in `real-field-coverage.json`; it omits
operator descriptions, reviews, images, contact data and protected unique content.

## What passed

- All nine requested audit cases returned HTTP 200 (taxonomy plus eight searches).
- Eighteen selected product-detail requests returned HTTP 200 and `ACTIVE`.
  This proves those endpoint operations for the configured staging credentials,
  not a named access tier or parity with any other credential.
- Actual details contain itinerary/privateTour, logistics, languageGuides,
  inclusions/exclusions, additionalInfo, cancellation policy and product options.
- Remote metadata confirms legacy apiPhotos=false, interactionEvents=false,
  supplierCovers=true (the already published path). No new photo capability.
- This audit used destinations, tags, product search and single-product details.
  No availability, booking, review/photo, location or attraction endpoint was
  requested by the diagnostic. No event write or image download was performed.

## Findings affecting Culture design

1. `languageGuides.type=GUIDE` is insufficient to label a tour as guided inside
   an archaeological site. Athens `349296P1` and `443226P3` expose GUIDE but
   include driver commentary and exclude licensed site guiding / make it extra.
   Their private flag does not resolve that contradiction. Neither should be a
   confirmed inside-site-guided recommendation from this evidence.
2. `240841P1` is a genuine guided Acropolis candidate in this sample, but its
   GUIDE language is German. Do not present it as English-speaking. Admission
   and option scope must still be checked; no generic skip-line guarantee.
3. Delphi `198006P36`, `464406P5`, `464406P12` explicitly include guide services
   but differ on admissions and transportation. They meet at Delphi; this is not
   evidence of an Athens-to-Delphi return day trip. Destination and departure
   must be distinct. Do not pad results with local tours when transport is required.
4. Meteora searches returned an e-bike tour, a photo tour and `368783P2`.
   The monastery product explicitly excludes interior guiding and admission.
   It reports moderate fitness; a generic GUIDE field or vehicle does not prove
   interior guidance, step-free access or personal suitability. There is even
   a group-size discrepancy between title and inclusion. No maximum-group claim
   should be extracted from one of these conflicting texts.
5. All three sampled Olympia products exclude licensed site guides. Keep Olympia
   out of the first Culture release rather than reclassify transport as guided
   archaeology. This sample does not prove no qualifying product exists.

The shortlist must reject contradictions/optional extras for hard requirements;
other conditions must remain explicitly unknown. Raw title wording is not a reason.
Do not publish arbitrary operator prose as an AI-generated recommendation.

## Food taxonomy defect and correction

The live taxonomy contains three different IDs named Cooking Classes: 13283,
13112 and 12034. The first probe chose the first label match (13283). Both Naxos
and Crete returned zero. Those results cannot establish absence of inventory.
Food Tours is also duplicated (13285 and 21567).

The revised diagnostic resolves the current **Food & Drink** root from live
names, then requires an unambiguous matching descendant. The observed matching
IDs are 12034 (Cooking Classes) and 21567 (Food Tours); they are not hard-coded.
Missing roots or duplicate candidates now fail closed. A shuffled-order and
ambiguous-lineage test covers the mistake. This changes only the temporary
probe, not production Boat/Wine or their tag selection.

A new staging upload is necessary because the old handler cannot accept a tag
ID from the client (intentionally). The follow-up workflow runs taxonomy and
three Food cases only, avoiding repeat Culture/Transfer detail calls. No Food
selector or recommendation implementation is included.

## Remaining release gates / scope

- First Culture implementation: validate guide role, option-level conflicts,
  departure/transport and scoped admission; preserve Boat/Wine, pricing,
  selectionEvidence, photos and exact affiliate URLs.
- No date, party size or option availability was queried. ACTIVE and search
  eligibility are not a promise of bookability or price for a future selection.
- Initial search returns up to 50 candidates; detail audit samples at most three
  subject matches. It is neither exhaustive nor evidence that better matches
  do not exist. No exhaustive inventory total is inferred from the count.
- Supplier statements are not independent inspection. Absence of wheelchair or
  stairs information proves neither accessibility nor lack of access.
- No Culture UI exists yet; its real end-to-end, responsive, Chromium/WebKit,
  keyboard and regression release checks are still pending implementation.
  Physical iOS/Android were not tested and are unavailable here.
- Food/Transfers need later owner approval; Ferries also needs verified account
  rights and its separate integration decision. No production or main change.

## Verification of the diagnostic correction

Six probe unit tests and two actual generated-preview isolation/integration tests
pass, together with the 30 existing Worker/OAuth tests. These are not a Culture
feature test suite. The corrected Food search is BLOCKED until the owner updates
only the staging Worker with the new package documented in STAGING.md.
