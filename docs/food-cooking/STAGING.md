# Owner staging action only — no production change

Food cannot be tested against the old staging Worker: it rejects the new category.
This environment has no authenticated Cloudflare deployment connector or staging
API credentials. Do not paste API keys into chat or create new credentials for it.
The existing named staging Worker already has its key and SEARCH_LIMIT binding.

1. Open Cloudflare → Workers & Pages → **greecebydan-travel-api-staging** → Edit code.
2. From this PR download/open `docs/food-cooking/staging-food.mjs` and replace the
   staging module with its entire content, then Deploy **only that Worker**.
   Do not use the production `greecebydan-travel-api` or change main/production.
3. Keep existing secret and rate-limit binding. The package forces Food/Culture
   and previously approved supplier covers on for staging, legacy Photo API and
   interactions off, blocks other hosts and applies noindex headers.
4. Open https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta
   and send only its JSON. Expected source/API hash is in staging-manifest.json;
   foodEnabled/cultureEnabled/supplierCovers=true, apiPhotos/interactionEvents=false.
   This metadata contains no API secret. Do not send settings/secrets screenshots.

After that Codex triggers `Food real staging QA` by changing RUN_REAL_STAGING on
this branch. It verifies source and asset hashes, actual Food queries in Athens,
Naxos and Crete, Boat/Wine/Culture, exact affiliate hrefs, safe empty states, keyboard,
comparison, axe/overflow and prohibited-request absence in Chromium/WebKit. It
records real results and screenshots without booking or changing production.
The collection is then reviewed: safe empty is not evidence of sufficient inventory.

Local generation (no deployment):
`python scripts/build.py`
`python scripts/build_staging_preview.py --supplier-covers --culture --food --source-commit <reviewed-source-sha> --review-label 'Food preview' --output docs/food-cooking/staging-food.mjs`

No production release or Transfers implementation is represented as complete at
this handoff. After successful Food staging, proceed to a separate Transfers branch
including the verified Food changes, without asking for another implementation approval.
Keep the Transfers diff separately reviewable and resolve its dependency before any release.
