# worauf

Which preposition goes with which German verb, adjective or noun — and in which case.

`warten auf` + Akkusativ. `bestehen auf` + Dativ. Same preposition, different case, and no rule
derives it: German prepositional objects lexicalise their case, so the *wo / wohin* rule you were
taught for places does not help you here. This is a reference and a trainer for exactly that.

Interface in English and Russian. **774 patterns across 635 words.** It is a static site — no
backend, no accounts, no telemetry, and no network calls at runtime: the whole dataset ships in the
bundle.

![The reference: schreiben governs an twice — Dativ for the work in progress, Akkusativ for the
addressee. Same word, same preposition, and only the case tells them
apart.](docs/screenshots/browse-light.jpg)

Words on the left, prepositions in the middle, every pattern of the selected word on the right.
Neither column ever filters — selecting only changes what is lit, because a list that reshuffles
under the cursor cannot be learned by position. Colour means grammatical case and nothing else.

![The trainer after a wrong answer: every option's case is named, and the explanation says why the
wo / wohin rule does not reach a prepositional object.](docs/screenshots/trainer-dark.jpg)

The trainer in the dark theme. Wrong options lead with **the same preposition in a different case**
(`vor die` against `vor der`) — four random prepositions would train nothing. On a miss it names the
case of every option and explains why the rule you were taught does not apply here, which is the
one place that argument is made.

## What makes it different

- The unit of data is the **pattern**, not the word — because `sich freuen auf` (looking forward to)
  and `sich freuen über` (glad about something that happened) are two different verbs that happen to
  share a stem.
- **Case is asked as its own question.** Existing tools print `warten auf + Akk` as a string and drill
  the preposition, letting the case leak out of an example sentence. Nothing drills the case itself.
- Browse in both directions: pick a word to see its prepositions, or pick a preposition to see its words.

## What works today

- **The browser.** Words and prepositions side by side, highlighting in both directions. Neither
  column ever filters — a reference that empties under your hands while you type stops being a
  reference. All of a word's patterns are shown at once, so the minimal pair is visible without a click.
- **Search** over German lemma, preposition and gloss, with umlaut folding (`ü` matches `u` *and*
  `ue`), prefix matching, and a second typo-tolerant pass that only runs when the exact pass finds
  nothing. Hand-rolled inverted index; no search library.
- **Full keyboard operation** and screen-reader announcements. Every selection is a URL, so any state
  can be linked.
- **The trainer.** Three task types, and the first wrong option is always *the same preposition in a
  different case* — the only distractor that tests anything. A wrong answer explains why the
  *wo / wohin* rule does not reach the prepositional object; that explanation is the point of the
  whole project. Methodology and its evidence: [`docs/TRAINER.md`](docs/TRAINER.md).
- **Stored progress.** Answers are kept in IndexedDB and make missed patterns likelier to come back.
  Export and import as versioned JSON, which is the only defence against "clear browsing data".
- **Offline.** A hand-written service worker, zero dependencies. Light and dark themes; mobile layout.

## What does not work, or is deliberately absent

Being specific here is cheaper than being discovered:

- **No review-debt loop, by design.** No "47 cards due today", no streak, no due dates. Stored
  history reorders what the trainer shows and nothing more. The reasoning — with the meta-analysis it
  rests on — is in [`docs/TRAINER.md`](docs/TRAINER.md) §6; the scope decision is in
  [`docs/adr/0005-srs-state-and-migration.md`](docs/adr/0005-srs-state-and-migration.md).
- **Offline covers the shell, the code and routes you have already visited.** A first-ever visit to a
  deep link with no network cannot work: the app precaches ~2 MB of code and the full dataset, but
  App Router fetches a payload per route, and there are 4884 of them (~46 MB). Precaching everything
  was measured at 337 MB and rejected.
- **The search layout on a narrow screen has never been checked by eye.** It is written to the design
  spec and it is not verified. Phase 7 is where that gets fixed.
