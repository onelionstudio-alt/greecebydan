# Ferries & Island Hopping — integration audit, 18 October 2026

Documentation only. No ferry UI, API request, affiliate link, timetable, fare,
seat availability, booking, account application or third-party script added.
Repository review does not establish a Ferryhopper account entitlement, accepted
contract, issued key or approved Greece by Dan tracking URL. Do not infer those
from publicly documented integration options. No credentials requested or exposed.

| Option | Publicly documented data / booking flow | Account-specific facts still unknown | Recommendation |
|---|---|---|---|
| Ferryhopper approved referral link | Supplied tracking link; external booking on Ferryhopper | Approved website/account, actual link and account terms | Smallest future scope; no schedules/prices on our page |
| Ferryhopper Search Widget | Partner dashboard iframe; departure/arrival/date/trip-type input; booking flow on provider | Issued embed, permitted channels, consent/CSP, mobile behaviour and tracking | Possible future provider-managed search; not our API |
| Ferryhopper Trips Widget | Live route/schedule/price content, configured ports; provider booking; API key available by request | Widget-specific grant/key, quotas, permitted exposure and caching contract | Evaluate only with issued configuration; not evidence of general API access |
| FerryhAPI (separate B2B agreement) | Schedules, routes, fares, seats; booking/ticketing/boarding passes; data-only use advertised | Commercial agreement, credentials, schema, fees, quotas, licence, caching/support | Excess scope now; no API model switch or booking system |
| FerriesinGreece alternative | Affiliate text/banner link or embeddable engine, tracked booking handled by provider | Approved account/link, current commercial terms; no raw live API established by affiliate page | External referral alternative; no custom live search |

Public sources checked:
1. https://partners.ferryhopper.com/affiliate-widgets — Trips key by team request;
   Search iframe from affiliate dashboard; widgets use provider live data.
2. https://partners.ferryhopper.com/ferryhapi — separate B2B/data-only capability;
   marketing capabilities are not our account rights.
3. https://partners.ferryhopper.com/affiliate-program-terms-conditions — version1,
   updated 2 October 2026. Written programme approval and approved channels are
   required. Use supplied/approved materials, conspicuous disclosure beside links,
   unmodified tracking, no fabricated fares/times/availability or platform scraping.
   Booking support belongs to Ferryhopper. Cookie/consent duties remain with the
   relevant site operator. Accepted account-specific agreement remains unverified.
4. https://www.ferriesingreece.com/affiliate-program/ — supplied link/banner/engine,
   own affiliate reference, provider booking; requires nofollow link attribute.
   Public affiliate page does not establish a custom schedules/fares API grant.

Minimal proposed later English copy (not implemented):
“Check ferry routes and prices on Ferryhopper. You’ll search and book on their
website; schedules, fares and availability are confirmed there. Affiliate link:
I may earn a commission if you book.”
Use only an actually issued URL without rewriting its tracking parameters.
Do not prefill an unverified route, imply same-day connections or safe minimum
transfer times, manufacture a timetable, or scrape public search results.

Before any implementation: owner chooses link vs approved provider widget and
confirms approved domain, issued configuration/link and applicable account terms.
For an embed, inspect actual network/storage, consent, CSP and responsive/keyboard
behaviour before it loads on our site. For raw API, obtain contract/schema/rights,
freshness/quotas and attribution, then test permitted authenticated responses in
isolated staging. Do not send keys in chat. Separate owner release approval is
still required. No tests or account checks are claimed for unissued integrations.
