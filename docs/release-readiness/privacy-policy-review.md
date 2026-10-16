# Privacy: редакция для выпуска без необязательной аналитики

Полный английский текст подготовлен в `privacy/index.html`; Cookie Policy согласована с отключённой аналитикой. Это редакция в PR, не опубликованный юридический документ и не заключение о соответствии всем применимым законам.

## Что изменено фактически

- Убрана ручная загрузка Web Analytics beacon.
- Клиентский сборщик событий не отправляет запросов при выключенном флаге, включая клики прямых affiliate-ссылок.
- На сервере требуется явный INTERACTIONS_ENABLED=true в дополнение к bindings; в конфигурации false.
- API-фото выключены и в Worker-конфигурации, и в клиентской сборке.
- Buy Me a Coffee сохранён обычной ссылкой на тот же адрес, вместо предварительно загружаемого стороннего скрипта. YouTube уже был обычной ссылкой.

## Подтвердить владельцу до юридического sign-off

1. Полное публичное юридическое имя оператора/наименование бизнеса и необходимые контактные реквизиты. 16 октября владелец подтвердил публичное имя Dan Greenberg, страну Israel и адрес mygreece@greecebydan.com. Имя внесено в проект политики. Почтовая цепочка подтверждена: Cloudflare Email Routing → Gmail (Google). Владелец сообщил, что обращений через сайт ещё не было. Почтовый адрес для корреспонденции и применимость EU-представителя не установлены.
2. Применимость израильских, EEA/UK и иных норм к фактической деятельности и аудитории; необходимость представителя, если применимо.
3. Принятые условия обработки с GitHub/Cloudflare/почтовым провайдером, места обработки, применимые transfer safeguards и сроки security/email logs. Доступа к договорам и настройкам аккаунтов нет. Цифры retention не выдумывались; в тексте указаны критерии и известные TTL кешей.
4. Документировать оценку legitimate interests для необходимой доставки/защиты/ответов, если это применимый правовой базис. Слово «анонимно» не используется как основание игнорировать IP и инфраструктурные журналы.
5. Проверка Web Analytics выполнена с владельцем: список показывает JS Snippet installation, Manage site — Install JS Snippet. В показанной конфигурации автоматическая установка не обнаружена. Network staging после Milos и Wine не показывает /events (только загрузку events.js), cloudflareinsights или tacdn; отдельный POST {} к /events возвращает 503 Events disabled. Production не менялся; после отдельно разрешённого выпуска повторить Network на основном домене.

Эти сведения нельзя подтвердить кодом; поэтому финальный юридический sign-off пока BLOCKED. Текст подготовлен для проверки, но его нельзя выдавать за подтверждённое полное соответствие.

## Перед будущим включением optional analytics

До первого запроса: раскрыть цель/провайдера/поля/retention/transfers, предоставить свободный информированный granular opt-in, равнодоступный отказ, отзыв и подтверждение выбора. Не включать по продолжению просмотра или по одному backend binding. Согласие не отменяет обязанности минимизации и правового основания. Наличие exemptions оценивать отдельно по реальному механизму и применимому праву; отсутствие cookies не гарантирует exemption. Consent UI и хранение доказательства согласия в этой итерации не реализованы: функция остаётся выключенной.

Ожидаемый Analytics Engine хранит точки три месяца по публичной документации, но dataset не включался; этот срок не представлен как активное хранение на сайте.

## Первичные источники (проверены 16 октября 2026)

- [EDPB consent guidelines 05/2020](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en): свободный, конкретный, информированный выбор и отзыв.
- [EDPB technical scope 2/2023](https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en): охват шире cookies, оценка exemptions по ситуации.
- [Cloudflare Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/): manual vs automatic insertion.
- [Analytics Engine retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/): три месяца при включении dataset.

## Scope of the remaining launch gate (analytics OFF)

The deferred Safety/Liability framework and a future analytics consent UI are not
prerequisites for this narrow release while optional collection is demonstrably
off. A generic lawyer approval of every possible jurisdiction is not asserted
as a universal legal requirement. The unresolved factual gate is the operator's
identity/contact details and the actual infrastructure/email processing
arrangements: confirm providers, retention criteria, processing locations and
applicable safeguards, then align the public notice. Assess territorial scope
and any representative requirement for this actual operation, rather than
inventing a representative or assuming every EU visitor triggers one.

For the off release, verify both ordinary browser traffic and dashboard automatic
RUM injection; a disabled event endpoint alone cannot prove no requests. Optional
analytics consent, API-image licence approval and analytics retention setup may
wait until those features are proposed for activation. They must remain off.

Primary references rechecked 16 October: [EDPB legal grounds/transparency](https://www.edpb.europa.eu/sme/be-compliant/process-personal-data-lawfully_en),
[GDPR Articles 3, 13, 27 and 44](https://eur-lex.europa.eu/eli/reg/2016/679/oj),
[Cloudflare automatic beacon injection](https://developers.cloudflare.com/web-analytics/get-started/).

## Предложение по будущей переписке — НЕ УТВЕРЖДЕНО

Обращений пока не было; действующее правило удаления и автоматизация не
подтверждены. Следующий текст — конкретное предложение для утверждения владельцем,
а не описание уже работающего удаления и не установленный законом срок:

> We delete routine enquiry correspondence from our active mailbox no later than
> 12 months after the last substantive exchange, and sooner when it is no longer
> needed. We may retain relevant correspondence for longer when necessary to
> comply with a legal obligation or establish, exercise or defend a legal claim;
> we restrict its use to that purpose and review the need to retain it. Deleted
> Gmail messages may remain in Trash for up to 30 days unless Trash is emptied
> sooner. Google's recovery and backup retention is governed by its own policies.

Если владелец утвердит правило, перенести в публичный проект Privacy и договориться
о реальном регулярном удалении inbox/sent/archive/attachments; не обещать
автоматизацию без её настройки. Нельзя считать этот вопрос закрытым одним
отсутствием входящих сообщений.

Источники для подтверждённых уточнений: [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
[Cloudflare Email Routing](https://www.cloudflare.com/developer-platform/products/email-routing/),
[Google privacy](https://policies.google.com/privacy),
[Gmail deletion and Trash](https://support.google.com/mail/answer/7401),
[Google retention](https://policies.google.com/technologies/retention).

Подтверждение названий провайдеров не подтверждает автоматически наличие DPA,
Google Workspace, конкретную страну обработки или применимость SCC/DPF к
этому аккаунту. Эти факты не подставлялись в публичный текст как установленные.
