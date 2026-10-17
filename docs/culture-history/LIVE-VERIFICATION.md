# PR25 actual staging verification — 17 October 2026

[Real workflow 39064582890](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39064582890)
passed. Source 840bcfb98044a4dc1aa2c14dfabc38b7d6aef7ab, Worker SHA256
0c16aedd028ade0593eb19bebd374eefdf2bd5a893b67edfaf41dbba78e3ea00.
The deployed frontend assets also matched metadata hashes. No asset overlay,
response fixtures, key sharing, production change, purchase or availability call.

## Results reviewed

| Check | Result / actual scope |
| --- | --- |
| New frontend + Cloudflare Worker | PASS, actual assets and source verified |
| Acropolis / included guide | 2 qualified shared listings: 240841P1, 240841P3; **German GUIDE only** |
| Delphi / included guide | 3 qualified private local visits: 198006P36, 464406P5, 464406P12 |
| Meteora / included guide | 1 qualified private product: 6575P20; no invented extra matches |
| Meteora / open suggestions | 368783P2, 438152P1, 136367P3; guide inclusion explicitly not confirmed |
| Boat regression | 3 real Milos products; article context and original tracking retained |
| Wine regression | 3 real wine-tasting products; live inventory may differ over time |
| Comparison | 2/3 selection where available; price amounts not compared with unknown units |
| Mobile / desktop | Actual staging Chromium 390/1440 and WebKit 390; no overflow; keyboard/axe PASS, zero checked-region violations |
| Other viewport regression | Prior recorded-response Chromium/WebKit QA covers 320/768 too; distinct from live stage scope |
| Network | 14 scenarios, all search HTTP 200; zero normal UI event/analytics calls and zero new photo/review API calls |
| Photo policy | Legacy apiPhotos false, existing approved supplierCovers true; no new photo feature enabled |
| Physical devices | iOS/Android NOT TESTED; no physical devices available |

The workflow initially labels the raw collection REQUIRES_INVENTORY_REVIEW.
This review closes that gate with the explicit limits above. Read
`evidence/reviewed-live.json` alongside the original `real-staging.json`; the
original evidence status was not rewritten to conceal the distinction.

## Manual path / condition checks

In actual cloud Chrome, clicking the Milos article concierge CTA prefilled Boat
and Milos without manual changes. Search returned 345728P2, 32830P5, 32830P4.
Its affiliate href matched the accessible Viator product and retained mcid/pid/
medium/api_version. Culture Delphi returned three confirmed-guide listings.
The 464406P5 CTA URL was opened unchanged in a controlled new tab and the correct
Viator product heading was verified. No booking button was pressed.

Cloud-browser extension metadata did not reliably expose newly opened _blank
popups; therefore automatic popup creation itself was not independently
instrumented. CTA href, target=_blank, sponsored/noopener/noreferrer, and the
actual target product are verified. This is an instrumentation limitation,
not evidence of a broken user link. No popup/security setting was weakened.

With free cancellation selected, non-refundable 464406P5 disappeared and live
103214P181 + 198006P61 remained. Adding Shared group produced safe empty with
filters preserved, rather than relabelling private tours as shared. This proves
listing-level filtering, not a cancellation guarantee for any future option/date.

## Remaining scope and release decision

No technical failure occurred in the tested paths. **English-language/private
Acropolis coverage is not established:** the bounded shortlist returned two
German shared tours. Their language is visible; do not advertise this as an
English Acropolis selector. This does not prove Viator has no English tours.
Improving that coverage is a subsequent selection iteration, not a reason to
invent suitability or remove language disclosure.

Delphi visitors still need to distinguish a local guide from transport from
Athens. Meteora guide service does not guarantee every monastery interior or
step-free access. Current checks are supplier statements, not independent
inspections, final quotes, real-time seats or individual suitability advice.

The owner staging-upload gate is closed. No further upload is requested.
PR25 remains a draft for the owner to review this limited MVP and approve any
release separately. No merge/main/production publication was performed.
