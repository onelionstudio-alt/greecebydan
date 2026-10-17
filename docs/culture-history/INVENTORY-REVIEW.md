# Targeted Culture inventory review — 17 October 2026 UTC

**No production release or merge.** Real inventory audit completed against the
owner-deployed, isolated Cloudflare staging Worker. Small follow-up fixes are in
this PR; their new frontend/runtime still require an owner staging upload and the
updated real frontend suite. Do not confuse the completed audit with that gate.

## Evidence and result

[Real audit run 39070052304](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39070052304):
30/30 scenarios HTTP 200, 124 fresh detail reads, **69 distinct ACTIVE products**
inspected across four disjoint cohorts: Acropolis 30, Delphi local 9, Delphi in
Athens search 10, Meteora 20. Three live exact tags were checked separately:
Historical Tours, Archaeology Tours and Cultural Tours. Acropolis/Meteora also
sampled page 2. There were no availability, booking, photo/review endpoints,
automatic retries, or production changes. Twenty-second pacing kept rate limiting.

Counts below describe inspected supplier listings, **not total catalogue counts,
seats on a travel date, final price or independently verified travel conditions**.
Repeated products across tags/windows are counted once.

| Place / cohort | Language | Type | Included guide | Transport evidence | Distinct options | Limit |
|---|---|---|---|---|---:|---|
| Acropolis, unambiguous English listings | English; French also on 190407P7 | 2 private + 1 shared | Confirmed under existing guide rules | Private transport included on 341709P1; excluded on 190407P7; hotel pickup/drop-off excluded on 63145P77 | **3** | No blanket skip-the-line, step-free or all-sites guiding claim |
| Acropolis, option-specific | English and German | Private | Confirmed | Not established | **1 conditional** | 10172P136: TG2 includes Agora & Acropolis; TG6 is Agora only. Select the correct option; not an all-options Acropolis guarantee |
| Acropolis, other languages | German / French | 2 German shared; 1 French private | Confirmed | No Athens transfer inferred | **3** | Not counted as English. 6956P27 has differing option languages; common confirmed language is French |
| Delphi local visits | English on all five; other languages vary | 4 confirmed private + 1 group type unknown | Confirmed | Transportation excluded on 464406P12 and private transportation excluded on 198006P61; other three unconfirmed | **5** | These are local-visit products, not verified Athens-departure day trips; 103214P181 is not labelled private from title alone |
| Delphi from Athens, evidenced day trip example | English-speaking driver | Private day trip | Site guide **not confirmed** | 123525P19 explicitly includes private transport and pickup/drop-off in Athens/Piraeus | **1 transport example; 0 qualified guided tours** | Does not pass the included-guide filter. Ten Athens-cohort products inspected, not ten qualifying day trips |
| Delphi from Athens, evidenced multi-day example | English-speaking driver | Private two-day Delphi/Thermopylae/Meteora | Site guide costs extra on request | 59636P59 explicitly includes private transport and Athens hotel/Airbnb/port pickup/drop-off | **1 multi-day example** | Separate from day trips; excluded from confirmed included-guide recommendations |
| Meteora, current live baseline | English and six other GUIDE languages | Private local monastery visit | State-licensed local guide included | Transport **to the meeting point** excluded | **1** | 6575P20; no all-monastery or step-free guarantee |
| Meteora, explicit guide phrases missed by parser | English; other GUIDE languages listed | 1 shared full-day listing + 1 private local tour | Explicit English-speaking Guide inclusion + common GUIDE English | Vehicle included on 6357P78; 6575PRIVATE includes private vehicle and Kalambaka/Kastraki hotel pickup/drop-off | **2 additional evidenced listings** | Parser fix passes recorded real API-field tests; new runtime live check pending. No licence/interior-guiding claim inferred. Thessaloniki departure in 6357P78 title still needs exact logistics confirmation |

### Confirmed English Acropolis product codes

- `341709P1` — Best of Athens & Acropolis Full Day Private Guided City Tour.
  Inclusion explicitly lists an English-speaking licensed guide in Acropolis and
  Ancient Agora; common human GUIDE language is English; private transport included.
- `63145P77` — Acropolis Guided Tour with Skip-the-Line Access (supplier title).
  Licensed Tour Guide inclusion and common GUIDE English; shared. Retain supplier
  title, but do not independently guarantee the queue/access claim.
- `190407P7` — Private local tour of the Acropolis Hill and the New Acropolis Museum.
  Certified tour guide services; common GUIDE English/French. Private transport
  and entrance fees excluded.
