# Experience Card 3.0 — implementation review

Separate implementation branch from main aa00b1d. PR #22 remains design documentation. No merge, production deployment, new categories, maps, My Trip, API-photo activation or event activation is authorized by this PR.

## Changes

- Text-first cards: title, validated rating/count, duration, departure unknown, indicative price/unit, CTA. No empty photo slot. More conditions and source evidence in native details.
- Select 2–3 returned products, compare only differing fields known for every selection. Identical fields collapse once. Missing fields and pricing with unknown/mixed units or currency stay outside the difference rows. No price winner or safety/suitability claim.
- Reasons require additive `selectionEvidence`: source, field, bounded exact matched phrase/flag and an allowlisted rule. Legacy free-text `reason` is not rendered. Old Worker DTOs still render cards and original affiliate URL; they simply have no reasons. Existing Worker `reason` remains for old clients.
- Worker changes are additive `currency` and `selectionEvidence`; Boat/Wine filtering, sorting, result limit, source productUrl and errors are preserved. No new upstream endpoint or enrichment call. Meeting points remain unknown. Photo/events flags and bindings unchanged.
- No external UI dependencies, localStorage or extra analytics. Comparison clicks create no new events. API content remains runtime.

## Validation layers — do not conflate

1. Existing Python/Node/build/browser regression, including dormant image/event fixture paths.
2. New fixture QA in Chromium + WebKit at 320/390/768/1440, before/after with identical synthetic products, evidence validation, price-unit comparisons, legacy DTO, errors/recovery, safe URLs, focus and axe WCAG AA scans. Viewports are not real iOS/Android devices; axe is not a full accessibility certification.
3. `browser-staging-live.cjs`: new built frontend served by an explicit browser asset overlay at the real staging origin, connected to the **actual deployed staging API**. Two searches maximum, no key/photos/events/purchase. This can confirm real-backend/old-DTO compatibility. It does not prove that the new UI/Worker was deployed remotely. Network/client restrictions are recorded BLOCKED, not passed off as an API outage or hidden by fixtures.
4. Full deployment validation requires owner-authorized deployment of generated module **only** to `greecebydan-travel-api-staging`, metadata/hash check, article→prefill→search→comparison→actual partner URL; confirm flags false, images 0 and no /events/beacon/CDN photo requests. No purchase.

## Staging procedure

Use `scripts/build_staging_preview.py --review-label 'Experience Card implementation' --source-commit FULL_SHA --output docs/experience-card-implementation/staging-preview.generated.mjs` after the build. This only prepares a file. Wrapper is restricted to the exact existing staging hostname, hard-forces optional flags OFF, supplies noindex/no-store, excludes admin and preserves the core Worker behind staging-only SITE replacement. Review its metadata before deploying. Existing secrets/rate-limit bindings stay on staging; do not paste keys into code/chat. Never deploy this bundle to production.

Owner step when generated file is ready: Cloudflare Workers → **greecebydan-travel-api-staging** → Edit code → replace with generated module → Deploy. Do not select `greecebydan-travel-api` (production). Then return only public `/_preview/meta` output or staging URL, with no secrets. The assistant can continue the public browser smoke afterwards. This is an authentication/deployment dependency, not a further approval request for already-authorized staging.

## Comparison with published concierge

| Published main | This implementation |
|---|---|
| Long full-width result cards | Three columns on wide desktop; one compact column below 1001px |
| No shortlist comparison | Select 2–3; show confirmed differing fields only |
| Free-text reason always shown | Only allowlisted source-backed evidence; legacy reason omitted |
| Conditions inline | Essential uncertainty stays near price; details open on request |
| Implicit EUR and unvalidated rating display | Additive explicit currency; defensive legacy adapter and numeric validation |
| API photos/events OFF | Remain OFF; no placeholder or comparison tracking |

Before/after screenshots are labelled **fixtures**, not live offers. Real remote results, if available, are separate. Remaining limitations and exact CI results will be recorded here and in the PR after validation. Do not merge until separate owner approval.
