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
