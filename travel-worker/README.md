# Greece by Dan travel helpers

Separate from the existing Decap OAuth Worker. Production Viator Basic Access; no AI, payments or bookings on this site. Never add credentials to this repository.

## Deploy

From this directory, using a current Wrangler CLI (4.36 or later):

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put VIATOR_API_KEY
```

Enter the **Production** key in the secret prompt, never in a shell argument or chat. The config creates `SEARCH_LIMIT` (20 calls per 60 seconds, per IP and Cloudflare location). This is abuse mitigation, not a global spending cap. Shared networks may share the allowance. Namespace 1047 must be unique to this limiter in your account.

Alternatively create `greecebydan-travel-api` in the Cloudflare dashboard, deploy `worker.mjs`, add a Rate Limiting binding named `SEARCH_LIMIT` with namespace `1047`, limit `20`, period `60`, and add `VIATOR_API_KEY` as a Secret. If the dashboard does not offer the binding, deploy with Wrangler.

Expected URL: `https://greecebydan-travel-api.onelion-studio.workers.dev`. If different, update the API URL in `assets/js/concierge.js` before publishing. `/health` reports configuration readiness only: `{"ready":true}` is not proof that Viator authenticated successfully. Then test the public concierge destination loading and both searches; check every booking link retains Viator's full `productUrl` unchanged.

## Data and filtering

- `/destinations` and `/products/tags`: cache weekly; destinations use Greece's actual parent hierarchy. No invented destination IDs.
- `/products/search`: on visitor search, up to 50 results, 15-minute cache. No ingestion, automatic pagination or catalogue crawl.
- Category IDs are resolved from English taxonomy names; absent expected names fail closed. Verify names with the live API before considering launch complete.
- Boat listings require explicit captain/skipper/crew text and exclude self-drive/rental/ferry phrases. This conservative text filter can miss valid tours; it cannot establish safety or licences. Wine listings require wine-related text. Preferences use listing text or official flags, never guessed suitability.
- The top three matching results rank by rating weighted by review count, then starting price. The choice is limited to the first search batch, not a claim to the best tours in Greece.
- Prices are Viator's indicative per-person from-prices, not date/party quotes. Basic Access does not support `/availability/check`. No availability claims.
- API returns no full descriptions, review text or `viatorUniqueContent`; aggregate ratings load at runtime. External UI script is blocked by site robots.txt; Worker robots blocks all routes and responses have `X-Robots-Tag: noindex`.
- Secret stays on the Worker; CORS accepts only the production site. Origin checks do not authenticate clients. Rate limiting, small payloads, fixed endpoints and enumerated inputs bound work; Cloudflare usage should still be monitored.
- No raw upstream errors or secret logging. No durable visitor profiles. Search preferences are sent to this Worker; destination, category and price/flags are sent to Viator. No AI processing of Viator content.

Documentation verified October 2026:
https://docs.viator.com/partner-api/technical/
https://partnerresources.viator.com/travel-commerce/technical-guide/
https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

Run `node --test travel-worker/worker.test.mjs` from the repository root. Mock tests cannot validate an actual key or live taxonomy. Live validation requires the user's secret deployment.

## Impact / Click&Boat access check

Add `IMPACT_ACCOUNT_SID` and `IMPACT_ACCESS_TOKEN` as encrypted Worker Secrets, then redeploy this `worker.mjs`. The token needs read-only access to retrieve a catalog and list its items. The SID must come from the same scoped token as the Auth Token; the numeric partner ID is not an Account SID.

Open `/impact/check` directly in a browser. It makes two fixed GET requests to Click&Boat program `19914`, catalog `18365` (`CAB_EN_GS` from the supplied feed). It verifies the catalog identity, samples the first 25 items and returns only field coverage, safe destination slugs extracted from validated tracking links, total count when supplied, and the check timestamp. It does not expose raw items, descriptions, secrets or Impact resource URIs. Successful summaries are cached for five minutes with a credential fingerprint; there is no catalog crawl or follow-up pagination. The existing per-IP limiter also applies to this route. As with the concierge routes, this is abuse mitigation rather than authentication; the diagnostic summary is public.

`connected: true` proves these two API reads succeeded. It does not prove Greek coverage, skipper inclusion, licences, passenger capacity, a price unit or date availability. Empty fields in this first-page sample do not establish absence throughout the catalog. No Click&Boat recommendations are enabled in the public concierge until the live data is assessed. `InStock` must never be used as boat availability for a travel date.

The GitHub Pages workflow publishes the static site only; changing the Worker source in GitHub does **not** deploy it to Cloudflare. In Cloudflare open `greecebydan-travel-api` → Edit code, replace the source with this file and select Deploy, preserving existing secrets and the limiter binding. Both Viator and Impact logic are in this one file.

Official API reference:
https://integrations.impact.com/partner-api-reference/readme/authentication
https://integrations.impact.com/partner-api-reference/reference/catalogs/catalogs
https://integrations.impact.com/partner-api-reference/readme/pagination

## First audit iteration (unpublished)

The same Worker gains an optional `/events` endpoint and additive card fields.
No secret, OAuth Worker, CMS path, product URL or deployment is changed.
Deploy Worker first, then Pages, only after approval. Old Worker DTOs still render
in the new client; missing fields display “Check … on Viator”.

- Text negation/conditional matches fail closed. This can omit valid listings;
  it is not verified tour suitability. Hard preferences are never relaxed.
- `productCode` is preserved; `durationMinutes` is derived only from search
  `duration` fields. `departure` remains null. No coordinates inferred from a
  destination and no new details/locations API calls are made.
- Image rendering is **off by default**. Only after confirming account terms
  and a real response, set `VIATOR_IMAGES_APPROVED=true`. The Worker then
  passes a supplier cover variant from `images[].variants[]` on
  `media.tacdn.com` (400–1200px). No public Viator.com scraping, photo downloads,
  image proxy or persistent image storage. Search cache remains 15 minutes.
  Front-End Guide permits API image merchandising; individual terms still apply.
- `/events` is disabled (503) unless both `INTERACTIONS` Analytics Engine and
  independent `EVENT_LIMIT` bindings exist. Commented config is an activation
  example, not an activated dataset. Review proposed privacy text first.
- Event schema v1: allowlisted name/source/placement/kind, optional product code,
  and count 0–3 only. No visitor ID, IP, full URL, free text, preference values,
  timestamps from client or health details are stored in event points.
  IP is used transiently by Cloudflare's rate limiter; infrastructure logging
  remains governed by the account. DNT/GPC disable the client collector.
- Event points: `index1=event name`; `blob1=version`, `blob2=source`,
  `blob3=placement`, `blob4=kind`, `blob5=productCode`, `double1=result count`.
  Aggregate by name/source/placement/kind over a fixed date range. Without
  visitor identifiers these are event counts, not unique users or a joined
  personal journey. One explicit click creates one client event; transport is
  best effort (no retries). Analytics Engine sampling/retention and account
  access must be checked at activation; exact unique counting is not promised.
- Metrics use no-referrer and omit credentials; a collector failure never blocks
  a link. Generic article direct-link clicks are measured separately from
  concierge card clicks; no affiliate URL parameters are sent.

Before release: approve the Milos/Feta editorial repair, verify actual API image
and duration payloads, complete mobile browser/screenshots, agree privacy text,
activate bindings only if desired, and validate runtime in Workers. This branch
is a review draft, not a production deployment.
