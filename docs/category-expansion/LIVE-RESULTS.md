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
feature test suite. The owner deployed revision 2 and the corrected Food audit PASSED collection:
four cases HTTP 200 and nine ACTIVE product-detail responses. See below.

## Follow-up completed: current Food lineage verified

[Run 39062034051](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39062034051)
checked deployed source a6d3f02c84f7741a7f9519f2c80c0ac94e68ad22, taxonomy
revision 2, baseline hash and disabled legacy photos/events before requests.
Four cases returned HTTP 200. All nine selected details were HTTP 200 / ACTIVE.
Across both runs: 27 successful detail requests, 24 distinct products (three
Athens products were intentionally rechecked). No date availability check.

| Case | Resolved live tag | Candidates returned | Detail sample |
| --- | --- | --- | --- |
| Athens food | Food Tours 21567, Food & Drink lineage | 50 (page cap) | 417834P1, 101933P4, 342330P1 |
| Naxos cooking | Cooking Classes 12034, Food & Drink lineage | 16 | 5649732P3, 322117P2, 5489474P1 |
| Crete cooking | Cooking Classes 12034, Food & Drink lineage | 50 (page cap) | 432159P1, 364920P1, 71256P2 |

The earlier zero counts were a probe tag-selection error. No account upgrade,
new API permission or secret change was needed. Numbers above are returned
candidates, not an exhaustive inventory or confirmed dates/seats.

Field/condition observations for the later Food implementation:

- Naxos 5649732P3 explicitly includes a cooking class, with 210-minute duration,
  shared-tour maximum 15 and English/Greek GUIDE entries. Participation depth,
  dietary accommodation and exact meeting details still need scoped evidence.
- Naxos 322117P2 has privateTour=true but also a Small Group Tour option.
  Never classify every option as private. Its health information excludes celiac
  suitability; do not infer gluten-free accommodation from food/menu wording.
- Naxos 5489474P1 lists a four-hour shared activity (maximum 14), English GUIDE,
  lunch and a supplier dietary-request condition, while excluding private
  transportation. Requests are not allergy guarantees. Audit excerpts truncate
  long conditions, so full terms must be checked before a positive dietary claim.
- Crete 432159P1 reports a five-hour shared activity with maximum eight and
  English GUIDE; lunch alone does not establish hands-on participation.
- Crete 364920P1 lists English/Italian at product level but one option only
  English. A product-wide language union must not imply all options offer Italian.
- Crete 71256P2 has both private and regular options with different pickup
  policies. Product-level sharedTour/privateTour and transport inclusions cannot
  be applied indiscriminately across options.
- Athens food taxonomy still returns wine-only 342330P1; a food tag is not proof
  of a food walk. Keep current Wine recommendations unchanged and reject this
  mismatch from any future food-walk-specific selection.

No further owner action or access grant is needed to finish Phase A. The next
implementation scope is Culture only; Food/Transfers/Ferries remain unimplemented.
Remove the temporary audit route when staging is replaced by the Culture preview.
