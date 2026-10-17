# PR25 inventory fix — staging verification complete, not production

The baseline frontend E2E (39064582890) and expanded real inventory audit
(39070052304, 30 HTTP-200 cases / 69 distinct products) are complete. The new
cutoff/parser fixes have passed local/CI tests and real frontend staging run
39071774889 (14/14 scenarios). The owner upload/check gate below is complete.
Production remains forbidden; the procedure is retained for reproducibility.

1. Open `docs/culture-history/staging-pr25-selection.mjs` on the PR branch.
   Copy the whole module using **Copy raw file**, or download and copy in an editor.
2. Cloudflare → Workers & Pages → **greecebydan-travel-api-staging** → Edit code.
   Replace the existing inventory-audit bundle and deploy to **that staging Worker**.
   Keep VIATOR_API_KEY and SEARCH_LIMIT; no new secret or binding is needed.
3. Open `https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta`.
   Check against staging-manifest.json:
   - sourceCommit `7c669f724c5ff72453757e4359d4c32816819353`
   - apiSourceSha256 `4a63e853d8ad4f96bfc40311d849c17fc6a778c21ca7933708bc2f96dbf6d856`
   - cultureInventoryFixRevision `1`, cultureEnabled `true`
   - apiPhotos `false`, interactionEvents `false`, supplierCovers `true`
4. Return that metadata response. The assistant then updates RUN_REAL_STAGING on
   the PR branch to trigger the no-deployment workflow.

Bundle SHA256:
`34c7707c66e55625abf1bb9e7c46bcc9ff49e54b31e502d185e20b07d1465437`.

The preview preserves hard-off analytics/legacy photo API and existing strict
supplier covers. It has no temporary `/__culture-inventory` route, no public
arbitrary detail endpoint, and no publication or production side effect.

The updated real suite checks the actual served source/assets, at least one
confirmed English Acropolis result, at least two confirmed-guide Meteora results,
the explicit Delphi/Athens transport limitation, Boat/Wine article navigation,
unknown price units, exact affiliate URLs, available 2–3 comparison, keyboard/axe,
no overflow and no normal event/new-photo/review requests. Chromium 390/1440 and
WebKit 390; recorded-response CI additionally covers 320/768. No purchase or date
availability operation. Physical iOS/Android remain untested.

If the live API no longer provides those qualified products, record the actual
failure/empty result rather than substituting fixture products or relaxing evidence.
Keep the 28-second upstream deadline, two-concurrent detail cap and rate limiting.

Do not paste into `greecebydan-travel-api`, change production routes, merge PR25
or publish the production frontend. Release still requires a separate owner decision.

Completed 17 October 2026 UTC: source/hash matched, confirmed-English Acropolis
and two-guide Meteora assertions passed, Delphi notice, Boat/Wine, comparisons,
accessibility and network hard-off checks passed. No further upload is needed
for this reviewed source. See INVENTORY-REVIEW.md for the actual scope limits.
