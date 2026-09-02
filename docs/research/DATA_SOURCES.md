# worauf — Open data sources for German Rektion (government patterns)

Research report. Compiled 2026-09-02. All findings below were verified by fetching the actual
resource (HTTP), not from memory. Confidence is marked per finding: **[High]** = directly observed
in fetched data, **[Medium]** = observed but partially inferred / small sample, **[Low]** = could
not fetch, relies on secondary sources.

Scope: how to grow the hand-made dataset (~196 patterns / 164 words / 16 prepositions) into a
large, correct, legally redistributable dataset for a free static web app.

---

## TL;DR

1. **The English Wiktionary is the only large, open, machine-readable source that encodes
   preposition + case as a structured field.** The `{{+obj|de|:auf(acc)}}` template surfaces in the
   kaikki.org/wiktextract JSON as `senses[].info_templates[].args["2"]` — e.g. `warten` →
   `":auf(acc)"`. **634 German entries** on en.wiktionary carry a prepositional `+obj`. Licence:
   CC BY-SA 4.0 (dual with GFDL) → redistributable **with attribution + share-alike**.
   [High]

2. **The German Wiktionary is a second, partly disjoint seed**: the `{{K|…|Prä=auf|Kas=Akkusativ}}`
   sense-qualifier template is fully structured, but only **257 pages** use it. Everything else is
   free text buried in glosses (`"mit auf und Dativ, selten Akkusativ: …"`). Same CC BY-SA 4.0
   licence. Union of both editions is the realistic seed. [High]

3. **E-VALBU (IDS Mannheim) is the gold standard and is NOT redistributable.** It has
   **677 verb lemmas / 3 231 readings**, of which **451 lemmas / 1 100 readings** have a
   prepositional complement, with case, correlate (`darauf`) and clause type (`dass-S`, `Inf-S mit zu`)
   spelled out per reading. The grammis Impressum says *"Sämtliche Inhalte … sind urheberrechtlich
   geschützt. Jegliche Verwertung bedarf der vorherigen schriftlichen Zustimmung des IDS."*
   Use it as a **human validation reference only**, never as a data import. Same verdict for DWDS,
   which additionally reserves TDM rights under § 44b UrhG. [High]

4. **Corpus mining (UD treebanks) is good for ranking and validation, bad as a seed.** On UD German
   GSD dev+test (1 776 sentences) a straightforward `obl` + `case` + `Case=…` extraction produced
   2 003 PPs / 1 588 distinct `(head, prep, case)` tuples — dominated by locative *adjuncts*
   (`sein in+Dat` ×23) with real Rektion (`warten auf+Akk` ×4) buried in the tail. UD German does
   **not** mark prepositional objects as `obl:arg` (155 `obl:arg` in the sample, exactly **1** of
   them with a preposition), so the one obvious filter does not work. [High]

5. **Realistic target size: ~450–600 verb patterns + ~150–250 adjective/noun patterns ≈ 700–850
   patterns total** for "complete enough". Anchors: IDS official teaching lists have ~30 patterns at
   A1 and ~42 at A2; E-VALBU (built on the Zertifikat-Deutsch/B1 word list) has 451 verbs with
   prepositional complements; en.wiktionary yields 634 pages. **Noun government
   (`die Angst vor + Dativ`) is a hole in every machine-readable source** and must be hand-built or
   derived from the verb/adjective it nominalises. [High]

---

## Methodology

* Every source was fetched over HTTP (curl / WebFetch) between 2026-09-02 14:20–15:10 UTC.
* Probe words: `warten`, `bestehen`, `denken`, `freuen`, `stolz`, `Angst`, plus `schreiben`,
  `leiden`, `sorgen`, `streiten`, `halten`, `kommen`, `hängen`, `erinnern`, `bitten`, `fragen`,
  `ekeln`, and adjectives `zufrieden`, `abhängig`, `bereit`, `verantwortlich`, `interessiert`,
  `neugierig`, `böse`, and nouns `Hoffnung`, `Interesse`, `Bedarf`, `Angst`, `Freude`.
* Coverage was quantified with the MediaWiki `list=search&srsearch=insource:/…/` regex search on
  en.wiktionary and de.wiktionary (returns `searchinfo.totalhits`; rate-limited, so queries were
  spaced 3–8 s apart).
* UD feasibility was tested by actually running an extraction script over
  `de_gsd-ud-dev.conllu` + `de_gsd-ud-test.conllu` (1 776 sentences, 28 979 tokens).
* No file larger than 10 MB was downloaded. Large dumps were sized with `HEAD` only.
* Licences were read from the resource's own terms page or from the machine-readable
  `license` field (GitHub API, Zenodo API) — not from third-party summaries, except where noted
  as [Low].

---

## Per-source assessment

### 1. kaikki.org / wiktextract — English Wiktionary German extract ✅ **Recommended (seed)**

**What it actually contains.** The `{{+obj|de|…}}` template on en.wiktionary is extracted by
wiktextract into a dedicated field. Verified record for `warten`
(`https://kaikki.org/dictionary/German/meaning/w/wa/warten.jsonl`):

```json
{
  "info_templates": [
    { "name": "+obj",
      "args": { "1": "de", "2": ":auf(acc)" },
      "extra_data": { "words": ["auf", "(+", "accusative)"] },
      "expansion": "[with auf (+ accusative)]" }
  ],
  "raw_glosses": ["(intransitive) to wait (for) [with auf (+ accusative)]"],
  "glosses": ["to wait (for)"],
  "tags": ["intransitive", "weak"]
}
```

**Which fields carry government** [High]:

| Field | Carries government? | Notes |
|---|---|---|
| `senses[].info_templates[].args["2"]` | **yes — structured** | the canonical field. `":auf(acc)"` |
| `senses[].info_templates[].expansion` | yes — rendered English | `"[with auf (+ accusative)]"` |
| `senses[].raw_glosses` | yes — gloss **plus** the rendered `+obj` string appended | parseable but lossy |
| `senses[].glosses` | no | `+obj` is stripped out |
| `senses[].tags` | no (only `transitive`/`reflexive`/`impersonal`/`weak`…) | useful as a secondary signal (`reflexive` ⇒ `sich freuen`) |
| `head_templates`, `forms` | **no** | conjugation only |

