# PR25 isolated staging handoff — not production

Only the named existing staging Worker may receive this generated module. Do
not paste it into greecebydan-travel-api, change production routes, merge the PR,
or deploy the production website. The audit route is removed by this package.

## Deployment procedure (completed by owner)

1. Open `docs/culture-history/staging-pr25.mjs` on the PR branch in GitHub.
   Use **Download raw file** (download-arrow icon above the source), then open
   the saved file in a text editor and copy all of it. It is a single module.
2. Cloudflare → Workers & Pages → **greecebydan-travel-api-staging** → Edit code.
   Replace the current audit module with this file and Deploy to that Worker.
3. Preserve VIATOR_API_KEY and SEARCH_LIMIT. No secret in chat, new binding,
   service/account grant or production setting is needed. The wrapper explicitly
   sets Culture true, legacy API photos/events false and existing supplier
   covers true, independent of conflicting staging flag values.
4. Open `https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta`
   and return its JSON. Expected values are in staging-manifest.json:
   sourceCommit 840bcfb98044a4dc1aa2c14dfabc38b7d6aef7ab;
   apiSourceSha256 0c16aedd028ade0593eb19bebd374eefdf2bd5a893b67edfaf41dbba78e3ea00;
   cultureEnabled true, apiPhotos false, interactionEvents false,
   supplierCovers true. No categoryAudit route should remain.

Bundle SHA256:
`d1ff7c62c7c8e6f4aefbfb6a3d533e290d7caa447e311a3e786c5446d19ee28b`.

## Assistant follow-up after metadata confirmation

Trigger the read-only workflow by updating docs/culture-history/RUN_REAL_STAGING
on this feature branch. It uses the actual remotely served frontend and Worker,
not an overlay or synthetic API body. It verifies manifest/source/asset hashes,
Athens/Delphi/Meteora strict guide cases and Meteora open mode, existing
article→Boat/Wine prefill and searches, safe empty results, available 2–3 compare,
keyboard/axe and exact affiliate hrefs. Chromium 390/1440 and WebKit 390; local
recorded-response QA additionally covers 320/768. Pacing preserves rate limits.
No purchase, availability, review/photo API or analytics request.

Review actual recommendation coverage rather than declaring a safe empty as a
commercially useful result. Do not merge until real staging and any unsupported
conditions/limited inventory are reviewed. Physical iOS/Android remain untested.
If a partner landing is blocked by the test environment, report that separately
from Partner API status; do not bypass the block or claim landing verification.

The final production release requires a reviewed plain Worker deployment and
CULTURE_ENABLED=true, followed by frontend publication. This is a future owner
release decision, not an instruction to publish now. Keep current photo flags,
affiliate settings and analytics off. No repository deployment is performed here.

## Verification completed, 17 October 2026

Owner deployed the exact manifest source/hash. Real workflow 39064582890 passed
14 actual frontend/API scenarios, Chromium/WebKit mobile and Chromium desktop,
comparison, accessibility, affiliate href integrity and normal-network hard-off
checks. Reviewed results: PASS with the inventory limits in LIVE-VERIFICATION.md.
No further owner staging deployment is needed for this source. Production/main
remain unchanged; a separate owner release decision is still required.
