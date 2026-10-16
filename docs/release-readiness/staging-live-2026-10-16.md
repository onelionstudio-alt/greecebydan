# PR #21: live staging addendum — 16 October 2026

**NO-GO remains.** This addendum supersedes the earlier assertion that remote
staging and all real API reads are unavailable. No main merge, production Worker
deployment or Pages publication was performed by the assistant.

## Evidence and scope

The owner created `greecebydan-travel-api-staging.onelion-studio.workers.dev`
through the Cloudflare dashboard, copied `travel-worker/worker.mjs` from source
commit `bbd77807a609f9037963a8d4076bf329c1417ecb`, and provided screenshots of:

- `VIATOR_IMAGES_APPROVED=false`, `INTERACTIONS_ENABLED=false`;
- `SEARCH_LIMIT`, namespace 1049, limit 20 / period 60;
- reported `/health`: initially `ready:false`, then `ready:true` after adding
  `VIATOR_API_KEY` directly as a Cloudflare secret. No key was provided in chat.

The owner executed reviewable fetch calls in their browser on the existing site.
The assistant did not independently capture raw upstream responses or inspect
the authenticated Cloudflare account. These are **owner-assisted real staging
tests**, not fixtures and not independent proof of the uploaded source hash.

| Staging request | Reported result |
| --- | --- |
| GET /destinations | 200; Milos 22323, Santorini 959 |
| POST /search, boat/Milos, no extra preferences | 200; 345728P2, 32830P5, 32830P4 |
| POST /search, wine/Santorini, no extra preferences | 200; 85166P7, 424217P3, 44792P8 |

All six returned product URLs use HTTPS on `www.viator.com`, match their product
code and contain `mcid=42383&pid=P00320497&medium=api&api_version=2.0`.
All six returned `hasImage:false`. A repeated run returned identical results;
the 15-minute product cache may explain this and the repeat is not independent
fresh upstream verification. Dates, bookable places and a party-specific quote
were not checked or claimed. No bookings or payments were made.

The owner also tested the new bundled PR staging UI for both categories (preview source metadata bbd77807a609f9037963a8d4076bf329c1417ecb). Article context, results and first affiliate transitions were reported successful. The owner reported apiPhotos=false, interactionEvents=false, zero visible API photos, and POST /events returned 503 Events disabled. This confirms the older bundle, not the subsequent price/Wine correction. The production UI was separately owner-tested for both categories. Its Milos
345728P2 link initially led to a destination catalogue with the selected product,
and a subsequent click reached the matching product detail URL. This does not
complete the new PR frontend's staging journey. URL parameters do not establish
that a future commission will be attributed or paid.

## Network failure classification

Ordinary unauthenticated requests from Work produced distinct evidence:

- Production and staging Worker `/health` and `/destinations`: Cloudflare 403,
  plain-text `error code: 1010`. Staging health Ray ID
  `a4b68a2bca88cc01-DFW`; destinations `a4b68a2b392ecc01-DFW`.
- Public Viator.com: DataDome 403 HTML challenge.
- Partner API `/partner/destinations` without a key: 400 JSON
  `MISSING_HEADER_VALUE`, missing `exp-api-key`. Thus the API hostname is reachable
  from Work; authentication and permissions cannot be tested there without a key.
- The owner's normal browser reached both Workers, and staging authenticated API
  reads succeeded through that browser. There is no evidence of a blanket Work
  network outage or a Viator API authentication failure behind the original 1010.

The exact Cloudflare rule, enforcement owner and scope are still unverified.
Do not disable production protection globally or attempt browser-signature
spoofing/CAPTCHA bypass. Account-side diagnostics or Cloudflare support may be
needed for independent automation. Health does not call Viator in the reviewed
source, so its 1010 cannot be an upstream API response from that implementation.

## Focused correction: price and Wine

- Removed unconditional per-person labels. The search adapter returns
  `priceBasis: unknown` because this integration has no verified unit metadata
  for the summary amount. The frontend supports explicit per_person/per_group,
  but missing, unknown and unrecognised values show neither unit and explain
  that the pricing unit/party size/final price must be checked on Viator.
- Do not map PRIVATE_TOUR, a title mentioning group, or pricingInfo UNIT directly
  onto a search summary's basis. A booking-unit price and a normalised summary
  amount are not automatically interchangeable. No division/multiplication or
  currency conversion is invented.
- The budget control now explicitly compares advertised starting amounts with
  varying bases. It is neither a per-person budget nor a whole-party quote.
- Wine needs an explicit wine-tasting activity in the listing text. Wine with
  lunch, a winery visit or a wine category alone is insufficient. Negative,
  optional, paid-extra and conditional tasting sentences veto the candidate.
  This is conservative source-reported matching, not operator verification.
- 424217P3 is not an established tasting recommendation. If its live text lacks
  qualifying evidence it is excluded; no allowlist is used to force it through.

