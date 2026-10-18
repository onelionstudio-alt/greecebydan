# Real Food staging verification — 18 October 2026

Reviewed source: 6df3a2c5e5200573b338e0e503a29e149435e68c.
Workflow https://github.com/onelionstudio-alt/greecebydan/actions/runs/39115674529; artifact 12132805069.
**PASS with inventory limits**. Raw collection remains COLLECTED_REQUIRES_INVENTORY_REVIEW; the separate live-review.json records the completed inventory review. No production release.

11 real UI/API cases, all HTTP200. Chromium 390/1440 and WebKit390; 320/768 were covered by recorded browser regression, not this live run. Zero axe violations/overflow, keyboard details and comparison focus passed. Actual 2-item comparison on Naxos and 3-item comparison for Athens tastings. Exact returned affiliate hrefs preserved; unknown-unit starting amounts were not compared. Source/API/assets matched; legacy photos/events disabled, supplier covers enabled. No normal events or new photo/review/booking calls. Physical iOS/Android unavailable.

| Scope | Products returned | Evidence | Remaining limitations |
|---|---|---|---|
|Athens food walk|101933P4|Explicit inclusions|Limited first-page/twelve-detail window; no padding or availability promise|
|Athens food tastings|417834P1, 26368P30, 388033P1|Explicit inclusions|Limited first-page/twelve-detail window; no padding or availability promise|
|Naxos cooking|9238P50, 5649732P3|ACTIVITY description / explicit cooking inclusion|Limited first-page/twelve-detail window; no padding or availability promise|
|Crete cooking|364301P5|ACTIVITY description|Limited first-page/twelve-detail window; no padding or availability promise|

| Product | Returned title | Common GUIDE language codes | Group / pickup metadata |
|---|---|---|---|
|101933P4|Classic Athens Food Tour with Local Drink & Market Visit|en|shared / meeting_point|
|9238P50|Walking Tour and Cooking Class on Naxos with Local Market Visit|el, en, ru|shared / option_dependent|
|5649732P3|Estate Cooking Class and Farm to Table Lunch Ktima Korres Yastra|el, en|shared / meeting_point|
|417834P1|The Greek Food Experience (Max 8 persons)|el, en|shared / meeting_point|
|26368P30|Private Athens Morning Food Tour (15+ tastings) - Best Seller|en|private / meeting_point|
|388033P1|Private Walking Tour in Athens City Center with Food|de, el, en, es|private / meeting_point|
|364301P5|Cretan Flavors - Cooking Lessons and Wine Olive Oil Tasting|en|shared / pickup_listed|

Languages are supplier human-guide metadata common across inspected options; not a promise of included instruction. Group maxima and pickup remain supplier statements to confirm for the selected option. Ingredients/drinks, allergies/dietary accommodation, exact walking distance, meeting details and cancellation deadlines are not independently confirmed. STANDARD policy is not an option-specific cancellation deadline. ACTIVE/search results are not date/seat availability.

Manual Crete CTA opened the exact tracked 364301P5 URL; landing H1 and product code match. No availability or booking button was used. No public-page photos extracted or reused. See evidence/manual-live.json.

Boat regression: 345728P2, 32830P5, 32830P4. Wine: 44792P8, 396495P4, 21559P6. Culture: 240841P1, 240841P3, 341709P1. Existing disclosure, price rules and supplier covers retained.

Next: separate Transfers branch/PR, based on verified Food changes and independently reviewable. Both releases still require owner approval.
