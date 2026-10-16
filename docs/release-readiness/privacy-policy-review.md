# Privacy: редакция для выпуска без необязательной аналитики

Полный английский текст подготовлен в `privacy/index.html`; Cookie Policy согласована с отключённой аналитикой. Это редакция в PR, не опубликованный юридический документ и не заключение о соответствии всем применимым законам.

## Что изменено фактически

- Убрана ручная загрузка Web Analytics beacon.
- Клиентский сборщик событий не отправляет запросов при выключенном флаге, включая клики прямых affiliate-ссылок.
- На сервере требуется явный INTERACTIONS_ENABLED=true в дополнение к bindings; в конфигурации false.
- API-фото выключены и в Worker-конфигурации, и в клиентской сборке.
- Buy Me a Coffee сохранён обычной ссылкой на тот же адрес, вместо предварительно загружаемого стороннего скрипта. YouTube уже был обычной ссылкой.

## Подтвердить владельцу до юридического sign-off

1. Полное публичное юридическое имя оператора/наименование бизнеса и необходимые контактные реквизиты. 16 октября владелец подтвердил публичное имя Dan Greenberg, страну Israel и адрес mygreece@greecebydan.com. Имя внесено в проект политики. Почтовая цепочка подтверждена: Cloudflare Email Routing → обычный бесплатный Gmail (Google consumer account, не Workspace). Владелец сообщил, что обращений через сайт ещё не было. Почтовый адрес для корреспонденции и применимость EU-представителя не установлены.
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

## Будущая переписка — правило утверждено владельцем 16 октября 2026

Владелец сообщил, что обращений ещё не было, и утвердил следующее правило для
будущей переписки с регулярной ручной проверкой Gmail. Это выбранный оператором
срок, не универсальный установленный законом срок. Текст внесён в проект Privacy:

> We delete routine enquiry correspondence from our active mailbox no later than
> 12 months after the last substantive exchange, and sooner when it is no longer
> needed. We may retain relevant correspondence for longer when necessary to
> comply with a legal obligation or establish, exercise or defend a legal claim;
> we restrict its use to that purpose and review the need to retain it. Deleted
> Gmail messages may remain in Trash for up to 30 days unless Trash is emptied
> sooner. Google's recovery and backup retention is governed by its own policies.

Владелец согласился регулярно проверять и вручную удалять ненужную переписку
(inbox/sent/archive и вложения), соблюдая указанный предел. Автоматизация
удаления не настроена и не обещается. Перед будущим внедрением автоматизации
проверить, что она не удаляет переписку с законным основанием для продления хранения.

Источники для подтверждённых уточнений: [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
[Cloudflare Email Routing](https://www.cloudflare.com/developer-platform/products/email-routing/),
[Google privacy](https://policies.google.com/privacy),
[Gmail deletion and Trash](https://support.google.com/mail/answer/7401),
[Google retention](https://policies.google.com/technologies/retention).

Подтверждение названий провайдеров не подтверждает автоматически наличие DPA,
Google Workspace, конкретную страну обработки или применимость SCC/DPF к
этому аккаунту. Эти факты не подставлялись в публичный текст как установленные.

## Технические журналы: подтверждение владельца 16 октября

- На запрошенном экране travel API Worker → Settings → Observability владелец
  показал Logs ON, Include Invocation logs ON и Persist logs to the Workers
  dashboard ON (выбрана вкладка Production). Название Worker в обрезанном
  скриншоте не видно; контекст — выполненная владельцем инструкция.
- Владелец подтвердил именно Workers Free. По официальной документации,
  проверенной 16 октября, Workers Logs в dashboard на этом плане хранятся три
  дня. Это не срок для всех данных Cloudflare/GitHub и не доказательство
  отсутствия стороннего экспорта. Содержимое журналов, exports и полный
  account configuration не проверялись и не запрашивались в чат.
- Длительность и включённые invocation logs раскрыты в проекте Privacy отдельно
  от выключенных optional interaction events / Web Analytics.
- В исходнике PR нет console logging тела запроса, ключа Viator или профиля
  посетителя; внешние ошибки возвращаются обезличенно. Platform invocation
  metadata этим не отменяется. Снимок dashboard важнее предположения, что
  отсутствие observability в локальном wrangler доказывает remote OFF.
- Настройки production не менялись. Публичный текст не обещает отсутствие всех
  инфраструктурных журналов, хранение только в ЕС/Израиле или стирание всех
  provider backups через три дня.

Источник: [Cloudflare Workers Logs, Invocation Logs / Pricing](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

## Что ещё не установлено юридически

Подтверждённый consumer Gmail нельзя выдавать за Google Workspace с Workspace
CDPA. [Google CDPA](https://cloud.google.com/terms/data-processing-addendum)
и [Workspace compliance documentation](https://knowledge.workspace.google.com/admin/compliance/privacy-compliance-and-records-for-google-workspace-and-cloud-identity)
описывают соответствующие договорные сервисы, а не автоматически этот бесплатный
аккаунт. [Cloudflare customer DPA](https://www.cloudflare.com/cloudflare-customer-dpa/)
применяется при выполнении указанных в нём условий. Публичная страница провайдера
не устанавливает сама по себе правовую роль и договорную ситуацию этого сайта.

Оставшийся вопрос для адресной правовой оценки: какие требования к обработчику,
международным передачам и реквизитам действительно применимы к данной деятельности
из Израиля, и соответствует ли им текущая цепочка Cloudflare/GitHub/consumer Gmail.
Если договор с обработчиком необходим, проверить покрытие фактически выбранного
сервиса; при отсутствии подходящего договора выбрать соответствующий почтовый
сервис и повторить проверку. Не объявлять бесплатный Gmail автоматически
незаконным и не утверждать, что платный тариф сам по себе решает все требования.

Операционные факты (имя, почта, отсутствие прежних обращений, утверждённое
ручное удаление переписки, dashboard log retention и hard-off staging) теперь
описаны. Полное юридическое соответствие этими фактами не подтверждено. Отдельные
consent UI и лицензирование API-фото остаются вне выпуска, пока функции OFF.
