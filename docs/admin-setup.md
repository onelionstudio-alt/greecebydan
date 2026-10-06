# Админка Greece by Dan

Готовая схема: GitHub Pages + Decap CMS + GitHub OAuth + Cloudflare Worker.
Сайт остаётся статическим. Вход работает только для `onelionstudio-alt` с правом записи в `onelionstudio-alt/greecebydan`.
Код админки и сборки готов; для запуска нужны настройки аккаунтов ниже. До подключения `/admin/` показывает понятный статус настройки.

## 1. Создать Worker

1. Открой https://dash.cloudflare.com/ и войди в свой аккаунт.
2. Workers & Pages → Create application → Create Worker (или Start with Hello World).
3. Назови Worker **greecebydan-oauth**. Выбери бесплатный тариф Workers Free.
4. Создай и разверни Worker. Сохрани выданный адрес вида `https://greecebydan-oauth.ТВОЙ-ПОДДОМЕН.workers.dev`.
5. В Edit code замени стартовый код полным содержимым [`oauth-worker/worker.mjs`](../oauth-worker/worker.mjs). Это ES module с `export default`, не Service Worker.
6. Нажми Deploy. Пока переменные не настроены, `/health` вернёт `{"ready":false}` — это нормально.

Адрес Worker не секрет. Client Secret — секрет; его вводят непосредственно в Cloudflare, его не нужно присылать в чат или сохранять в GitHub.

## 2. Создать GitHub OAuth App

Открой https://github.com/settings/applications/new под аккаунтом **onelionstudio-alt**:

- Application name: `Greece by Dan CMS`
- Homepage URL: `https://greecebydan.com`
- Authorization callback URL: **адрес твоего Worker + `/callback`**. Пример формы адреса: `https://greecebydan-oauth.ТВОЙ-ПОДДОМЕН.workers.dev/callback`.

Нажми Register application. Скопируй Client ID. Нажми Generate a new client secret и скопируй секрет непосредственно в Cloudflare в следующем шаге.

Вход запрашивает `public_repo`: Decap нужен доступ к записи в публичный репозиторий. GitHub OAuth выдаёт этот scope для публичных репозиториев аккаунта, а не для одного репозитория; Worker дополнительно разрешает только твой логин и проверяет право записи в `greecebydan`. Приватный `repo` scope не запрашивается.

## 3. Настроить Worker

Cloudflare → greecebydan-oauth → Settings → Variables and Secrets:

| Имя | Тип | Значение |
| --- | --- | --- |
| `ADMIN_ORIGIN` | Text | `https://greecebydan.com` |
| `ALLOWED_GITHUB_LOGIN` | Text | `onelionstudio-alt` |
| `GITHUB_REPO` | Text | `onelionstudio-alt/greecebydan` |
| `GITHUB_CLIENT_ID` | Text | Client ID из GitHub |
| `GITHUB_CLIENT_SECRET` | Secret | Client Secret из GitHub |

Сохрани и разверни изменения. Снова открой адрес Worker + `/health`: должен появиться `{"ready":true}`. Это проверка наличия настроек, а не подтверждение успешного OAuth; настоящий вход проверяется на последнем шаге.

Если используешь Wrangler вместо веб-интерфейса: файл `oauth-worker/wrangler.jsonc` содержит обычные переменные. Добавь `GITHUB_CLIENT_ID` в `vars`, выполни `wrangler secret put GITHUB_CLIENT_SECRET`, затем `wrangler deploy` из папки `oauth-worker`. Секрет не записывай в JSON, `.env` в репозитории или исходный код.

## 4. Подключить адрес к админке

В `admin/auth.json` запиши реальный адрес Worker, без `/callback`, без пути и без слеша в конце:

```json
{
  "base_url": "https://greecebydan-oauth.ТВОЙ-ПОДДОМЕН.workers.dev"
}
```

Адрес здесь намеренно пустой до создания Worker. Не используй пример как рабочий URL.

## 5. Включить автоматическую сборку

1. Подготовленные изменения находятся в ветке `decap-admin`; проверь pull request и зелёный Build.
2. GitHub → `onelionstudio-alt/greecebydan` → Settings → Pages → Build and deployment → Source: **GitHub Actions**. Не меняй Custom domain `greecebydan.com`.
3. Объедини pull request с `main`. Workflow **Build and publish Greece by Dan** проверит и опубликует `_site`.
4. Если изменения уже объединены, открой Actions → Build and publish Greece by Dan → Run workflow → main.
5. Дождись зелёного Deploy. Проверь главную, `/sikinos/` и `/admin/`.

Переключение Source необходимо: Decap сохраняет JSON, а workflow превращает его в готовые HTML-страницы и публикует через Pages. Сборка не коммитит сгенерированные страницы обратно в репозиторий и не требует персонального токена.

## 6. Проверить реальный вход

1. Открой **https://greecebydan.com/admin/** именно на основном домене.
2. Разреши всплывающее окно и нажми вход через GitHub.
3. Войди как `onelionstudio-alt` и разреши созданное приложение.
4. Открой Stories → Sikinos. Проверь текст, описание, поля YouTube и ссылок.
5. Для пробной статьи оставь **Published выключенным** и сохрани: она будет в редакторе, но не появится на сайте.
6. Включи Published, нажми публикацию, дождись зелёного workflow (обычно несколько минут). Статья появится в Discover и по адресу `/<slug>/`.
7. Выключи Published и опубликуй изменение: страница и карточка исчезнут при следующей сборке.

Stories по умолчанию создаются с Published выключенным. Переставлять карточки можно полем «Порядок в Discover»: меньшее число — раньше. Существующий адрес статьи лучше сохранять, чтобы не ломать внешние ссылки.

## Ежедневная работа

- **Stories**: статьи, фотографии, подписи, YouTube, индивидуальные партнёрские ссылки. Название файла/URL создаётся из заголовка латиницей, например Milos → `/milos/`.
- **Links**: общие карточки Tours / Flights / Stays. Если URL пустой, карточка остаётся текстовой; если «Показывать карточку» выключено, она скрыта. Статьи без индивидуальных ссылок используют общие активные ссылки.
- **Settings**: заголовки главной, манифест, описание для поиска, уведомление о комиссии, About, слоган и подпись внизу.

Public site содержит только готовые страницы, картинки и публичные файлы админки. Исходный контент хранится в **публичном GitHub-репозитории**: Published выключено скрывает статью с сайта, но не делает исходный файл приватным. Не сохраняй в контенте личные данные или секреты.

## Если что-то не работает

- «Редактор подготовлен»: `admin/auth.json` ещё не содержит реальный адрес Worker.
- Worker `ready:false`: отсутствует одна из пяти настроек.
- Worker `ready:true`, но вход не проходит: проверь Client ID, Client Secret и точное совпадение callback URL в GitHub с адресом Worker + `/callback`; используй логин `onelionstudio-alt`.
- Вход работает, сайт не обновился: проверь Source = GitHub Actions, branch `main`, вкладку Actions и состояние Published.
- Ошибка сборки: ссылки должны начинаться с `https://`; YouTube URL должен указывать на YouTube; зарезервированные имена страниц (about, admin, privacy и т. п.) нельзя использовать для статей.

## Локальная проверка

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
node --test oauth-worker/worker.test.mjs
python scripts/build.py
python -m http.server 8000 --directory _site
```

Настоящий вход и сохранение через Decap требуют внешних настроек GitHub/Cloudflare. Локальные проверки используют поддельный OAuth endpoint, чтобы проверять CSRF, PKCE, ограничения логина, право записи, передачу token только правильному окну и публикацию/удаление страниц без доступа к реальным секретам.
