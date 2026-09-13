# E-VALBU completeness-checklist (метод из docs/research/DATA_SOURCES.md, «Layer 3 — Validation»)

Не источник данных. E-VALBU (grammis, IDS Mannheim) — «all rights reserved», импортировать
из него ничего нельзя (глоссы, падежи, коррелят, примеры). Единственное легитимное
использование, задокументированное в `docs/research/DATA_SOURCES.md`: список лемм с
Kprp-комплементом как **чек-лист полноты** — «any of those 451 verbs absent from your dataset
is a known gap». Ниже — именно список лемм, ничего больше.

## Метод

Форма `https://grammis.ids-mannheim.de/verbvalenz` на вид требует интерактивности
(чекбоксы, radio), но при отправке уходит как обычный GET:

```
https://grammis.ids-mannheim.de/verbs/search?komplemente=&komplemente%5B%5D=praep&satzbauplan=0&passiv=0&pertinenz=0&idiomatik=0&suchtabelle=&suchtabelle=lesart
```

(`komplemente[]=praep` + `suchtabelle=lesart` = «Suche nach Verb-Lesarten» с фильтром Kprp).
Один запрос вернул все 1100 «Lesarten» (значений) на одной странице без пагинации — этого
не нашли предыдущие попытки через `WebFetch`, потому что query-строку форма генерирует
только при реальном клике по чекбоксам, а не выводима из голого HTML формы.

`raw_readings.txt` в этой папке — сырой результат (1100 строк «лемма + номер значения»,
например `abgeben 6`). Дедупликация по базовой лемме (без номера значения, без `, sich`)
даёт 399 уникальных глаголов с хотя бы одним Kprp-значением — близко к «451 lemmas» из
исходного отчёта (расхождение ожидаемо: другой снимок базы, другой метод схлопывания
вариантов `I`/`II`).

## Пересечение с датасетом (на момент проверки: 458 лемм всех pos, 550 связок)

- **136 уже есть в датасете** (под тем или иным управлением).
- **239 лемм не встречаются в датасете и не упоминаются в истории куррации PLAN.md** —
  т.е. ещё ни разу не проверялись, не отклонялись:

```
abfahren, abgeben, ableiten, abmachen, abmelden, abnehmen, abschließen, abtrocknen, abzielen,
amüsieren, analysieren, anbieten, angehen, anmachen, anmelden, annehmen, anrufen, ansehen,
anstrengen, auffordern, aufheben, aufmachen, aufräumen, aufstehen, aufwachen, ausmachen,
auspacken, ausreichen, ausruhen, ausschließen, aussteigen, ausstellen, aussuchen, ausziehen,
baden, beantragen, bedeuten, bedienen, beeilen, beeinflussen, befassen, befinden, behindern,
bekommen, beleidigen, bemerken, beobachten, beraten, beschließen, beschreiben, besorgen,
bestellen, bestimmen, bestrafen, bestätigen, beten, betrügen, bewegen, bezeichnen, bieten,
bilden, bluten, brechen, bremsen, brennen, buchen, bürsten, da sein, differenzieren, ehren,
einbeziehen, einkaufen, einpacken, einrichten, einschalten, einschließen, einstellen,
einzahlen, empfehlen, enden, entdecken, entlassen, entsprechen, entstehen, enttäuschen,
entwickeln, erfahren, erfüllen, erhalten, erhöhen, erklären, ernähren, erreichen, erschrecken,
erwarten, erziehen, eröffnen, erörtern, existieren, fliegen, fließen, fordern, fressen,
frieren, frisieren, frühstücken, fußen, fühlen, geben, gelingen, gewinnen, gliedern, grüßen,
heißen, herstellen, hindern, holen, kaufen, kennen lernen/kennenlernen, klingeln, kochen,
kosten, kriegen, kämmen, laufen, leihen, lernen, lesen, liefern, loben, lohnen, losfahren,
lächeln, lösen, markieren, meinen, messen, mieten, mitfahren, nachschlagen, nennen, operieren,
ordnen, packen, passieren, planen, probieren, produzieren, prüfen, putzen, raten, regeln,
regieren, reinigen, reisen, reservieren, resultieren, retten, sagen, sammeln, sauber machen,
schalten, scheiden, schicken, schieben, schlagen, schließen, schlussfolgern, schneiden,
schreien, schweigen, schwimmen, sichern, sinken, sitzen, sparen, springen, starten, stecken,
streiken, studieren, stören, teilen, trainieren, trennen, trinken, turnen, umsteigen,
umtauschen, unterrichten, unterscheiden, unterschreiben, unterstützen, untersuchen,
verabreden, verbinden, verbringen, verhalten, verkaufen, verlangen, verletzen, verlieren,
vermieten, vermuten, versichern, versuchen, verteilen, vertreten, verwechseln, verwenden,
verwickeln, verändern, vorhaben, vorkommen, vorschlagen, vorstellen, wachsen, wechseln,
wecken, wehtun, weinen, werfen, winken, wählen, wünschen, zeichnen, ziehen, zuhören, zumachen,
zunehmen, zurückfahren, zusammenfassen, zusammenkommen, zusammenlegen, zuschauen, ändern,
öffnen, überholen, übernehmen, überraschen, überreden, überweisen
```

## Важно: это не проверенные кандидаты

E-VALBU говорит только «у этой леммы ЕСТЬ хотя бы одно значение с Kprp» — не какое
именно, не какой предлог, не какой падеж. Это может быть 7-е из 9 значений, второстепенное.
Каждая запись из списка выше нуждается в полной независимой проверке (Duden +
en/de.wiktionary), как любой другой кандидат в этом проекте — список даёт только
направление поиска, не сами данные.

Несколько лемм несут тот же риск многозначности, что `gehen`/`haben`/`machen` (партия 19):
`geben`, `bekommen`, `kriegen` — при проверке применять ту же дисциплину (добавлять только
чётко очерченные, лексикализованные значения с обязательным `senseNote`, не форсировать
единую запись на многозначный глагол).
