# Production release verification — 18 October 2026

**PASS with documented inventory limits. Food PR26 and Transfers PR27 released.**
Owner explicitly authorized both merges and production publication. Main:
6213a71af025953940203e052c50f5428c4cb6d9. Static deployment39129263943 passed;
owner subsequently deployed the reviewed production Worker and retained the
configured flags. Both capabilities now active in the actual public frontend.

Real production workflow:
https://github.com/onelionstudio-alt/greecebydan/actions/runs/39133021540
Artifact12138449277 (production-categories).14 real frontend/API cases PASS,
all search/destination responses200. Chromium390/1440 and WebKit390; zero axe
violations or horizontal overflow, keyboard details and comparison focus passed.
Actual2/3 comparisons exercised. Published JS/CSS/events assets match this
repository source. No fixtures, routing overrides, fake products or purchases.

| Production scope | Actual product codes |
|---|---|
| Athens food walk | 101933P4 |
| Athens food tastings | 417834P1,26368P30,388033P1 |
| Naxos cooking | 9238P50,5649732P3 |
| Crete cooking | 364301P5 |
| Open Athens transfers | 189416P13,323957P7,241463P2 |
| Athens city→airport | 323957P7 |
| Airport→Piraeus port | 444139P7 |
| Boat regression | 345728P2,32830P5,32830P4 |
| Wine regression | 44792P8,396495P4,21559P6 |
| Culture regression | 240841P1,240841P3,341709P1 |

Seven distinct Food and four distinct Transfer products in this bounded sample.
Food requires explicit supplier activity evidence; transport and exact-direction
filters retain explicit detail/option evidence.189416P13/241463P2 keep unknown
directions and do not satisfy an exact-route filter. No artificial result padding.
Original affiliate productUrl/hrefs match exactly; price units remain unknown.
Normal analytics/events requests:0. New photo/review/booking endpoint calls:0.
One separate diagnostic POST with an invalid empty payload returned503 Events
disabled; it cannot store an event. Frontend interactions/legacy API photos are
disabled and approved supplier-cover gate enabled. Real cover and no-cover
fallback states visually reviewed in production screenshots. No public-page
photos downloaded or reused; no raw review/viatorUniqueContent stored here.

Manual production Food search and2-card comparison succeeded. Actual production
444139P7 CTA opened the matching Viator title and full unchanged tracking URL.
No availability or booking action. See evidence/manual-live.json.

Pre-release:60 Node +25 Python tests, five browser suites including320/390/768/
1440 responsive regression passed after main retarget (run39128830560). Real
staging14-case run39127525426 passed. Physical iOS/Android not tested. Production
320/768 were not repeated in this live run.

Limits: first50 summaries/first12 eligible details, not all Viator inventory or
travel-date availability. Airport→city and port→airport were safe empty in
staging; daytrip results there were two named Athens sightseeing tours, not
confirmed out-of-town excursions. Those requests were not repeated in the
production14-case sample. Capacity, bags, child seats, delay waiting, hours,
exact option pickup, allergies, admission/site guiding and final party prices
remain unconfirmed. No promises inferred from titles or a supplier menu.

The old production capability failure is resolved after owner code deployment.
No further activation action is required. Ferries remains audit-only; no new
feature, analytics, photo/review endpoint, CMS/OAuth or SEO change was added by
this verification branch. Main and production were not mutated by QA workflows.
