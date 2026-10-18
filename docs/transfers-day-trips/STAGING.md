# Owner action: isolated Transfers staging only

Do not merge PR26/27, change main, or deploy the production Worker/site.

1. Open Cloudflare → Workers & Pages → **greecebydan-travel-api-staging**.
2. Choose **Edit code**. Replace the complete module with `staging-transfers.mjs`
   from this directory. Do not append it to the old module. Deploy this staging
   Worker only. Preserve its existing API secret and rate-limit binding; do not
   send credentials or settings screenshots containing secrets.
3. Open
   <https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta>
   and return that public JSON. Expected source commit is
   `2affa0ba600e1a8e412ce7c966e23c782e9dd21e`, `transfersEnabled: true`,
   `foodEnabled: true`, `cultureEnabled: true`, `supplierCovers: true`,
   `apiPhotos: false`, `interactionEvents: false`.
4. Stop there. This is not release approval. We will then run the prepared real
   Chromium/WebKit frontend/API tests, review taxonomy, result counts and exact
   partner links without booking. No extra environment flag is needed: the
   preview hard-codes these flags and rejects production-host requests.

The artifact includes the current Food dependency and existing Culture/Boat/Wine
UI, noindex headers, a preview banner, and approved supplier covers only. Legacy
Photo API and interaction recording are forced off. It contains no API key.
Bundle and asset hashes are recorded in `staging-manifest.json`.

After owner deployment, a commit changing `RUN_REAL_STAGING` triggers
`.github/workflows/transfers-staging.yml`. It must not be triggered against the
old Food module. Browser recordings and synthetic tests are not substitutes for
this gate. Physical iOS/Android testing has not been performed.