- `10172P136` — Ancient Agora and Acropolis Private Tour with Licensed Expert.
  English/German common GUIDE languages and explicit licensed-guide inclusion.
  **Acropolis is option-dependent**: TG2 includes it, TG6 is Agora only. Keep this
  distinction explicit; it was found on Cultural Tours page 2, outside the MVP window.

All exact affiliate `productUrl` values are preserved in the reviewed evidence.
Some supplier URL slugs refer to older titles (e.g. 341709P1, 103214P181); never
rewrite them from the current title or strip tracking parameters.

## Why the baseline returned only two German Acropolis tours

- `Accept-Language: en-US` controls content localization, **not human guide language**.
  The search filtering schema has no human-guide-language field.
- Culture uses Historical Tours when present. Archaeology/Cultural labels are
  fallbacks, not additional searches. All three tags' first-six windows still
  returned the same two German-only qualified products: changing the tag alone
  would not solve this observed problem.
- First page is capped at 50, sorted by traveler rating. Only the first six
  surviving summaries received fresh details. On the same Historical first page,
  the **next six** included `341709P1` and `63145P77`, both confirmed English.
- Three distinct guide languages appeared across seven qualified Acropolis
  listings in the expanded sample; English availability was never absent merely
  because English text was requested.

Official schemas inspected:
[Filtering](https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSearchFiltering.yaml),
[Pagination](https://github.com/viator-docs/Viator-Partner-API-v2/blob/master/openapi/papiv2/components/schemas/ProductSearchPagination.yaml).
A destination matches a place in product content, not necessarily departure.
Tags in one request use AND semantics, so the audit searched each tag separately.
The documented maximum page size is 50; no unsupported larger page was requested.

## Minimal follow-up changes

1. Increase the fresh Culture detail window from six to **twelve**, still two at
   a time, maximum three cards, same 28-second shared deadline, no extra page,
   retries or stale fallback. Max upstream budget: 13 warm / 15 cold calls.
   Existing Boat/Wine ranking, price rules and selectionEvidence remain unchanged.
2. Recognize explicit `English speaking Guide` / `English – speaking Guide` in
   **inclusions**, only when common human GUIDE English also exists across every
   inspected option. Negatives, optional/extra/requested service, driver/leader
   roles, audio-only/conflicting options and guide exclusions still fail closed.
   This asserts included human guiding, **not a state licence or guiding inside
   every monastery**. Two actual Meteora products demonstrate this parser false negative.
3. Clarify the existing Culture note: Delphi does not select Athens-departure day
   trips; transport must be explicitly included in the selected product.
4. Strengthen real frontend staging assertions: at least one fresh confirmed
   English Acropolis result, at least two confirmed-guide Meteora results,
   Delphi note, exact affiliate links, unknown price units, 2–3 comparison,
   accessibility and no analytics/new-photo/review requests.

No English preference is silently inferred from title, no language union across
conflicting options, no tour-leader/interior-guide equivalence. Original category
ranking and max-three result count remain in place. The first-50/first-twelve
window can still miss valid listings; this is deliberately not a universal catalogue.

## Tests and remaining gate

- Baseline extended real inventory: **PASS**, 30/30 HTTP 200.
- Pre-fix CI [39070439521](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39070439521):
  PASS, including 43 Node tests, 23 Python tests and existing Chromium/WebKit UI regression.
- Follow-up local Node tests: **46 PASS**, including lossless allowed API-field
  projections for the two missed guide phrases, negatives/options, deeper window,
  maximum 12 details / 2 concurrent / 3 cards and exact affiliate URL preservation.
- Final follow-up CI and actual new runtime/frontend staging: see the PR status;
  **real staging remains blocked until the owner uploads the new selection preview**.
- Physical iOS/Android NOT TESTED. Browser engine/viewports are not physical devices.

Raw audit artifact `culture-inventory-audit` (124 observations) is attached to the
run. Deduplicated counts and selected evidence are committed as
`evidence/inventory-summary.json` and `evidence/inventory-reviewed-products.json`.
Their `conditions` are the **original baseline classifier output**, intentionally
retained rather than rewritten as if the fixed classifier had already run live.
The fixture `tests/fixtures/culture-inventory-guide.json` contains the actual,
non-truncated inclusion/exclusion/language fields for targeted classifier replay;
no prices, dates or bookability are fabricated.

Release remains blocked pending the updated real frontend run and owner approval.
The temporary inventory route is absent from the new selection preview. Analytics
and legacy photo API stay hard off; current supplier-cover settings are preserved.
