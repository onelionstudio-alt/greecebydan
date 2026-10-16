# Редакционная правка — ожидает согласования

Никакие файлы в `content/stories` в этой ветке не изменены.

1. Вернуть `milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose.json` к первой опубликованной версии `72e29b5`. Полное предлагаемое содержание: [milos-proposed.json](milos-proposed.json).
2. Сохранить текущую статью о фете без изменения текста и партнёрских ссылок как `content/stories/greek-feta-sheeps-milk-wooden-barrels-and-a-taste-of-place.json`. Полная копия: [feta-proposed.json](feta-proposed.json).
3. Сохранить прежний URL Милоса, без redirect. Новый материал о фете получит собственные canonical и sitemap entry при штатной сборке.
4. После согласования добавить восстановленную статью в существующий профиль `boat-milos` в `assets/data/advisor-contexts.json`. Сейчас её там намеренно нет, чтобы не показывать лодочный CTA под фетой.

Исходная обложка `_-.png` существует и совпадает по SHA-256 с версией создания лодочной статьи. Нынешняя обложка феты — отдельный `greek-feta-barrels.png`. Изображения не потребуется заменять или перезаписывать.

## Что требует редакционной проверки перед восстановлением

Это восстановление исторической публикации, а не новая проверка её туристических фактов. В старом тексте есть ссылки на поиск Viator вместо двух точных продуктов. У третьего предложения название и affiliate URL указывают ELDORIS / `349808P1`, а источник ниже — Milos VIP Services / `272308P1`. Обозначить эти два продукта одним туром нельзя. Не исправлено догадкой. До публикации нужно подтвердить, какой продукт имелся в виду, и сверить актуальные условия; либо согласовать исключение этого конкретного сравнения.

## Предлагаемое дополнение Privacy перед включением событий

“Greece by Dan also measures aggregate interactions with its travel helpers, including searches, result views and outbound affiliate clicks. These events contain an event type, a broad article category, placement, experience type and, for a result click, a product code. They do not contain names, email addresses, free-text requests, health information or persistent visitor identifiers. No cookies or local storage are used for these events. Cloudflare processes technical request data for operation and abuse prevention. Do Not Track and Global Privacy Control signals disable this event collection.”

Приёмник по умолчанию не активирован: новые bindings и privacy amendment должны быть согласованы до включения. Отправка событий не блокирует поиск или партнёрский переход.
