# Temporary category audit — staging only

The production site, ordinary Worker, Boat/Wine and supplier photo policy are
unchanged. This package adds a read-only fixed-case audit to the existing
staging preview. It does not enable Culture, Food, Transfer or Ferry selectors.

## Owner action

1. Cloudflare → Workers & Pages → **greecebydan-travel-api-staging**.
2. Edit code → replace with `staging-category-audit.mjs` → Deploy.
3. Preserve the existing VIATOR_API_KEY secret and SEARCH_LIMIT binding. Do not
   paste secrets in chat. No new binding or account permission is requested.
4. Open `https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta`
   and return the JSON metadata. Do not run the cases manually or change flags.

Never deploy this generated module to `greecebydan-travel-api` or production
routes; it is host-restricted and rejects them.

Expected metadata:

- categoryAudit: true
- auditTaxonomyRevision: 2
- sourceCommit: `a6d3f02c84f7741a7f9519f2c80c0ac94e68ad22`
- apiSourceSha256: `156856c83abed110563ca1628f4729d737bdbd1226630e13702a376a8e560749`
- baselineApiSha256: `a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916`
- apiPhotos: false; interactionEvents: false; supplierCovers: true

Bundle SHA256:
`739d81f6350b61cd232386fd40cd7272aa88984674b5c6035172fec529d9c88a`.
The baseline API hash is the existing production code. The audit source hash is
different because it includes the staging-only read-only handler.

## What follows after deployment

Update RUN_CATEGORY_AUDIT on this audit branch to trigger the read-only workflow.
The initial run is complete: nine cases HTTP 200 and 18 ACTIVE details. See
LIVE-RESULTS.md. The follow-up reads taxonomy and only three Food cases, with
pauses, one search and at most three details per case. It verifies the correction
for duplicate Cooking Classes / Food Tours labels. Culture/Transfer are not
repeated, and no new selector is enabled. A
401/403/429 on detail stops that case and the collection; no automatic retry.
The output is a **candidate/field audit**, not a bookability or recommendation
PASS. No availability, bookings, traveler review/photo endpoint or event write.
No arbitrary product URL/path accepted from a client.

Field/option coverage and conflicts must be reviewed before the Culture-only
implementation PR. Staging credential capability does not prove production
credential/account parity if the owner configured different accounts; no key
value needs to be shared to clarify that.

## Local verification

- Existing Worker/OAuth tests: 30 PASS, ordinary source unchanged.
- New diagnostic tests: 6 PASS.
- Actual generated bundle isolation/integration tests: 2 PASS.
- Syntax PASS; production-host rejection; origin/input/size/rate bounds;
  events hard-off even with enabling test binding; fixed endpoint families;
  protected content/secret exclusion; no guessed taxonomy fallback.
- Existing build: 13 published stories built without article changes.
- Real initial responses: collected and reviewed (18 ACTIVE details).
- Corrected Food taxonomy responses: **BLOCKED pending this replacement upload**.
- No Culture browser/device validation claimed before implementation exists.
