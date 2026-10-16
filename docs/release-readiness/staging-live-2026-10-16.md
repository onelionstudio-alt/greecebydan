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

The production UI was separately owner-tested for both categories. Its Milos
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

## Additional release blockers found in the real walkthrough

1. **Price unit:** production concierge labelled 424217P3 as per person while the
   owner's Viator screenshot labels its starting price per group. The PR client
   likewise hard-codes `per person`; Worker only reads `pricing.summary.fromPrice`
   and does not establish its basis. Do not assume this is merely FX or a valid
   per-person conversion. The price-unit display and budget semantics need a
   focused fix plus real data validation before release.
2. **Wine relevance:** 424217P3 (`Hiden gems private tour`) appears in wine
   results. Its title alone does not establish included tasting. The listing
   details/inclusions/optional costs must be checked; it has not been proved
   either a false positive or an included wine experience by these screenshots.
3. **Full PR UI journey:** not yet owner-tested on remote staging. Client flags,
   event endpoint hard-off, contextual article links, mobile, filter/empty/error
   states and actual product-detail landings remain to be tested there.

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

Local verification of this change: all 17 Python tests (15 existing + 2 preview
tests) and all 22 Node tests passed; site build produced 13 published stories;
generated-module syntax and runtime checks passed. The runtime smoke verified
the original API source hash, both article entry contexts, disabled client
flags, foreign-origin rejection, allowed preflight and 503 Events disabled even
when opt-in variables/bindings were deliberately supplied to the local wrapper.
These adapter checks use local fixtures/no network and are not additional live
Viator evidence. No independent browser/device result is claimed for this new
remote frontend yet.

Next browser journey: staging Milos article → Compare Milos boat trips →
preselected boat/Milos → real results → original affiliate product URL. Repeat
for Santorini wine. Check network traffic contains no `/events`, API photos or
analytics beacon. An explicit diagnostic POST to staging `/events` must return
503 `Events disabled`; do not send a real analytics event.

## Minimum release gates

Real API staging reads are now PASS within the owner-assisted scope above.
Release remains blocked until the price-unit issue, wine relevance, full PR
staging journey and hard-off checks are resolved; current-head CI must pass and
the existing privacy/mobile review conditions must be addressed or explicitly
accepted where appropriate. A separate owner approval is still required for
merge and for publication. Production smoke and later affiliate commission
reconciliation can follow release; first real API/UI validation cannot.
