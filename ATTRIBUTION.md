# Attribution

The worauf dataset is licensed **CC BY-SA 4.0** ([`LICENSE-DATA`](LICENSE-DATA)). Application code
is **MIT** ([`LICENSE`](LICENSE)). This file records where the data came from, which the dataset
licence requires and which the project would want to record anyway: every pattern in
`data/de/*.yaml` carries a `sources` field, and this document says what each of those values means.

Counts below are measured from the compiled dataset, not estimated: **721 patterns across 593
words** at the time of writing.

---

## Sources actually used

| `sources` value | What it is | Patterns citing it | Licence |
|---|---|---|---|
| `duden` | [Duden](https://www.duden.de) online dictionary — consulted per entry in a browser | 518 | All rights reserved (see below) |
| `en.wiktionary` | [English Wiktionary](https://en.wiktionary.org), German entries | 315 | CC BY-SA 4.0 |
| `prototype` | This project's own earlier hand-written dataset | 118 | This project |
| `seed` | This project's own hand-written starter records | 85 | This project |
| `de.wiktionary` | [German Wiktionary](https://de.wiktionary.org) | 15 | CC BY-SA 4.0 |

Patterns carry one or more of these, so the column sums to more than 721.

### Wiktionary — `en.wiktionary`, `de.wiktionary`

Both editions are **CC BY-SA 4.0** (dual-licensed with GFDL), and the share-alike term is the
reason this dataset is CC BY-SA 4.0 rather than something more permissive. It is not negotiable
and not a preference.

Any entry can be reached directly by lemma:

- `https://en.wiktionary.org/wiki/<lemma>#German` — e.g.
  [`warten`](https://en.wiktionary.org/wiki/warten#German)
- `https://de.wiktionary.org/wiki/<lemma>` — e.g.
  [`warten`](https://de.wiktionary.org/wiki/warten)

Page histories on those URLs are the author lists; CC BY-SA attribution to the contributing
community is satisfied by crediting the projects and linking the entries, which is what the
licence's own reuse guidance provides for.

The English Wiktionary was read through the **kaikki.org / wiktextract** extraction rather than by
scraping, because it exposes preposition and case as a structured field (`{{+obj|de|:auf(acc)}}` →
`senses[].info_templates[].args["2"]`). Please cite the tool if you use it:

> Tatu Ylönen (2022). *wiktextract: Wiktionary as Machine-Readable Structured Data.*
> Proceedings of the 13th Conference on Language Resources and Evaluation (LREC), pp. 1317–1325,
> Marseille, 20–25 June 2022. <https://aclanthology.org/2022.lrec-1.140/>

The German Wiktionary's `Prä=` / `Kas=` fields do not survive that extraction, so those 15 patterns
were read from raw wikitext.

### Duden — the largest source, and the one that needs explaining

**518 of 721 patterns cite Duden**, which makes it the single most-used source in this dataset — more
than either Wiktionary edition. It was used the way a dictionary is used: each candidate pattern's
Duden entry was opened and read, the preposition and case were taken from the entry's own numbered
senses, and a usage example was recorded from the entry.

**Duden is all rights reserved.** It is not an open source, and this dataset does not redistribute
Duden's text as text. What was taken from it:

- **The government facts** — which preposition a word takes and in which case. These are facts about
  German, not authored expression, and facts are not protected by copyright.
- **Example sentences** — short usage illustrations, taken from or modeled closely on the examples
  on those entries.

What was **not** taken: Duden's definitions. Every gloss, sense note and translation in this dataset
was written for this project, in English and Russian.

The example sentences are the part that is a judgement call rather than a settled question, and the
project's reasoning and the risk it accepts are written out in
[`docs/research/DATA_SOURCES.md`](docs/research/DATA_SOURCES.md) under "Duden — the source the plan
did not have". Read that before redistributing this dataset, because the CC BY-SA 4.0 licence on
the dataset is the project's grant over its own contribution and cannot grant rights in third-party
material it does not hold.

If you are Duden and object to this use, please open an issue — the fallback (re-sourcing examples
from Tatoeba, CC BY) is already identified and is a work item, not a redesign.

### `prototype` and `seed` — this project's own data

These two values are not external sources at all, and a reader comparing them against the source
table above would otherwise be looking for a dictionary that does not exist.

- **`seed`** — records written by hand when the dataset was started.
- **`prototype`** — records imported from this project's own earlier prototype dataset (196
  patterns, of which 118 were new at import). German and Russian came from the prototype; the
  English glosses and example translations were written during the import, because the prototype
  had none.

Together they are **203 patterns**, and they carry an honest caveat: **none of them has been
verified against an external dictionary.** That check was scheduled for the dataset-growth phase
and the growth work went to new patterns instead. They are the project's own assertions about
German, held to the same schema and the same invariants as everything else, but not corroborated.

---

## Planned but never used

`docs/research/DATA_SOURCES.md` plans two sources that the dataset **does not** contain and which
are therefore **not** credited here. Named only so that a reader who finds them in the plan does not
assume they were used:

- **Tatoeba** (CC BY 2.0 FR) was the intended source of example sentences, with sentence IDs
  retained for attribution. This was never executed; examples came from Duden instead. It remains
  the identified fallback.
- **UD_German-HDT** (CC BY-SA 4.0) was intended for frequency ranking, to order learning and
  replace the CEFR scale. Never executed; no corpus counts are in the dataset.

If either is ever used, it must be added here, and Tatoeba's sentence IDs must be recorded per
example — CC BY 2.0 FR attribution is per sentence, not per project.

## Consulted, deliberately not imported

Excluded on licence grounds, and no material from them is in the dataset:

- **E-VALBU / grammis** (IDS Mannheim) — all rights reserved. Its list of verbs carrying a
  prepositional complement was used as a **completeness checklist only**: bare lemma names, telling
  the project which words to go and research elsewhere. No preposition, case, gloss, correlate or
  example was taken from it. See `docs/research/evalbu-checklist/README.md`.
- **DWDS** — § 44b UrhG text-and-data-mining reservation.
- **Leipzig Wortschatz** — CC BY-NC, incompatible with CC BY-SA.
- **Goethe-Institut word lists** — Goethe-Institut copyright.

---

## Re-using this dataset

The dataset (`data/de/*.yaml` and the compiled
`src/entities/rektion/model/dataset.generated.ts`) is CC BY-SA 4.0. To comply:

1. **Attribute** — credit "worauf" with a link to this repository, and keep the credit to
   Wiktionary that this file carries.
2. **Share alike** — a modified dataset must also be CC BY-SA 4.0.
3. **Keep this file**, or carry its substance forward. It is the attribution.

The application code is MIT and carries none of these obligations.
