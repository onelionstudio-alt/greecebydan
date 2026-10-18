# Real Transfers staging review — 18 October 2026

Runtime cb22380fc3c06cfa32a77f57e11602a123f0a274; Worker SHA256
a0b0141b7c396d449d70f799de4c1728465213b2e590f7032c30b849d08dfa44.
Workflow https://github.com/onelionstudio-alt/greecebydan/actions/runs/39127525426,
artifact12136223725. **PASS with documented inventory limits**; not release approval.
Raw collection retains COLLECTED_REQUIRES_INVENTORY_REVIEW; live-review.json records
this completed review. No production or main modification.

14 real frontend/API scenarios, all search/destination responses HTTP200.
Chromium390/1440 and WebKit390. Recorded regression separately covers320/768.
Zero axe violations/overflow, keyboard details and comparison focus pass; live
2/3-product comparison exercised. Hashes/flags match; exact returned affiliate
hrefs and unknown pricing units preserved. No normal events or new photo/review/
booking requests. Approved supplier covers remain enabled; legacy Photo API and
analytics disabled. Physical iOS/Android not tested.

| Request | Qualified results | Evidence / boundary |
|---|---|---|
| Open airport/hotel-transfer suggestions | 189416P13, 323957P7, 241463P2 | Included transport and private-group metadata. Direction unknown for first/third; not suitable for a confirmed-direction filter |
| Athens city → airport | 323957P7 | Consistent explicit option direction; listed transport |
| Airport → Athens city | 0 | Safe empty response; not evidence that Viator has no such products |
| Airport → Piraeus port | 444139P7 | Consistent explicit option direction; listed transport |
| Piraeus port → airport | 0 | Safe empty; no inferred reverse service |
| Day trips / tours with transport from Athens | 349296P1, 349296P5 | Named full/half-day Athens sightseeing tours. Listed transport, scoped Athens start and structured duration at most one day. Does not establish an excursion outside Athens |

Six distinct products in this bounded sample (four transfers, two sightseeing
tours), not exhaustive inventory or date/seat/vehicle availability. Day Trips
taxonomy resolved successfully, but that taxonomy does not prove travel outside
the city. The current selector covers one-day sightseeing with transport; do not
market these results as confirmed Delphi/Meteora or other out-of-town day trips.
Expansion of out-of-town coverage remains unverified and must retain evidence rules.

The cards do not promise vehicle capacity, luggage allowance, child seats,
delayed-flight waiting, operating hours, exact pickup/drop-off, accessible vehicles,
inside-site guiding or admissions. Driver language and individual suitability are
not inferred. STANDARD cancellation metadata is not an option-specific deadline.
Starting amounts remain unknown-unit, not fixed party fares. Public landing-page
claims were not copied back into API evidence.

Manual real UI: selected airport→Piraeus port, received444139P7, clicked the actual
CTA and verified matching Viator heading/code and unchanged tracking URL. No
availability or booking action and no public-photo extraction/reuse. See
manual-live.json. Approved supplier imagery visible on the mobile card; fallback
without a cover also visible on a real city-tour card. Screenshots reviewed from
the artifact; mobile layout shows facts and CTA without horizontal overflow.

Regression: Food9238P50/5649732P3; Culture240841P1/240841P3/341709P1;
Boat345728P2/32830P5/32830P4; Wine44792P8/396495P4/21559P6.

Release conditions: separate owner authorization; Food PR26 dependency must be
merged only when approved, then reconcile/retarget PR27 to main and rerun final
checks. Limited route coverage is a documented assortment limitation. Ferries
remains audit-only; analytics and prohibited photo endpoints must remain disabled.