Viator's [technical guide](https://docs.viator.com/partner-api/technical/) and
[pricing guide](https://partnerresources.viator.com/travel-commerce/pricing/?source=specs)
distinguish unit pricing and from-price concepts. The transactional
[certification guide](https://partnerresources.viator.com/travel-commerce/certification/)
is not treated as proof of this Basic search payload's pricing unit or as a
new mandatory booking certification requirement for this click-out integration.

## Remaining release gates

1. Upload the regenerated `staging-preview.generated.mjs` ONLY to the existing
   staging Worker via Cloudflare Workers & Pages → staging Worker → Edit code →
   Deploy. Keep both feature variables false. Do not touch the production Worker.
   No assistant-accessible Cloudflare deployment credential is available.
2. Run `tests/staging-e2e.cjs` from a machine with normal staging access and
   Playwright Chromium, from this branch's repository root. It checks current
   API/client hashes, restored Milos and Santorini article contexts, real search
   responses, neutral price labels, Wine reasons, mobile-sized overflow, exact
   affiliate href and product identity after click, and ordinary client traffic
   before separately probing disabled /events. A blocked partner page or no
   confirmed Wine matches requires review, never synthetic replacement results.
   Also inspect live Wine listings/inclusions for the returned products; the
   regex is not a substitute for final editorial confirmation. Do not book.
3. Confirm no auto-injected RUM/beacon in the Cloudflare dashboard and in browser
   Network with Preserve log across both paths. Expect no ordinary /events,
   cloudflareinsights/beacon or media.tacdn.com requests. The intentional endpoint
   diagnostic alone should return 503 Events disabled. Old endpoint refusal
   does not establish absence of ordinary client requests in the new bundle.
4. Close the factual privacy gate in `privacy-policy-review.md`: operator legal
   identity/contact and actual infrastructure/email processing arrangements,
   retention criteria and applicable transfers; align the public notice.

Real iOS/Android devices were not available. Playwright's 390px touch viewport
is emulation, not a physical-device test. This is a disclosed residual UX risk,
not evidence of a known device defect. Optional analytics consent and API-image
approval may wait until those features are proposed for activation; they remain
off. Commission settlement and date-specific booking availability are outside
this no-purchase release test and are not promised to visitors.

Local Chromium installation was attempted but the browser download was not a
valid archive. The PR CI now runs the synthetic browser regressions separately;
those are not described as a real staging E2E pass. Work's Cloudflare 1010 still
prevents independent real staging verification from this environment.

## Isolated preview package

`scripts/build_staging_preview.py` builds
`staging-preview.generated.mjs` from `_site` and the real Worker. It performs no
deployment. Source production files are unchanged. The generated bundle:

- runs only on the exact staging hostname (fails closed elsewhere);
- serves built public PR HTML/CSS/JS/context data, excluding admin;
- changes SITE and client API URL **only in this generated staging copy**, so
  the browser tests the staging UI and API on the same origin;
- adapts a browser's same-origin GET /destinations without an Origin header;
  explicit foreign origins and unmarked requests still fail core origin checks;
- forces both optional features false even if staging variables are changed;
- adds a visible staging banner, no-store and noindex headers, and robots deny;
- serves `/_preview/meta` with source commit, original API source SHA-256 and
  transformed asset hashes (no secrets);
- redirects only known editorial artwork asset paths to the public site;
  it neither downloads nor displays Viator API photographs;
- does not expose the unrelated Impact diagnostic route or production admin.

Reproduce from the repository root:

```sh
python scripts/build.py
python scripts/build_staging_preview.py
node --check docs/release-readiness/staging-preview.generated.mjs
```

Dashboard deployment, owner only: open the Worker whose full name ends in
`-staging`, replace its code with the generated module and deploy. Preserve the
existing staging secret and limiter. Do not attach a custom domain, production
route, analytics dataset or trigger. Do not copy this module into production.
This same-origin preview changes only staging origin wiring; it is not proof of
production cross-origin behaviour after a future release.

Earlier preview baseline: all 17 Python tests (15 existing + 2 preview
tests) and all 22 Node tests passed; site build produced 13 published stories;
generated-module syntax and runtime checks passed. The runtime smoke verified
the original API source hash, both article entry contexts, disabled client
flags, foreign-origin rejection, allowed preflight and 503 Events disabled even
when opt-in variables/bindings were deliberately supplied to the local wrapper.
These adapter checks use local fixtures/no network and are not additional live
Viator evidence. No independent browser/device result is claimed for this new
remote frontend yet.

Repeat after uploading the corrected bundle: staging Milos article → Compare Milos boat trips →
preselected boat/Milos → real results → original affiliate product URL. Repeat
for Santorini wine. Check network traffic contains no `/events`, API photos or
analytics beacon. An explicit diagnostic POST to staging `/events` must return
503 `Events disabled`; do not send a real analytics event.

## Minimum release gates

Real API staging reads are now PASS within the owner-assisted scope above.
Release remains blocked until the price-unit issue, wine relevance, full PR
staging journey and hard-off checks are resolved; current-head CI must pass and
the factual privacy gate must be closed. Physical-device testing remains an
explicit limitation rather than an observed defect. A separate owner approval is still required for
merge and for publication. Production smoke and later affiliate commission
reconciliation can follow release; first real API/UI validation cannot.