**The `args["2"]` mini-language** (from `Template:+obj/documentation`,
<https://en.wiktionary.org/wiki/Template:%2Bobj>) [High]:

* `:auf(acc)` — literal preposition `auf`, object in accusative.
* `acc` / `dat` / `gen` — bare case object, no preposition.
* `/` — alternants with **no meaning difference**: `dat/:in(acc)` (`vertrauen`).
* `+` — **several arguments in one sense**: `streiten` → `:mit(dat)<with> + :um(acc)<…> + :über(acc)<about>`.
* `<…>` — English gloss for that specific argument.
* `<q:…>` — register qualifier, e.g. `erinnern` → `:an(acc)/gen<q:higher register><someone/something>`.
* `clause` — a clausal argument, e.g. `kommen` → `clause/:zu(dat)`.

**Real samples pulled** [High]:

```
bestehen  → ":aus(dat) ‘of something’"   (consist of)
          → ":auf(dat) ‘on something’"   (insist on)
denken    → ":an(acc) ‘about something’ or (rare) accusative"
freuen    → ":über(acc)"  |  ":auf(acc)"  |  ":für(acc)"  |  "gen" (poetical)
stolz     → ":auf(acc) ‘of someone/something’"
hängen    → ":an(dat)"  (strong, intransitive)  vs  "acc + :an(acc)"  (weak, transitive)
leiden    → ":an(dat) ‘from a disease or condition’"
sorgen    → ":für(acc)"  |  ":um(acc)"
bitten    → "acc<someone> + :auf(acc)/:zu(dat)/:in(acc)"
```

**Coverage** [High for the counts, Medium for the pattern estimate]:

* `insource:/\{\{\+obj\|de\|/` → **1 246 pages** (all government types).
* `insource:/\+obj\|de\|:/` → **634 pages** with a *prepositional* argument.
* Per preposition (pages): `auf` 107, `an` 69, `mit` 62, `zu` 47, `in` 40, `über` 38, `für` 36,
  `von` 30, `bei` 22, `gegen` 22, `nach` 16, `vor` 15, `um` 12, `aus` 11, `durch` 1, `unter` 0.
* Since a page can carry several senses each with several arguments (`kommen` has 12 senses with
  `+obj`, `halten` 6), the realistic yield is **~900–1 300 distinct patterns** from ~634 pages.
  Exact number requires streaming the full dump (see Access).
* The German kaikki dictionary as a whole: **351 357 distinct words**, **143 319 verb senses**,
  **154 539 noun senses** (<https://kaikki.org/dictionary/German/>).

**Known coverage gaps found by probing** [High]:

* **Nouns: zero.** `Angst`, `Hoffnung`, `Interesse`, `Bedarf`, `Freude` all have **no** `+obj`.
  The template is essentially never applied to German nouns.
* **Adjectives: partial.** `stolz`, `bereit`, `interessiert`, `neugierig`, `abhängig` have it;
  `zufrieden`, `verantwortlich`, `böse` do **not**.
* **Common verbs missing.** `schreiben` has **no** `+obj` at all (so `schreiben an + Akk`,
  `schreiben über + Akk` are absent). `unter` has **0** hits, so `leiden unter + Dativ` is missing
  even though `leiden an + Dativ` is present.
* **Data-quality defects.** `abhängig` → `":von"` (case omitted). `interessiert` → `":an + dat"`
  (malformed; should be `:an(dat)`). `halten` → `":für(acc/a predicate adjective)"` (free text
  inside the case slot). `kommen` → `":gut/:in Ordnung<well>"` (not a real government pattern).
  A parser must tolerate ~5 % junk and quarantine rather than crash.

**Access.** [High]
* Per-word JSONL: `https://kaikki.org/dictionary/German/meaning/<L>/<LL>/<word>.jsonl`
  (first letter case-sensitive: `.../A/An/Angst.jsonl`). ~18–27 KB per word, no auth, no visible
  rate limit. Ideal for spot-checks and for a curated word list of a few hundred entries.
* Bulk: `kaikki.org-dictionary-German-by-pos-verb.jsonl` = **310 MB**;
  `-by-pos-adj.jsonl` = **437 MB**; whole German dictionary = **1.07 GB**;
  raw all-language wiktextract = 22.9 GB (2.6 GB gzipped).
  Practical approach: `curl … | zcat | grep -F '"+obj"' | …` streaming, never store the dump.
* Refresh cadence: kaikki rebuilds ~weekly; the German page at time of research was built
  2026-08-28 from the enwiktionary dump of 2026-08-05.

**Licence.** Content is Wiktionary text → **CC-BY-SA-4.0** OR **GFDL-1.1-or-later**, dual-licensed
(<https://en.wiktionary.org/wiki/Wiktionary:Copyrights>, fetched verbatim). The wiktextract *code*
is **MIT** (with some CC BY-SA test fixtures). kaikki.org adds no separate licence; it asks for the
LREC 2022 Ylönen citation and a link. [High]

**Obligations if you ship it:** attribution (credit Wiktionary + a link to the source entries) and
**share-alike** — your derived dataset must itself be CC BY-SA 4.0 (or GFDL). This is compatible
with a free static web app; it means the *bundled JSON* is copyleft, but your *application code*
can stay MIT/Apache as a separate work.

**Verdict — Recommended, as the primary seed.** It is the only open source where preposition and
case are in a dedicated, regular, machine-parseable field rather than prose. Its coverage
(~634 pages / ~1 000 patterns) is 5× the current hand-made dataset and roughly matches the size a
"complete enough" B1–C1 resource needs for verbs. The share-alike obligation is easy to satisfy for
a free app. Its weaknesses — no noun government, patchy adjectives, ~5 % malformed args, missing
common verbs — are exactly the things a human curation pass and the German-edition extract are for.

---

### 2. German Wiktionary (de.wiktionary.org) ✅ **Recommended (complementary seed)**

**What it actually contains.** Government lives in three different places, in decreasing order of
usefulness [High]:

**(a) The `{{K}}` sense-qualifier with `Prä=` / `Kas=` — fully structured.** Raw wikitext of
`warten` (`https://de.wiktionary.org/w/index.php?title=warten&action=raw`):

```wikitext
{{Bedeutungen}}
:[1] {{K|intrans.|Prä=auf|Kas=Akkusativ|ft=warten [[auf#Präposition|auf]] das Ereignis ([[Akkusativ]])}} Zeit verstreichen lassen …
:[2] {{K|trans.}} technische Apparate pflegen …
```

`Prä=auf` + `Kas=Akkusativ` is exactly the `(preposition, case)` pair, attached to sense [1] only —
which is precisely the "pattern, not word" granularity the project needs. There is also `Prä2=`
for a second preposition (4 pages).

**(b) Free text inside the gloss — semi-structured.** `bestehen`:

```
"mit aus oder in und Dativ: zusammengesetzt sein, ausschließlich enthalten"
"mit auf und Dativ, selten Akkusativ: sich für etwas stark machen, nachdrücklich fordern"
```

Regex-extractable (`mit (\w+)(?: oder (\w+))? und (Dativ|Akkusativ|Genitiv)`) but brittle, and it
carries the very useful hedge `selten Akkusativ`.

**(c) `{{Charakteristische Wortkombinationen}}` — case is *not* given.** `Angst`:

```
:[1] ''Angst'' haben (vor etwas/jemandem oder um etwas/jemanden), in ''Angst'' ausbrechen, …
```

You can see `vor` and `um`, but the case must be inferred from `etwas/jemandem` (dative) vs
`etwas/jemanden` (accusative) — doable with a morphological rule on the placeholder forms, but
noisy. This is currently the **only** place German noun government appears at all.

**wiktextract's German-edition extract loses (a).** Verified: the kaikki `dewiktionary/Deutsch`
record for `warten` renders the K-template as free text and drops `Prä`/`Kas`:

```json
{"glosses": ["Zeit verstreichen lassen …"],
 "raw_tags": ["warten auf das Ereignis (Akkusativ)"],
 "tags": ["intransitive"]}
```

⇒ **Do not use kaikki's dewiktionary extract for government. Parse the de.wiktionary wikitext
directly** (action=raw or the XML dump). [High]

**Coverage** [High]:
* `insource:/\{\{K\|[^}]*Prä=/` → **257 pages**; `Kas=` → the same **257**; `Prä2=` → 4.
* de.wiktionary has 14 555 German verbs, 18 005 German adjectives, 138 290 German nouns
  (category counts via `prop=categoryinfo`).
* So the structured layer covers ~1.8 % of German verbs. Much smaller than en.wiktionary's 634, but
  **partly disjoint**: `bestehen`'s "selten Akkusativ" hedge and the noun collocations only exist
  here; conversely `stolz` and `denken` have **no** government marking in de.wiktionary but do in
  en.wiktionary.

**Access.** Per-page `?action=raw` (6–12 KB), or the full dump
`dewiktionary-latest-pages-articles.xml.bz2` (~1 GB class — do not download for a first pass).
MediaWiki API rate limits are real: 12 rapid `list=search` calls triggered
*"You are making too many requests to the API"*; 3–8 s spacing worked. [High]

**Licence.** CC-BY-SA-4.0 / GFDL, identical to en.wiktionary. [High]

**Verdict — Recommended, as the second seed and as a cross-check.** Machine-extractable government
exists but only for a minority of entries; the payoff is that its 257 structured entries plus its
free-text hedges (`selten Akkusativ`, `gehoben`) overlap only partly with en.wiktionary, so the
union is meaningfully larger and the intersection gives you free agreement-based confidence scoring.
It is also the natural source for the Russian/other-language glosses if you ever want them, and it
is the only open source that at least *mentions* noun government.

---

### 3. DWDS (dwds.de) ❌ **Not recommended**

**What it contains.** A high-quality edited dictionary (WDG + DWDS-Wörterbuch), an etymological
dictionary, DeReKo-scale corpora, and a word-profile/collocation engine. Article text does carry
grammatical government in prose ("Rektion") but there is **no structured valency field exposed**.

**API** (<https://www.dwds.de/d/api>) — verified live [High]. What is actually open:
* `/api/frequency/?q=…` — lemma frequency, logarithmic class 0–6.
* `/api/wb/snippet/?q=…` — existence + part of speech only.
* `/api/ipa/?q=…` — pronunciation.
* Headword lists: `dwdswb-headwords.json`, `etymwb-headwords.json`, `dwb-headwords.json` (+ LMF XML).
* Goethe-Zertifikat A1/A2/B1 word lists as CSV/JSON — **but** the page states these are
  *"urheberrechtlich (Goethe-Institut) geschützt"*.

The API page itself says: *"Auch wenn wir viele der Daten im Wortauskunftssystem des DWDS aus
rechtlichen Gründen nicht für eine API öffnen dürfen, so können doch zumindest rudimentäre
Informationen … abgerufen werden."* — i.e. the dictionary content is deliberately **not** exposed.

**Licence / terms.** <https://www.dwds.de/d/nutzungsbedingungen>, quoted verbatim [High]:

> „Die Berlin-Brandenburgische Akademie der Wissenschaften (BBAW) behält sich das Recht an der
> Nutzung der Daten gemäß **§ 44b UrhG** vor. Jegliche Nutzung der Inhalte des DWDS, einschließlich
> jedoch nicht beschränkt auf **automatisierte Abfragen und Auswertungen (Crawlen, Parsen, Text-
> und Data-Mining)**, sofern nicht über § 60d UrhG zulässig, ist nur mit ausdrücklicher Genehmigung
> gestattet."

That is an explicit machine-readable TDM reservation under the German implementation of the EU DSM
directive. § 60d (scientific research) does not cover a public web app. Individual sub-resources are
open — the *Etymologisches Wörterbuch* headword list is **CC-BY-SA-4.0**
(<https://doi.org/10.5281/zenodo.14013687>, `license.id = "cc-by-sa-4.0"`, 1.45 MB) — but headwords
are just a lemma list, no government. The Blog-Korpus is CC BY-SA; all other web corpora are
research-only. [High]

**Verdict — Not recommended.** DWDS has the editorial quality you want and none of the access you
need: government is only in prose article text, that text is not in any API, and the site carries an
explicit § 44b UrhG opt-out against parsing and data mining. Using it would mean scraping content
whose owner has formally forbidden automated extraction, to redistribute in a public app. The only
safe uses are (a) the CC BY-SA headword/etymology lists, and (b) opening a page in a browser to
manually settle a disputed pattern during curation, citing it like any other dictionary.

---

### 4. E-VALBU / VALBU (IDS Mannheim, grammis) ⚠️ **Conditional — reference only, no import**

**What it actually contains.** The canonical German verb valency dictionary, online at
<https://grammis.ids-mannheim.de/verbvalenz> (DOI 10.14618/evalbu). Every reading (*Lesart*) has a
`Satzbauplan` over complement types `Ksub, Kakk, Kakk2, Kgen, Kdat, Kprp, Kprp2, Kadv, Kadv2, Kprd,
Kvrb`, plus `Belegungsregeln` giving the exact preposition + case, plus attested examples.

Real fetched entry — `warten` Lesart 3 (`/verbs/view/401186/3`) [High]:

```
warten auf (Lesart 3)
Strukturbeispiel:  etwas wartet auf etwas
Im Sinne von:      an etwas muss etwas ausgeführt werden
Satzbauplan:       Ksub , Kprp
Belegungsregeln:
  • Ksub : NP im Nom / ProP im Nom / GWS
  • Kprp :
      • auf +Akk
          (3) Die Briefe auf dem Schreibtisch warten schon lange auf Beantwortung.
      • SKprp mit obl. Korrelat darauf:
          • dass-S:      (4) … warten viele bestellte Bücher darauf, dass sie endlich abgeholt werden.
          • Inf-S mit zu: (5) Unsere Fenster warten schon lange darauf, geputzt zu werden.
Passivkonstruktionen: kein Passiv möglich
```

This is **exactly the data model the project needs**, including the correlate and the clause-type
distinction — see the linguistic questions below.

**Coverage — measured, not estimated** [High]. The search form (`GET /verbs/search`) reports hit
counts:

| Query | Readings (*Treffer*) | Distinct lemmas |
|---|---|---|
| all readings (`?satzbauplan=0`) | **3 231** | **677** |
| readings with `Kprp` (`?komplemente[]=praep`) | **1 100** | **451** |

The verb selection is inherited from the print VALBU and is based on the *Zertifikat Deutsch* word
list — i.e. it is deliberately a **learner-relevant** ~B1 core. That makes 451 verbs the single best
answer to "how big should a complete-enough verb dataset be".

**Access.** No download, no API, no bulk export. HTML only; `Anmelden` is required for
copyright-protected corpus evidence. Search results are server-rendered HTML and paginate to a full
list (the 1 100-row `Kprp` result page is a single 98 KB HTML document). [High]

**Licence.** <https://grammis.ids-mannheim.de/impressum>, verbatim [High]:

> „Urheberrechtshinweis: **Sämtliche Inhalte des Online-Angebots sind urheberrechtlich geschützt.
> Jegliche Verwertung bedarf der vorherigen schriftlichen Zustimmung des IDS.**"

No SPDX identifier — it is all-rights-reserved. Citation is explicitly welcomed
(DOI: 10.14618/evalbu; Schneider/Lang 2022, ZGL 50(2), 407–427).

**Verdict — Conditional: use as a human validation reference, never as an import.** E-VALBU is the
most accurate and best-structured German valency resource in existence and it is free to *read*, so
it is the right thing to open when two open sources disagree about a case, or when you need to
decide whether a correlate is obligatory. But its content is all-rights-reserved with an explicit
written-permission requirement, so bulk extraction into a shipped JSON file is not an option.
Two legitimate uses: (i) manual arbitration during curation, cited per entry; (ii) if the project
ever wants the real thing, write to `grammis@ids-mannheim.de` — an educational free app is exactly
the kind of use IDS grants permission for, and the answer costs one email.

---

### 5. Universal Dependencies German treebanks (GSD, HDT) ⚠️ **Conditional — validation & ranking**

**Feasibility was tested, not assumed.** Script: for every token with `deprel ∈ {obl, obl:arg, nmod}`
whose head is a `VERB`/`AUX`/`ADJ` (or `NOUN` for `nmod`), find its `case` child that is a known
preposition, and read `Case=…` from the dependent's `FEATS`. Run over
`de_gsd-ud-dev.conllu` + `de_gsd-ud-test.conllu` = 1 776 sentences / 28 979 tokens. [High]

Result: **2 003 extracted PPs → 1 588 distinct `(head, pos, prep, case)` tuples.** Top of the list:

```
23  (sein,      VERB, in,    Dat)   ← adjunct
12  (geben,     VERB, in,    Dat)   ← adjunct
 9  (sein,      VERB, bei,   Dat)   ← adjunct
 6  (entscheiden,VERB, über, Acc)   ← TRUE Rektion
 5  (stoßen,    VERB, auf,   Acc)   ← TRUE Rektion
 5  (handeln,   VERB, um,    Acc)   ← TRUE Rektion
 4  (verfügen,  VERB, über,  Acc)   ← TRUE Rektion
 4  (warten,    VERB, auf,   Acc)   ← TRUE Rektion
 4  (gehören,   VERB, zu,    Dat)   ← TRUE Rektion
 4  (liegen,    VERB, in,    Dat)   ← adjunct
 5  (Gespräch,  NOUN, mit,   Dat)   ← TRUE noun Rektion
```

**The core problem: adjuncts outnumber arguments and the obvious filter does not work.** [High]
UD's `obl:arg` relation should separate arguments from adjuncts, but German UD uses it almost
exclusively for **bare dative/genitive objects**, not for prepositional objects: of 155 `obl:arg`
tokens in the sample, exactly **one** (`beteiligen an+Dat`) had a preposition. The HDT changelog
confirms this is deliberate: *"Dative arguments are oblique, hence they are `obl:arg` and not
`iobj`."* So you cannot filter on `obl:arg`.

**What *does* work as a discriminator** (untested here, but derivable from the same data) [Medium]:
1. **Association strength**, not raw count: log-likelihood or PMI between verb lemma and preposition
   against the marginal preposition distribution. `warten`×`auf` is extreme; `sein`×`in` is not.
2. **Case rigidity for Wechselpräpositionen.** A true prepositional object with `auf`/`an`/`in` has
   one fixed case; a locative/directional adjunct alternates Dat/Akk with the same verb. Measure the
   Dat:Akk entropy per `(verb, prep)`: near-zero entropy ⇒ argument, high entropy ⇒ adjunct.
   In the sample: `gehen in+Acc` (4) *and* `gehen in+Dat` (4) — visibly an adjunct;
   `warten auf+Acc` (4) with zero Dat — visibly an argument.
3. **The `da(r)`-compound test.** A prepositional object pronominalises to `darauf`/`darüber` and
   licenses a correlate before a `dass`-clause; a locative adjunct usually does not. In the same
   sample: `damit` 17, `dazu` 11, `dabei` 11, `dafür` 10, `darüber` 8, `dagegen` 8, `darauf` 7,
   `davon` 3, `daraus` 3, `daran` 3 — all tagged `ADV/advmod`, so `(verb, da-compound)` bigram
   counts are directly minable and give an independent argumenthood signal.

**Coverage / size** [High]:
* **UD_German-GSD**: 14 118 train / 799 dev / 977 test. `de_gsd-ud-train.conllu` = **19.6 MB**.
  Genre: news, reviews, wiki. Lemmas automatic, UPOS converted from manual.
* **UD_German-HDT**: **261 821 sentences / 4.8 M tokens**, from heise.de 1996–2001.
  `de_hdt-ud-train-a-1.conllu` alone = **52 MB** (there are several parts). Lemmas and UPOS
  converted from manual annotation, morphological features converted from manual — the better of the
  two for this task, but the genre (1990s IT news) skews the verb inventory hard toward
  `verfügen über`, `berichten über`, `warten auf` and away from everyday learner vocabulary.
* 4.8 M tokens ≈ 330 000 PPs at the sample's rate — enough for stable frequency ranking of the
  ~600 patterns you care about, not enough to discover rare ones.

**Licence.** Both **CC-BY-SA-4.0** (verified in each README's metadata block). GSD note: *"Google
gave permission to drop the 'NC' restriction from the license"*; HDT note: *"Heise gave permission
to distribute the text for academic use; the annotations are licensed under a Creative Commons
share-alike license."* [High]

⚠️ Caveat: for HDT the *underlying text* permission is worded as "academic use". Frequency counts
and derived `(verb, prep, case, rank)` tuples are facts, not text, and are safe to publish; **do not
ship HDT sentences as example sentences.** GSD's underlying text is CC BY-SA and safe. [Medium]

**Verdict — Conditional: excellent for validation and ranking, unusable as a seed.** The experiment
shows raw `obl`+`case`+`Case` mining produces a list where genuine Rektion is a minority of the mass
and there is no cheap syntactic filter. But turned around — *given* a candidate list from Wiktionary
— the same corpus answers the two questions Wiktionary answers badly: "does this pattern actually
occur, and how often?" (drop patterns with zero corpus support; order the learning path by
frequency) and "is the case really fixed?" (Dat/Akk entropy per `(verb, prep)` catches Wiktionary
errors directly). Use HDT for counts, GSD if you also want quotable sentences.

---

### 6a. Wortschatz Leipzig (Leipzig Corpora Collection) ⚠️ **Conditional — NC licence blocks bundling**

**What it contains.** Corpus-derived dictionaries for 250+ languages: word frequency, frequency
class, co-occurrences with significance, and example sentences with source URL and date.

**Access.** The web portal (`wortschatz.uni-leipzig.de`, `corpora.uni-leipzig.de`) is behind
**Anubis** proof-of-work bot protection and returns a JS challenge to curl and to WebFetch — the
terms page could not be read directly. [High] The REST API is open and unprotected [High]:

```
GET https://api.wortschatz-leipzig.de/ws/words/deu_news_2012_1M/word/warten
    → {"id":1349,"word":"warten","freq":1255,"wordRank":1249,"frequencyClass":9}

GET https://api.wortschatz-leipzig.de/ws/sentences/deu_news_2012_1M/sentences/warten?limit=2
    → {"count":1255,"sentences":[
        {"id":"798575","sentence":"Neue Taktiken warten ebenfalls darauf, von den Spielern
          und ihren Clans ausprobiert zu werden.",
         "source":{"url":"http://www.pcgames.de/…","date":"2012-04-13"}}, …]}
```

Note that the very first returned sentence is a textbook `warten darauf, … zu`-correlate example —
the sentence endpoint is genuinely useful. `…/cooccurrences/…/coocs/…` and `…/corpora/corpora`
returned 404 on the paths tried; the co-occurrence endpoint exists but its path was not determined.
[Medium]

**Licence.** **CC BY-NC** — "Data and applications provided by Projekt Deutscher Wortschatz are
licensed under the Creative Commons License CC BY-NC for non-commercial personal and scientific
purposes." Sourced from the (Anubis-blocked) Terms of Usage page via search-result summary, not read
first-hand. **[Low — verify by opening <https://wortschatz.uni-leipzig.de/en/usage> in a browser
before relying on it.]**

**Verdict — Conditional, and probably not worth it.** The API works well and its example sentences
are exactly the kind you want. But CC BY-NC is **incompatible with CC BY-SA 4.0** (you cannot merge
NC content into a share-alike dataset) and imposes a non-commercial restriction that a "free static
web app" may or may not satisfy depending on how it is ever monetised or mirrored. Since Tatoeba
gives you CC BY example sentences with no NC clause, Leipzig's only unique value here is frequency
ranking — which the CC BY-SA UD treebanks also provide. Use it for private research during curation;
do not bundle its sentences.

### 6b. Tatoeba ✅ **Recommended (example sentences)**

**What it contains.** Community-contributed sentences with translations and per-sentence licence.
**Licence: CC BY 2.0 FR**, with a subset also available under **CC0 1.0** — stated verbatim on
<https://tatoeba.org/en/downloads>: *"These files are released under CC BY 2.0 FR. A part of our
sentences are also available under CC0 1.0."* Audio has per-contributor licences. [High]

**Access.** Weekly exports, updated Saturdays 06:30 UTC.
`https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2` = **12.0 MB**
compressed (not downloaded — over the 10 MB limit set for this research). Per-language directory
also has `deu-<lang>_links.tsv.bz2` pair files for every target language, including Russian, which
matters for the Russian-gloss UI. There is also an on-demand "Sentence pairs" custom export tool.
[High]

**Fit for purpose.** Sentences are short, learner-oriented, and often contain exactly the
constructions needed (`Ich warte auf dich.`, `Ich freue mich darauf, …`). Quality is uneven and
attribution is per-sentence. CC BY 2.0 FR is **one-way compatible into CC BY-SA 4.0**, so Tatoeba
sentences can be merged into a CC BY-SA dataset (but not the reverse). [Medium — licence
compatibility direction is standard CC practice, not verified against a legal source here.]

**Verdict — Recommended for example sentences only.** It carries no government annotation, so it
contributes nothing to the pattern list itself; its value is that it is the one large German
sentence source whose licence lets you ship the actual sentence text in a public app. Plan: for each
pattern, regex-match sentences containing the verb lemma near the preposition, rank by shortness and
by presence of a clear case-marked article, and hand-pick 1–3 per pattern.

### 6c. OPUS ⚠️ **Conditional — raw material, no annotation**

Parallel/monolingual corpora aggregator. The API works and is well-behaved [High]:

```
GET https://opus.nlpl.eu/opusapi/?source=de&target=en&preprocessing=moses&version=latest
    → 127 de–en corpora, each with size, token counts and a direct download URL
    e.g. Books v1: 51 467 alignment pairs, 1 097 030 de tokens, 5 MB
         CCMatrix v1: 247 470 736 pairs, 3.75 G de tokens, 20.7 GB
```

Licences vary **per corpus** (Europarl, OpenSubtitles, Tatoeba, Wikimedia, CCMatrix, ELRC each have
their own); OPUS itself asserts nothing global. There is no linguistic annotation of the kind needed
here — you would have to parse it yourself. **Verdict — Conditional.** Only worth it if you later
want a much larger corpus than HDT for frequency work, and then only after checking the specific
sub-corpus licence. For an MVP it adds nothing over UD + Tatoeba.

---

### 7. Existing open datasets and repositories ❌ **Nothing usable found**

Searched GitHub (API), Hugging Face (`/api/datasets?search=`), and Zenodo (`/api/records?q=`).
[High]

| Resource | What it is | Licence | Verdict |
|---|---|---|---|
| [`bflowtoolbox/VerbframesDE`](https://github.com/bflowtoolbox/VerbframesDE) | German verb frames as JSON, with `"<prep>+<case>"` keys — exactly the right *shape* | **MPL-2.0** | ❌ |
| [`Linguistic-Data-Science-Lab/German_EO_verbs`](https://github.com/Linguistic-Data-Science-Lab/German_EO_verbs) | 64 experiencer-object verbs, syntactic + semantic annotation | **none declared** | ❌ |
| [`viorelsfetea/german-verbs-database`](https://github.com/viorelsfetea/german-verbs-database) | Wiktionary conjugation tables | **none declared** | ❌ |
| [DBnary](https://kaiko.getalp.org/about-dbnary/) | Wiktionary → OntoLex/lemon RDF, 27 editions incl. German | **CC BY-SA 3.0** | ❌ |
| [Wikidata Lexemes](https://www.wikidata.org/wiki/Lexeme:L590368) | German lexemes with forms and senses | **CC0-1.0** | ❌ |
| [Open German WordNet (odenet)](https://github.com/hdaSprachtechnologie/odenet) | German wordnet | **CC-BY-SA-4.0** | ❌ |
| Hugging Face | searched "german verbs", "valency", "rektion german" | — | nothing relevant |
| Zenodo | searched "German verb valency preposition" | mostly CC BY papers | papers only, no datasets |

**Why each fails.** `VerbframesDE` looked most promising and was actually downloaded and analysed:
8 371 entries, but only **815 prepositional slots across 105 distinct verbs**, and they are
*domain-specific business/admin collocations*, not general Rektion —
`{"vfin":"ablegen","in+A":"Datei"}`, `{"vfin":"ablegen","in+D":"Archiv"}`,
`{"vfin":"abschicken","per+D":"Workflow"}`. The README says so plainly: *"The dataset was built for
use within the business and administration domain … has to be hugely extended to be useful in
non-business setups."* [High]

`DBnary` is a faithful CC BY-SA RDF re-modelling of Wiktionary, but the OntoLex/lemon model it
targets carries senses, translations and lexical relations — it does not model the `+obj` /
`Prä=`/`Kas=` government annotations, so it is strictly worse than parsing kaikki/wikitext directly.
[Medium]

`Wikidata Lexemes` would be ideal licence-wise (CC0) but carries no government. Verified on
`L590368` (`warten`, German verb): claims are `P11070, P11519, P11577, P31, P5401, P5402, P8376,
P9940` (conjugation class, IDs, etc.) and its single sense `L590368-S1` has one claim `P9970` — no
preposition, no case property. [High]

**Verdict — Not recommended, all of them.** There is no pre-existing open German
verb+preposition+case dataset of usable size or licence. This is the central finding of the
GitHub/HF/Zenodo sweep: **the dataset this project needs does not exist yet**, which is both the bad
news (you must build it) and the good news (publishing it CC BY-SA would itself be a contribution
nobody else has made).

---

## Linguistic questions answered

### Q1. How many German verbs with prepositional objects are there in teaching lists (A1–C1)? What is a realistic target?

**Hard anchors, all measured** [High]:

| Source | Scope | Count |
|---|---|---|
| IDS **VmP-Listen A1** (`grammis.ids-mannheim.de/VmP-Listen`, DOI 10.14618/VmP-Listen) | CEFR A1 | **~30** verb+preposition patterns |
| IDS **VmP-Listen A2** | CEFR A2 | **~42** patterns |
| **E-VALBU**, `Kprp` filter | ≈ Zertifikat Deutsch / B1 core | **451 lemmas / 1 100 readings** |
| **en.wiktionary** `{{+obj\|de\|:…}}` | unrestricted | **634 pages** (~900–1 300 patterns est.) |
| **de.wiktionary** `Prä=`+`Kas=` | unrestricted | **257 pages** |
| Typical commercial B1–B2 practice sites | B1–B2 | ~400 verbs claimed (grammatiktraining.de) [Low] |

The A1 list is short enough to quote in full and shows the flavour of the level: `achten auf`,
`antworten auf`, `arbeiten mit`, `beginnen/anfangen mit`, `bitten um`, `danken für`, `denken an`,
`einladen zu`, `enden auf/mit`, `sich erinnern an`, `erzählen von`, `fragen nach`, `sich freuen
auf`, `sich freuen über`, `es geht um`, `gratulieren zu`, `heißen auf`, `helfen bei`, `sich
informieren über`, `sich interessieren für`, `passen zu`, `schreiben an`, `schreiben über`, `sorgen
für`, `telefonieren mit`, `warten auf`, `zusammenarbeiten mit`.

**Recommended target** [Medium — a judgement call on top of the measured anchors]:

| Milestone | Verb patterns | Adj patterns | Noun patterns | Total | Rationale |
|---|---|---|---|---|---|
| current | ~160 | ~25 | ~10 | **196** | hand-made |
| **v1 "teaching-complete"** | ~350 | ~90 | ~60 | **~500** | covers A1–B2 comfortably; every pattern in the IDS A1/A2 lists plus the standard B1/B2 textbook inventory |
| **v2 "complete enough"** | ~500 | ~150 | ~120 | **~770** | matches E-VALBU's 451 verbs plus the adjective and noun layers E-VALBU does not cover |
| ceiling | ~700 | ~250 | ~250 | ~1 200 | beyond this you are into rare/literary/technical patterns with negative pedagogical value |

The important number is **451**: E-VALBU's verb-with-prepositional-complement count on a
deliberately learner-oriented lemma selection. A dataset that covers those 451 verbs — with their
1 100 readings collapsed to the ~600 that a learner actually needs to distinguish — is
"complete enough" for a Rektion trainer, and everything beyond it is long tail.

### Q2. Which prepositions take a fixed case in prepositional-object usage, and which vary?

Two independent axes that are easy to conflate. [High]

**(a) Prepositions with an inherently fixed case** — the case never varies, anywhere:

| Case | Prepositions |
|---|---|
| always **Dativ** | `aus, bei, mit, nach, seit, von, zu, gegenüber, ab, außer` |
| always **Akkusativ** | `durch, für, gegen, ohne, um, bis, wider` |
| **Genitiv** (with a Dativ colloquial variant) | `wegen, während, trotz, statt, dank, laut` |

For these, the case is **a property of the preposition**, and your data model could in principle
derive it. Observed distribution in the en.wiktionary German data: `mit` 62, `zu` 47, `für` 36,
`von` 30, `bei` 22, `gegen` 22, `nach` 16, `um` 12, `aus` 11, `durch` 1.

**(b) Wechselpräpositionen** — `an, auf, in, hinter, neben, über, unter, vor, zwischen`. In *local*
usage they alternate Akk (direction) / Dat (location). **In prepositional-object usage the
alternation disappears: the case is fixed by the pattern, not by the preposition.** This is exactly
the project's stated premise and it holds:

```
warten auf   + Akk   (kaikki: ":auf(acc)")
bestehen auf + Dat   (kaikki: ":auf(dat)")   ← same preposition, opposite case
denken an    + Akk   (kaikki: ":an(acc)")
leiden an    + Dat   (kaikki: ":an(dat)")    ← same preposition, opposite case
```

Observed distribution: `auf` 107 pages (98 with `acc`, 10 with `dat`), `an` 69 (22 with `acc`,
rest mostly `dat`), `über` 38, `vor` 15, `in` 40, `unter` 0.

**Design consequence:** store `case` on the *pattern*. Do **not** store it on the preposition, and do
not try to derive it. Optionally add a boolean `preposition.case_is_inherent` so the UI can say
"`mit` is always Dativ — nothing to learn here" for group (a) and "`auf` here is Akkusativ — this is
the thing to memorise" for group (b). Roughly 55 % of the observed patterns use a group-(b)
preposition, so that distinction is pedagogically load-bearing.

**Note on `über`/`unter` frequency:** en.wiktionary has **0** German entries with `:unter(`, which is
a coverage bug, not a fact — `leiden unter + Dativ` is a standard B1 pattern. Treat low counts as
evidence of Wiktionary gaps, not of rarity.

### Q3. How should da-/wo- compounds be derived? Is it mechanical?

**Mostly mechanical, with a closed exception list.** Source: German Wikipedia,
[Pronominaladverb](https://de.wikipedia.org/wiki/Pronominaladverb), fetched verbatim. [High]

**The rule:** `da` / `wo` (also `hier`) + preposition, with **`-r-` inserted when the preposition
begins with a vowel**:

```
auf  → darauf  / worauf  / hierauf      (r-insertion)
an   → daran   / woran   / hieran       (r-insertion)
über → darüber / worüber                (r-insertion)
um   → darum   / worum                  (r-insertion)
in   → darin   / worin                  (r-insertion)
aus  → daraus  / woraus                 (r-insertion)
mit  → damit   / womit                  (no r)
für  → dafür   / wofür                  (no r)
von  → davon   / wovon                  (no r)
nach → danach  / wonach                 (no r)
```

**The exceptions are a closed list — this is the important part.** Wikipedia, verbatim:
*"Pronominaladverbien können nur mit den 19 folgenden Präpositionen gebildet werden: allen 9 dualen
Präpositionen (Wechselpräpositionen): an, auf, in, hinter, neben, vor, über, unter, zwischen; den
folgenden kurzen und häufig verwendeten: aus, bei, durch, für, gegen, mit, nach, um, von, zu. So
gibt es zwar das Wort „damit", aber nicht das Wort „darohne"."*

So:

1. **Only these 19 prepositions form da-/wo- compounds.** `ohne`, `seit`, `außer`, `ab`, `gegenüber`,
   `wegen`, `während`, `trotz`, `statt`, `bis`, `dank` do **not**. `*darohne`, `*daseit`,
   `*dagegenüber` are ungrammatical.
2. **Genitive prepositions use suppletive forms**: `wegen` → `deswegen` / `weswegen`,
   `trotz` → `trotzdem`, `statt` → `stattdessen`, `seit` → `seitdem`. These are lexicalised and are
   generally **not** interchangeable with the prepositional-object construction; they behave as
   connectors, not as correlates.
3. **Personal reference blocks the compound entirely.** Wikipedia: *"Pronominaladverbien können nicht
   in Bezug auf Personen, sondern nur in Bezug auf Sachen verwendet werden."* So:
   ```
   Ich warte auf den Bus.     → Ich warte darauf.      ✓  (thing)
   Ich warte auf meinen Vater.→ Ich warte auf ihn.     ✓  (person)
                              → *Ich warte darauf.     ✗
   Auf wen wartest du?  (person)   vs   Worauf wartest du?  (thing)
   ```
   The `wo-` interrogative is likewise thing-only; for persons you use `preposition + wen/wem`
   (`Auf wen? An wen? Mit wem?`).
4. Regional/register variant: southern German uses `hie-` before some consonant-initial prepositions
   (`hiemit`, `hienach`, `hiezu`). Northern/central colloquial German splits the compound:
   *"Da hab ich keine Ahnung von."* Both are out of scope for a learner app but worth a footnote.

**Design consequence:** generate `da_form` and `wo_form` mechanically from the preposition with a
19-item allowlist and a vowel-initial test, but store them as **materialised fields** on the
preposition record, not computed at render time — you need somewhere to put the four suppletive
forms and the "no form exists" case. Add a boolean `allows_personal_object` on the pattern (does
this pattern ever take a human object?) so the UI can teach the `auf wen` / `worauf` split, which is
a genuine and frequently-tested learner difficulty.

### Q4. What happens when the object is a clause? Should the model carry a field for it?

**Yes — and E-VALBU shows exactly what the field should look like.** [High]

When the prepositional object is realised as a subordinate clause, the preposition cannot govern the
clause directly. Instead a **correlate** (`Korrelat`) — the da-compound — stands in the matrix
clause and the clause follows:

```
Ich warte auf den Bus.                        PP object
Ich warte darauf, dass der Bus kommt.         dass-clause + obligatory correlate
Ich warte darauf, endlich abfahren zu können. zu-infinitive + obligatory correlate
Ich freue mich darauf, dich zu sehen.         zu-infinitive
Ich weiß nicht, worauf du wartest.            wo-compound in an indirect question
```

The fetched E-VALBU entry for `warten` Lesart 3 models this explicitly, with three levels:

```
Kprp:
  • auf +Akk                              ← nominal realisation
  • SKprp mit obl. Korrelat darauf:       ← clausal realisation, correlate OBLIGATORY
      • dass-S
      • Inf-S mit zu
```

Note `obl.` = *obligatorisch*. Correlate obligatoriness is **lexically specified and varies by
pattern** — this is precisely the kind of thing learners get wrong and the kind of thing a Rektion
app should teach. `warten` requires `darauf`; some verbs allow it optionally
(`Ich hoffe(, darauf,) dass …`); with some it is ungrammatical.

**Recommended model** [Medium — design recommendation, not a sourced fact]:

```jsonc
{
  "id": "warten-auf-akk",
  "word": "warten", "pos": "verb",
  "preposition": "auf", "case": "akk",
  "gloss_ru": "ждать (чего-л.)",
  "clausal": {
    "allowed": true,
    "correlate": "darauf",
    "correlate_required": "obligatory",   // obligatory | optional | forbidden
    "clause_types": ["dass", "zu-inf", "w-frage"]
  },
  "allows_personal_object": true,          // → "auf wen", not "worauf"
  "example_nominal": "Ich warte auf den Bus.",
  "example_clausal": "Ich warte darauf, dass der Bus kommt."
}
```

This is worth carrying even though **no open source provides it**: neither Wiktionary edition
encodes correlate obligatoriness. It has to be hand-annotated (with E-VALBU open in a browser as the
reference) or left `null`. Treat it as a v2 field: ship `clausal.allowed` + `correlate` first
(mechanically derivable from Q3), and fill `correlate_required` only for the highest-frequency
patterns.

### Q5. Are there patterns where the same word + preposition takes different cases with different meanings?

**Yes. Three genuinely distinct types, all verified.** [High]

**Type A — same lemma, same preposition, different case, different meaning.** The strongest case is
`hängen`, where the case difference tracks a transitivity and conjugation-class difference. From
kaikki (en.wiktionary):

```
hängen (strong, intransitive)  → ":an(dat)"        "to hang, to be suspended"
                                                    Das Bild hängt an der Wand.
hängen (weak,   transitive)    → "acc + ":an(acc)" "to hang, to suspend"
                                                    Ich hänge das Bild an die Wand.
hängen (strong, intransitive)  → ":an(dat)"        "to be attached to, to be fond of"
                                                    Sie hängt an ihrer Familie.
```

de.wiktionary confirms it has two separate entries for the two `hängen`s, and notes the split is
recent (19th c.) and still leaks colloquially: *"Umgangssprachlich werden aber auch heute noch nicht
selten die starken Formen auch bei transitivem Gebrauch verwendet."* Same for `stellen/stehen`,
`legen/liegen`, `setzen/sitzen` — but those are distinct lemmas, so only `hängen` is a true
minimal pair.

`schreiben` is the classic teaching example (`schreiben an + Akk` = write to someone;
`schreiben an + Dat` = be working on something). It is **not** in en.wiktionary at all (no `+obj`),
and de.wiktionary marks only `{{K|Dativ}}` on sense [3]. The IDS A1 list has
`schreiben (etw.[A]) an jdn.` and `schreiben (etw.[A]) über etw./jdn.` The Dativ reading exists in
usage but is poorly documented in open sources — flag it as needing manual sourcing. [Medium]

**Type B — same lemma+preposition, case varies by register, meaning unchanged.** `bestehen`, from
de.wiktionary verbatim: *"mit auf und **Dativ, selten Akkusativ**: sich für etwas stark machen,
nachdrücklich fordern, auf etwas beharren"*. Both `auf seinem Recht bestehen` (Dat, standard) and
`auf sein Recht bestehen` (Akk, marked) occur. This is a **case-variant flag**, not a second pattern.

**Type C — same lemma, different preposition, different meaning.** This is the common case and the
project already handles it (`sich freuen auf` vs `über`; `bestehen auf/aus/in`; `denken an` vs
`über`). Confirmed in the data: `freuen` has four `+obj` senses (`über(acc)`, `auf(acc)`,
`für(acc)`, bare `gen`), `sorgen` two (`für(acc)`, `um(acc)`), `bestehen` two (`aus(dat)`,
`auf(dat)`).

**Design consequence:** the pattern-not-word model is correct and already handles A and C. Type B
needs one more field: an optional `case_variant` with a register label, so `bestehen auf` can render
as "**Dativ** (rarely Akkusativ)" rather than being split into two patterns that would look like a
meaning contrast when it is not.

### Q6. How should register-variant and contested government be flagged?

**Four distinct phenomena, and they should not share one flag.** [High]

**(1) The `wegen` + Genitiv/Dativ debate.** de.wiktionary's `wegen` entry, verbatim:

```
a) auf wegen folgt normalerweise ein Substantiv mit Genitiv:
     wegen des Kindes, wegen des Krieges
c) wegen wird umgangssprachlich auch mit Dativ benutzt
   (was von überwiegend Sprachkritikern wiederkehrend kritisiert wird)
```

with a footnote to IDS grammis, *Wegen dem Regen oder wegen des Regens – Dativ oder Genitiv?*
(<https://grammis.ids-mannheim.de/fragen/67>, Bruno Strecker 2015). Same picture for `trotz`,
`während`, `statt`, `dank`, `laut`.

Note this is a property of the **preposition**, not of any verb pattern, so it belongs on the
preposition record, not on patterns.

**(2) Genitive government surviving as a high-register alternant.** en.wiktionary annotates this
directly with a qualifier inside the `+obj` argument — this is a real, machine-readable signal:

```
erinnern  → ":an(acc)/gen<q:higher register><someone/something>"
freuen    → "gen"  with sense tags ["poetic","reflexive","weak"]
```

So `sich erinnern an + Akk` (neutral) vs `sich erinnern + Gen` (*sich seiner Kindheit erinnern*,
elevated); `sich freuen + Gen` (poetic). Same family: `gedenken + Gen`, `sich schämen + Gen`,
`bedürfen + Gen`.

**(3) Regional / colloquial variation.** e.g. northern colloquial splitting of pronominal adverbs
(*"Da hab ich keine Ahnung von"*), southern `hiemit`/`hiezu`.

**(4) Genuine free variation with no register difference.** en.wiktionary encodes this with `/`:
`vertrauen` → `dat/:in(acc)`; `bereit` → `:für(acc)/:auf(acc)`. Both are equally correct.

**Recommended flagging** [Medium — design recommendation]:

```jsonc
"register": "neutral" | "gehoben" | "umgangssprachlich" | "poetisch" | "veraltet" | "fachsprachlich",
"prescriptively_contested": false,   // true only for wegen/trotz/während/dank-type disputes
"variant_of": "<pattern-id>",        // marks this as an alternant, not an independent pattern
"variant_relation": "free" | "register" | "regional",
"note_ru": "…"                       // one-line explanation shown on the card
```

Three rules that fall out of this:
* **Never make a contested or non-neutral variant the answer to a quiz question.** Quiz on
  `register: "neutral"` patterns only; show variants as passive information on the detail card.
* **`prescriptively_contested` should be rare.** It is for genuine usage disputes
  (`wegen + Dativ`), not for anything merely marked. Over-flagging teaches learners to distrust
  standard forms.
* Map en.wiktionary's `<q:…>` qualifiers and sense `tags` (`poetic`, `formal`, `colloquial`,
  `dated`, `rare`) directly onto `register` during import — that part is automatic.

---

## Recommended data strategy

### Layer 1 — Seed (automated, CC BY-SA)

1. **Primary: en.wiktionary via kaikki/wiktextract.** Stream the German verb + adjective JSONL
   (310 MB + 437 MB, never stored), keep every sense with `info_templates[].name == "+obj"`, and
   parse `args["2"]` with a proper grammar for the `:prep(case)` / `/` / `+` / `<gloss>` / `<q:…>`
   mini-language. Expected yield **~900–1 300 raw patterns** from 634 pages.
2. **Secondary: de.wiktionary wikitext.** Parse `{{K|…|Prä=X|Kas=Y}}` from the raw wikitext of the
   257 pages that use it (do **not** use kaikki's dewiktionary extract — it drops `Prä`/`Kas`).
   Then a second pass with the free-text gloss regex `mit (\w+)(?: oder (\w+))? und (Dativ|Akkusativ|Genitiv)`
   over German verb entries, which also recovers hedges like `selten Akkusativ`.
3. **Merge on `(lemma, pos, preposition, case)`.** Where both editions agree → `confidence: high`.
   Where only one has it → `confidence: medium`. Where they conflict on case → `confidence: low`,
   route to manual review.
4. **Reject list.** Drop `+obj` args with no case (`":von"`), free text in the case slot
   (`":für(acc/a predicate adjective)"`), and non-prepositional junk (`":gut/:in Ordnung"`).

### Layer 2 — Enrichment

* **Frequency & ordering: UD_German-HDT** (4.8 M tokens, CC BY-SA 4.0). Count `(lemma, prep, case)`
  over `obl` + `case` + `Case=…`. Attach a frequency rank to every pattern; this drives the
  learning path and lets you ship "top 100 / top 300" subsets. Publish counts only, not HDT text.
* **da-/wo- forms:** generate mechanically per Q3 with the 19-preposition allowlist, the vowel
  r-insertion rule, and the four suppletive genitive forms hard-coded.
* **Example sentences: Tatoeba German export** (CC BY 2.0 FR, 12 MB bz2). Regex-select candidate
  sentences per pattern, rank by length and by an unambiguous case-marked article, hand-pick 1–3.
  Keep the Tatoeba sentence ID for attribution.
* **Russian glosses:** en.wiktionary gives English glosses; Tatoeba `deu-rus_links.tsv.bz2` gives
  aligned Russian sentences. Russian *glosses* for the patterns themselves remain hand-written.
* **Nouns and adjectives:** no automated source exists. Derive noun patterns from their base verb or
  adjective (`Angst haben vor` → `die Angst vor + Dat`; `stolz auf` → `der Stolz auf + Akk`), then
  verify each by hand — this is the largest manual block, ~120–250 patterns.

### Layer 3 — Validation (human, reference-only sources)

* **E-VALBU** as the arbiter whenever the two Wiktionary editions disagree, and as the source for
  correlate obligatoriness and clause types. Read in a browser, cite per entry, import nothing.
  Also use its 451-lemma `Kprp` list as a **completeness checklist**: any of those 451 verbs absent
  from your dataset is a known gap.
* **IDS VmP-Listen A1/A2** (~72 patterns) as the CEFR-level ground truth. Every one of those must be
  present and correctly levelled before v1 ships.
* **DWDS** for a final manual check on a disputed pattern — read-only, in a browser, never scripted.
* **Corpus sanity check:** any pattern with zero occurrences in HDT is either wrong, archaic, or too
  rare to teach. Any `(verb, Wechselpräposition)` pair with high Dat/Akk entropy in the corpus is
  probably an adjunct that leaked in, or a genuine Type-A/Type-B case variant — either way, review it.

### Licensing verdict for the shipped artefact

| Component | Licence | Why |
|---|---|---|
| **Dataset JSON** | **CC-BY-SA-4.0** | forced by Wiktionary's share-alike; also compatible with UD (CC BY-SA 4.0) and with Tatoeba (CC BY 2.0 FR flows in one-way) |
| **Application code** | MIT or Apache-2.0 | separate work; share-alike does not reach it |
| **Attribution file** | required | credit en.wiktionary + de.wiktionary (with entry links), UD_German-HDT/GSD, Tatoeba (with sentence IDs), and cite Ylönen 2022 for wiktextract |

Ship an `ATTRIBUTION.md` and a `sources` field on every pattern record recording which source(s) it
came from. This costs nothing, satisfies both CC BY-SA and CC BY, makes the confidence scoring
auditable, and — since no comparable open dataset exists — makes the result something worth
publishing on its own.

**Excluded on licence grounds:** DWDS (§ 44b UrhG TDM reservation), E-VALBU/grammis (all rights
reserved, written permission required), Leipzig Wortschatz (CC BY-NC — incompatible with CC BY-SA),
Goethe-Institut word lists (Goethe-Institut copyright), `German_EO_verbs` and
`german-verbs-database` (no licence declared = no rights granted).

---

## Open questions

1. **Exact `+obj` pattern count.** 634 *pages* is measured; the ~900–1 300 *patterns* figure is an
   extrapolation from a 15-word sample. Settle it by streaming the 310 MB verb JSONL once. [Medium]
2. **Leipzig's licence was never read first-hand** — the terms page is behind Anubis. CC BY-NC comes
   from a search summary. Verify in a browser before relying on it, though the recommendation
   (do not bundle) does not change either way. [Low]
3. **Is a `(word, preposition, case)` list even copyrightable?** These are facts, and facts are not
   protected. But (a) the *selection and arrangement* may be, and (b) the EU **sui generis database
   right** protects substantial investment in a database independently of copyright. Complying with
   CC BY-SA is cheap and removes the question entirely — but if the project ever wants a permissive
   licence, this needs a real answer, not an engineer's guess.
4. **Would IDS grant permission for E-VALBU?** One email to `grammis@ids-mannheim.de`. A free
   non-commercial educational app is a plausible grant, and it would be transformative for the
   dataset — 451 curated verbs with correlates and clause types. Worth asking before hand-building
   the same thing.
5. **Correlate obligatoriness has no open source.** `warten darauf, dass…` is obligatory; for many
   verbs it is optional. Nothing open encodes this. Options: hand-annotate the top ~150 patterns, or
   mine it from corpora (ratio of `V + da-compound + dass` to `V + dass` per verb) — the latter is a
   real research task, not a weekend job.
6. **CEFR levelling beyond A2.** The IDS lists stop at A2 (~72 patterns). B1/B2/C1 levelling would
   have to be approximated from corpus frequency plus the Goethe B1 word list (which is
   Goethe-copyrighted, so usable as a private checklist but not redistributable).
7. **`schreiben an + Dativ`** and similar Type-A case alternations are attested in teaching materials
   but absent or under-specified in every open source checked. How many such patterns exist? A
   targeted sweep of Wechselpräposition patterns where a corpus shows a bimodal Dat/Akk distribution
   would find them.
8. **How much of the extracted data is actually wrong?** Sampling found ~5 % malformed `+obj` args,
   but the *semantic* error rate (wrong case, invented pattern) is unmeasured. Before shipping,
   hand-check a random sample of 100 auto-extracted patterns against E-VALBU/DWDS and report the
   accuracy. If it is below ~95 %, the whole seed needs a review pass rather than a spot check.
