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

Before/after screenshots are labelled **fixtures**, not live offers. Real remote results, if available, are separate. Exact results, evidence and remaining deployment dependency are recorded below. Do not merge until separate owner approval.


## Итог проверки для PR #23

Проверенный runtime: `611601ef2eb30d221fac94aaa78c5a1f44d19696`. Последующая правка тестового screenshot framing не меняет frontend, Worker или staging bundle.

| Проверка | Результат |
|---|---|
| Python publishing/staging tests, Node Worker/OAuth, сборка 13 статей, прежний browser smoke | PASS — [regression run](https://github.com/onelionstudio-alt/greecebydan/actions/runs/38941073326) |
| Chromium и WebKit, 320/390/768/1440px; keyboard disclosure/selection, focus return, старый DTO, неизвестные поля, ошибки, точные affiliate href | PASS — [implementation QA](https://github.com/onelionstudio-alt/greecebydan/actions/runs/38941065109) |
| Axe WCAG A/AA, карточки на 390/1440 и сравнение на 390px | PASS для автоматических правил в проверенных состояниях; не полная сертификация доступности |
| Новый frontend → существующий удалённый staging API → реальные Boat/Wine карточки и сравнение | PASS с явно описанным asset overlay; не развёртывание нового Worker |
| API photos / events / сторонние запросы в проверенных сценариях | PASS: отсутствуют |
| Новый frontend + новый Worker вместе развёрнуты в удалённом staging | BLOCKED: нет deploy-доступа Cloudflare; требуется загрузка владельцем файла ниже и последующий smoke |
| Физические iOS/Android, VoiceOver/TalkBack | Недоступны; WebKit/Chromium viewport-тесты не заменяют устройства |
| Production deployment | Не выполнялся; deploy job SKIPPED, main не изменён |

### Готовый staging-файл

[staging-pr23-611601ef.mjs](staging-pr23-611601ef.mjs) — **единственный актуальный файл**, прежний `staging-preview.generated.mjs` для этого PR больше не использовать.

После проверки тестов загрузить только в Cloudflare Worker **greecebydan-travel-api-staging** через Edit code → Deploy. Существующие staging secrets/bindings сохранить. Production Worker `greecebydan-travel-api` не выбирать. Никаких ключей в чат или исходники.

Для проверки после загрузки открыть `https://greecebydan-travel-api-staging.onelion-studio.workers.dev/_preview/meta` и передать только публичный JSON:

- `purpose`: PR #23 isolated staging preview, not a production release
- `sourceCommit`: `611601ef2eb30d221fac94aaa78c5a1f44d19696`
- `apiSourceSha256`: `af38f06c0b3ffd365498be8d247b9ed4fd28f5b6a59845d7883163ceed051788`
- `apiPhotos=false`, `interactionEvents=false`
- SHA256 всего module: `6c22eff0880383297d79496d6df57aced0b946cecc4ad236e3d6734980dfd214`

Далее пройти обе статьи → context → реальная выдача → 2/3 сравнение → партнёрская ссылка без покупки. Проверить metadata, evidence-backed reasons нового Worker, unknown price basis, отсутствие изображений и аналитических запросов. Только после этого можно считать **полный deployed staging** завершённым. Разрешение на публикацию production всё равно требуется отдельно.

### Скриншоты

- С одинаковыми UI fixtures: [mobile до](evidence/before-390-fixture.png) / [после](evidence/after-390-fixture.png), [desktop до](evidence/before-1440-fixture.png) / [после](evidence/after-1440-fixture.png).
- Сравнение: [mobile](evidence/comparison-390-fixture.png), [desktop](evidence/comparison-1440-fixture.png).
- **Реальные ответы удалённого API, frontend через asset overlay:** [Milos](evidence/real-staging-boat-390.png), [Santorini](evidence/real-staging-wine-390.png), [Milos comparison](evidence/real-staging-boat-comparison-390.png), [Santorini comparison](evidence/real-staging-wine-comparison-390.png).
- Машиночитаемые результаты: [UI tests](evidence/browser-cards.json), [real staging backend](evidence/staging-live.json).

API карточки не подтверждают наличие мест, окончательную цену или условия конкретной опции. В live overlay со старым Worker причины намеренно скрыты, пока нет нового selectionEvidence. Свободный legacy reason не превращается в доказательство.

Latest screenshot framing and live-backend comparison: [QA run 39022999847](https://github.com/onelionstudio-alt/greecebydan/actions/runs/39022999847) PASS. Runtime files are byte-identical to verified commit 611601ef; later changes only affect screenshot tests and review artifacts. [Local bundle checks](evidence/staging-package.json) distinguish local hard-off verification from a remote deployment.
