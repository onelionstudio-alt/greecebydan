# Проверка идентичности публикаций

Исходная main: `3a8e9339e8cb16a964a435587088fc1b78a65d6c`. Проверены URL, заголовки, метаданные и тематическая структура текстов 12 опубликованных JSON. Это проверка предмета публикации, не фактчекинг всех утверждений. Других явных подмен темы не найдено.

| URL | Заголовок | Результат |
| --- | --- | --- |
| `/can-you-visit-meteora-if-you-are-afraid-of-heights/` | Can You Visit Meteora If You Are Afraid of Heights? | Тема URL, заголовка и текста согласуется |
| `/chios-mastiha-the-greek-resin-collected-like-tears/` | Chios Mastiha: The Greek Resin Collected Like Tears | Тема URL, заголовка и текста согласуется |
| `/how-to-taste-santorini-wine-without-driving/` | How to Taste Santorini Wine Without Driving | Тема URL, заголовка и текста согласуется |
| `/milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose/` | Greek Feta: Sheep’s Milk, Wooden Barrels and a Taste of Place | **Несоответствие: фета по URL лодок** |
| `/milos-kleftiko-sailboat-or-speedboat/` | Milos Kleftiko: Sailboat or Speedboat? | Тема URL, заголовка и текста согласуется |
| `/naxos-farm-cooking-class-what-you-actually-do/` | Naxos Farm Cooking Class: What You Actually Do | Тема URL, заголовка и текста согласуется |
| `/private-boat-in-greece-with-a-skipper-or-self-drive/` | Private Boat in Greece: With a Skipper or Self-Drive? | Тема URL, заголовка и текста согласуется |
| `/santorini-s-sweet-wines-sun-volcanic-soil-and-a-forgotten-red/` | Santorini’s Sweet Wines: Sun, Volcanic Soil and a Forgotten Red | Тема URL, заголовка и текста согласуется |
| `/santorini-s-tomato-fritters-why-ntomatokeftedes-taste-different-here/` | Santorini’s Tomato Fritters: Why Ntomatokeftedes Taste Different Here | Тема URL, заголовка и текста согласуется |
| `/sikinos/` | Sikinos | Тема URL, заголовка и текста согласуется |
| `/the-lost-hippodrome-beneath-thessaloniki/` | The Lost Hippodrome Beneath Thessaloniki | Тема URL, заголовка и текста согласуется |
| `/what-is-sparta-actually-like-today/` | What Is Sparta Actually Like Today? | Тема URL, заголовка и текста согласуется |

Первоначальная проверка выявила одну подмену. После согласования Milos/Feta разделены в ветке PR: теперь 13 опубликованных записей. Прежний URL Милоса сохраняется, фета получает самостоятельный адрес. На действующем сайте ошибка сохранится до отдельного разрешения на публикацию. [Проверка исправления](editorial-verification-2026-10-16.md).
