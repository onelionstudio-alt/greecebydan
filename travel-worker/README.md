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