- **The service worker's update flow can only be checked by hand** — worker bugs appear on the
  *second* visit, and jsdom has no `ServiceWorkerGlobalScope`, no `caches` and no network toggle. The
  checklist is [`docs/SERVICE_WORKER_CHECKS.md`](docs/SERVICE_WORKER_CHECKS.md), and it must be walked
  through on every worker change.
- **203 of the 774 patterns have never been verified against an external dictionary.** They are the
  project's own earliest hand-written records. Overall the two-independent-sources rule holds for
  44.5% of the dataset — the exact breakdown, and why, is in
  [`ATTRIBUTION.md`](ATTRIBUTION.md) and `docs/research/DATA_SOURCES.md`.
- **No CEFR filter.** `level` is filled only where a published source states it (~72 patterns from the
  IDS A1/A2 lists), never by intuition. Learning order comes from usage, not a scale that needs
  explaining first.
- No conjugation or declension tables, no full valency frames, no audio, no cloud sync, and no
  language pair other than German → English/Russian. `am Montag` is not government and is not here.

## Running it

Node 22 — the version is pinned in `.nvmrc`, so `nvm use` is enough.

```sh
npm install
npm run dev          # http://localhost:3000/en/
```

| Command | What it does |
|---|---|
| `npm run build` | Static export to `out/`, then generates the service worker from that build |
| `npm run build:data` | Compiles `data/de/*.yaml` into the committed runtime dataset and JSON Schema |
| `npm run data:check` | Fails if the compiled dataset has drifted from the YAML. Runs in CI |
| `npm run test:run` | Full suite — 190 tests |
| `npm run lint` / `npm run typecheck` | ESLint, then `tsc --noEmit` |

The dataset is authored by hand in `data/de/{a..z}.yaml`, grouped by lemma, and **compiled**; both
the compiled dataset and the generated schema are committed, because the diff of the compiled file
is where a changed slug becomes visible — and a changed slug is the one edit this project cannot
undo, since a static site has no server to redirect from.

Every invariant in `docs/DATA_MODEL.md` §5 runs in CI and gates deploy. A failing invariant is never
fixed by weakening the invariant. Deployment is Cloudflare Pages, triggered by a `production-*` tag
rather than by a merge ([ADR 0004](docs/adr/0004-hosting-on-cloudflare.md)).

## Documentation

| Document | What's in it |
|---|---|
| [`PLAN.md`](PLAN.md) | Phases, their status, and decisions that are not re-opened. Also the full record of how the dataset was built, pattern by pattern |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema, authoring format, data invariants |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design language, tokens, screen states |
| [`docs/TRAINER.md`](docs/TRAINER.md) | Trainer methodology, with the evidence for each decision |
| [`docs/SERVICE_WORKER_CHECKS.md`](docs/SERVICE_WORKER_CHECKS.md) | The manual checks CI cannot do |
| [`docs/adr/`](docs/adr/) | Architecture decision records |
| [`docs/research/DATA_SOURCES.md`](docs/research/DATA_SOURCES.md) | Sources, coverage, licensing — including what the plan got wrong |
| [`docs/research/PRIOR_ART.md`](docs/research/PRIOR_ART.md) | Competing tools, learner pain points |
| [`docs/research/STACK.md`](docs/research/STACK.md) | Stack evaluation and locked decisions |
| [`ATTRIBUTION.md`](ATTRIBUTION.md) | Where every `sources` value came from |

## Licence

Two licences, and the split is deliberate:

- **Application code — MIT.** [`LICENSE`](LICENSE)
- **Dataset — CC BY-SA 4.0.** [`LICENSE-DATA`](LICENSE-DATA). Covers `data/de/*.yaml`, the compiled
  `src/entities/rektion/model/dataset.generated.ts` and `schema/rektion.schema.json`. Share-alike is
  inherited from Wiktionary and is not a preference the project can relax.

Before redistributing the dataset, read [`ATTRIBUTION.md`](ATTRIBUTION.md) — in particular what it
says about Duden, which is the dataset's largest source and is not an open one.
