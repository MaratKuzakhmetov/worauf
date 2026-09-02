# worauf — Technical Stack Research

**Date:** 2026-09-02
**Scope:** Phase 0 stack decisions for a static, data-driven German *Rektion* trainer.
**Method:** All version numbers were read from the npm registry (`registry.npmjs.org`) on 2026-09-02.
All bundle sizes marked *(measured)* were produced locally with
`esbuild 0.28.2 --bundle --minify --format=esm` followed by `gzip -9`, not copied from
BundlePhobia or blog posts. Domain availability was checked via RDAP on 2026-09-02.

---

## TL;DR

1. **Framework — Vite 8 + React 19 + TypeScript 7, plain SPA, no router library.** *(Confidence: High)*
   The app is ~100% interactive, so Astro's islands and SvelteKit's SSR have nothing to save.
   The real cost is a measured **60.4 KB gz** React floor; the real benefit is that you already
   run this exact stack in `vocabulary-assistant` and can reuse the ESLint config, the Vitest
   setup and your own muscle memory. Runner-up: **SvelteKit 2 + adapter-static**.

2. **Data pipeline — hand-authored YAML, split per headword initial, validated by a Zod 4
   schema in a Node script, with a JSON Schema emitted from the same Zod source for editor
   autocomplete.** *(Confidence: High)* The observed "missed second preposition" bug is not a
   validation bug, it is a *file-layout* bug: group by **headword**, never by preposition, and
   add a duplicate/uniqueness invariant on `(headword, preposition, case)`.

3. **Search — hand-rolled normalized inverted index. No library.** *(Confidence: High)*
   A few thousand short German records do not need Fuse.js (9.6 KB gz, measured) or MiniSearch
   (5.9 KB gz, measured). Users look up words they are *reading*, so prefix + substring beats
   fuzzy. The hard part is German folding (`ü`→`u` **and** `ue`, `ß`→`ss`), which no library
   does correctly out of the box anyway. Keep **uFuzzy (4.2 KB gz, measured)** in reserve.

4. **Hosting — GitHub Pages with a custom domain, deployed by GitHub Actions.**
   *(Confidence: Medium-High)* Free and unmetered Actions minutes on public repos, no second
   account, no second dashboard. `worauf.de` is taken; **`worauf.eu` ($5.88/yr) or
   `worauf.app` ($14.93/yr) are free** and buying one removes the whole `base: '/worauf/'`
   class of bugs. Cloudflare Workers static assets is the documented escape hatch.

5. **Testing — invariant-heavy pyramid: ~45% data invariants, ~25% pure logic, ~20% component,
   ~10% Playwright.** *(Confidence: High)* In this app the dataset *is* the product, so the
   tests that pay are the ones that run over the YAML. Playwright earns its keep for exactly
   three things: deep-link restore, back/forward, and offline-after-service-worker.

---

## 1. Framework choice

### 1.1 What this app actually is

Strip away the framing and the shape is unusual: there is **no static content**. Every pixel of
the primary screen is a control — two filtered columns, a search box, case and part-of-speech
filters, a trainer. The dataset is one JSON payload loaded once. There is no per-request data,
no SEO surface worth optimizing (a Rektion table is not going to rank), no auth, no server.

This matters, because it invalidates the main selling point of three of the six candidates.
Astro's island architecture, SvelteKit's SSR and Next's RSC all exist to *avoid shipping JS for
the non-interactive parts of a page*. Here the non-interactive part is the `<header>`. When the
whole page is the island, "islands" is just a build step you pay for and don't use.

### 1.2 Measured baselines

I built a minimal stateful counter in each and bundled it (esbuild, minify, gzip -9):

| Runtime | min | **gz** | Notes |
|---|---:|---:|---|
| React 19.2.8 + react-dom/client | 194,113 | **60,393** | *(measured)* the real floor, not a marketing number |
| Preact 10.29.8 + preact/hooks | 13,240 | **5,498** | *(measured)* ~11× smaller |
| Svelte 5 (runes) | — | ~3–5 KB | vendor-reported; compiler output, scales with component count |
| SolidJS 1.9.15 | — | ~7 KB | vendor-reported runtime |

Context for that 60 KB: the dataset at a few thousand records will itself be roughly
150–400 KB raw / 40–90 KB gz. **The data will be the larger download, not the framework.**
That reframes the bundle argument — React's overhead is real but it is not the dominant term,
and it is immutably cacheable while the dataset changes.

### 1.3 Candidate-by-candidate

**Vite 8 + React 19 + TS — RECOMMENDED**
Vite 8.2.2 (Vite 8 went stable 2026-03-12) now ships **Rolldown as the default bundler for
everyone, no opt-in**, replacing the old esbuild+Rollup split; builds are reported 3–30× faster
and dev server startup ~3× faster. It is ESM-only and needs Node 20.19+/22.12+.
`@vitejs/plugin-react` 6.1.1 is current.
- *Bundle:* worst of the field at 60 KB gz. Accepted, with a documented Preact escape hatch.
- *DX for a solo dev:* best of the field **for this specific developer**, because it is the
  same stack as `vocabulary-assistant` (React 19.2.7, Zustand 5, Vitest 4, ESLint 10 flat
  config, Prettier 3, CSS Modules, TS). Zero new mental models. One ESLint config to maintain
  across two repos. CSS Modules are built into Vite with no plugin, so the Tailwind ban carries
  over for free.
- *URL state:* see §1.4 — trivially handled without a router.
- *Testing:* the strongest story. Vitest 4.1.11 + RTL 16.3.3 is a path you have already walked.
- *Longevity:* React 19.2.8 with no 19.3 or 20 announced; the least likely of the six to force
  a migration in the next three years.

**Vite + vanilla TS**
Genuinely tempting and I considered recommending it. Bidirectional filtering with dimming *is*
the kind of derived-state problem that gets ugly by hand: selecting a word must recompute which
prepositions remain enabled, which recomputes which words remain enabled, while search and two
filter facets also participate. That is a small reactive graph, and hand-writing the
invalidation is exactly where solo projects rot. **Rejected**: you would end up writing a worse
version of Svelte's reactivity by month two.

**SvelteKit 2.70.3 + adapter-static — RUNNER-UP**
Svelte 5.57.0 runes are the best fit for the derived-state problem described above
(`$derived` expresses "available prepositions given current selection" in one line), and output
is 5–10× smaller than React. `@sveltejs/adapter-static` is 3.0.10 (last published 2025-10-02,
with a 4.0.0-next.4 in flight — a mild staleness signal on an otherwise healthy project).
**Pick this instead if:** bundle size becomes a hard product requirement (e.g. you decide the
target user is on a metered mobile connection), *or* if learning a second framework is itself a
goal of the pet project. It is a legitimate choice, not a consolation prize — it loses only on
"you already know the other one."

**Astro 7.2.10 (+ React or Svelte island)**
Excellent framework, wrong shape. You would ship `client:load` on essentially the whole page,
paying Astro's build complexity and a second component-model boundary to save the JS cost of a
header. **Pick this instead if** the project grows a real content surface — grammar explainer
articles, a blog about Rektion patterns, per-preposition landing pages for SEO. That is a
plausible year-two evolution and would flip this decision.

**Next.js 16.3.4 static export**
`output: 'export'` works, but you inherit App Router semantics, RSC boundaries and a framework
whose center of gravity is a hosted runtime you have explicitly said you don't want. Highest
config-churn risk of the six. **Rejected.**

**SolidJS 1.9.15**
Technically near-ideal: ~7 KB runtime, fine-grained reactivity that suits the filtering problem,
JSX so the syntax transfers. The cost is ecosystem depth — smaller testing-library community,
fewer answers when you get stuck at 23:00 on a pet project. Note `vite-plugin-solid` is 2.11.14
with 3.0.0-next.27 pending. **Rejected on solo-dev support surface, not on merit.**

### 1.4 URL state without a router

`?w=bestehen&p=aus` needs no routing library at all. There is exactly one route.

```ts
// state <-> URL is a pure function pair — and therefore trivially unit-testable
function encode(s: BrowserState): string {
  const p = new URLSearchParams();
  if (s.word) p.set('w', s.word);
  if (s.prep) p.set('p', s.prep);
  if (s.query) p.set('q', s.query);
  return p.toString();
}
// write:  history.pushState(null, '', '?' + encode(next))
// read:   window.addEventListener('popstate', () => setState(decode(location.search)))
```

Use `pushState` for selections (should be undoable via Back) and `replaceState` for search
keystrokes (should *not* create 12 history entries for "bestehen"). This distinction is the
single most common bug in this pattern — put it in a test.

Do not add `react-router` 8.3.1, `@tanstack/react-router` 1.170.32 or `nuqs` 2.10.1. They are
all fine libraries solving a problem you do not have.

**Recommendation: Vite 8.2.2 + React 19.2.8 + TypeScript 7.0.2, CSS Modules, Zustand 5.0.15 for
the filter store, and ~40 lines of hand-written `URLSearchParams` + History API glue instead of
a router. Runner-up SvelteKit 2.70.3 + adapter-static, which I would pick instead if bundle size
became a hard requirement or if learning Svelte were an explicit goal. Confidence: High.**

> **Note on TypeScript 7.** TS 7.0 GA'd 2026-07-08 (7.0.2 current) as the Go-native compiler,
> reporting 8–12× faster full builds. Caveat: **7.0 has no stable programmatic API** (expected
> in 7.1), which matters only if you write custom codemods or AST tooling. For `tsc --noEmit` in
> CI and editor typechecking it is safe. `vocabulary-assistant` is on TS 6.0.3, so worauf on
> TS 7 also makes it your low-risk canary for upgrading the other repo.

---

## 2. Data pipeline

### 2.1 The real diagnosis of the observed bug

> *"a word getting a second preposition entry missed because the file was grouped by
> preposition, so duplicates/gaps were invisible"*

This is worth being precise about, because it determines the fix. The bug was **not** a
validation failure — no schema would have caught it, because nothing was malformed. It was a
**locality failure**: the file's grouping key (preposition) was different from the entity's
identity key (headword). All the facts about `bestehen` were scattered across `aus`, `auf` and
`in`, so no human reading any one section could see the whole verb.

There are two independent fixes and you need both:

1. **Change the grouping key to the headword.** Everything about `bestehen` lives in one
   contiguous block. A gap becomes visible by *reading*, which is the cheapest possible check.
2. **Add machine invariants** for what reading still can't catch at 3,000 records.

### 2.2 Format: YAML, split per initial

| Option | Verdict |
|---|---|
| One big JSON array | **No.** 3,000 records × ~8 fields ≈ 25k lines, no comments, quote noise, brutal diffs, and hand-editing JSON invites trailing-comma breakage. |
| TSV/CSV | **No.** Example sentences contain commas and quotes; nested/optional fields (da-/wo- forms, multiple glosses) don't fit a flat grid. `papaparse` 5.7.0 exists but the shape is wrong. |
| **YAML, `data/de/a.yaml` … `z.yaml`** | **Yes.** Comments (invaluable for "why is this dative here?"), no quoting noise, block scalars for examples, small diffs, and the file split *mechanically enforces* headword grouping. |
| JSONL | Decent runner-up — one record per line, great diffs, greppable — but no comments and worse for multi-line examples. |

Split on the **folded** initial (`üben` → `u.yaml`, not a separate `ü.yaml`) so the mapping is
total and unambiguous. Add a CI check that each record lives in the file its headword implies —
that catches copy-paste-into-the-wrong-file, which is the natural successor bug to the one you
already hit.

At build time, `tsx` (4.23.13) reads the YAML with `yaml` 2.9.0, validates, sorts, and emits one
optimized `data.json` (plus, later, a prebuilt search index). **The authoring format and the
shipped format are deliberately different.** Ship compact; author comfortably.

### 2.3 Validation: Zod 4 as the single source of truth

Use **Zod 4.5.4** in a Node build script — *not* JSON Schema + ajv, and not "typed at build time"
alone.

The decisive argument is that Zod's bundle size, normally its weak spot, is **completely
irrelevant here**: the schema never reaches the browser. It runs in `tsx` at build time and in
Vitest. That removes the only reason to prefer Valibot 1.4.2 or ajv 8.20.0.

What you get from one Zod schema:

- `z.infer<typeof Entry>` gives the app's TypeScript types — **no hand-maintained duplicate
  interface that can silently drift from the data**.
- The same schema imports directly into Vitest for data tests.
- `z.toJSONSchema()` (Zod 4) emits a JSON Schema you write to `schema/entry.schema.json`, which
  you then wire into the YAML files for **editor autocomplete and inline errors while authoring**:

```yaml
# yaml-language-server: $schema=../../schema/entry.schema.json
- headword: bestehen
  reflexive: false
  pos: verb
  preposition: aus
  case: dative
  gloss: { ru: "состоять из" }
  example: "Das Team besteht aus fünf Personen."
```

That last point is the highest-leverage item in this whole section. A schema that catches errors
*as you type them* is worth more than a schema that catches them in CI ten minutes later, and
this setup gives you both from one definition. ajv would give you the editor half but cost you
the TypeScript half.

### 2.4 The invariant suite

These run as Vitest tests over the parsed dataset, so `npm test` and CI enforce them identically.
Ordered by expected catch rate:

| # | Invariant | Catches |
|---|---|---|
| 1 | `(headword, reflexive, preposition, case)` is unique | Exact duplicates from copy-paste |
| 2 | `(headword, preposition)` appearing twice with **different** cases must be explicitly flagged `ambiguous: true` | The real linguistic case (`warten auf` +Akk only, vs. two-case prepositions) vs. a genuine data error — forces a decision instead of silence |
| 3 | Every `preposition` exists in the canonical preposition table | Typos (`aus`/`auß`), invented prepositions |
| 4 | `case` is present and ∈ {akkusativ, dativ, genitiv} | The original class of gap |
| 5 | Two-way preposition (`an, auf, in, über, unter, vor, hinter, neben, zwischen`) **must** have an explicit `case` — never inherited or defaulted | Silent wrong-case bugs, the highest-severity error type for a *learning* app |
| 6 | `example` contains the headword (fuzzily — allow inflection via stem match) **and** contains the preposition as a whole word | Mismatched example sentences, the most embarrassing user-visible error |
| 7 | `example` sentence ends in terminal punctuation and starts uppercase | Truncated paste |
| 8 | Every entry has a non-empty `gloss.ru` | Gaps |
| 9 | da-/wo- forms: consistent and derivable. `aus` → `daraus`/`woraus`; consonant-initial → `damit`/`womit`; vowel-initial → insert `r`. Assert the stored form equals the derived form, or is explicitly marked as an exception | Inconsistent generation — and the project is *named* after `worauf`, so these must be right |
| 10 | Prepositions that do **not** form da-/wo- compounds (`ohne`, `außer`, plus all genitive ones) must not carry them | Over-generation |
| 11 | Every record lives in the file matching its folded initial | Wrong-file edits |
| 12 | File is sorted by `(headword, preposition)`; CI fails if `--fix` would change it | Ordering drift, noisy diffs |
| 13 | Coverage report (warning, not failure): headwords with only one preposition where a known-multi-preposition list says otherwise | **The exact original bug, as an ongoing tripwire** |
| 14 | Reflexive verbs store `headword: freuen` + `reflexive: true`, never `headword: "sich freuen"` | Breaks sort order and search (see §3.5) |

Invariants 5, 6 and 13 are the ones specific to *this* project's failure modes. 13 is the direct
regression test for the bug you already hit.

Add a `scripts/data:fix` companion that auto-sorts and auto-derives da-/wo- forms, so the
invariants are cheap to satisfy rather than annoying.

Lint the code with **ESLint 10.9.1** flat config + `typescript-eslint` 8.69.0 + Prettier 3.9.6
(matching `vocabulary-assistant`). Do not switch to `oxlint` 1.81.0 or Biome 2.5.11 — both are
excellent and much faster, but consistency with the other repo is worth more than milliseconds
on a project this size.

**Recommendation: author in YAML split per folded initial under `data/de/`, one contiguous block
per headword; validate with a Zod 4.5.4 schema in a `tsx` build script; emit JSON Schema from
that same Zod source via `z.toJSONSchema()` and reference it with a `# yaml-language-server:`
comment for authoring-time autocomplete; enforce the 14 invariants above as Vitest tests in CI.
Confidence: High.**

---

## 3. Search

### 3.1 Sizes (measured 2026-09-02)

| Library | Version | min | **gz** |
|---|---|---:|---:|
| **Hand-rolled index** | — | ~1,500 | **~700** |
| `@leeoniya/ufuzzy` | 1.0.19 | 8,876 | **4,183** |
| `minisearch` | 7.2.0 | 17,660 | **5,894** |
| `fuse.js` (basic) | 7.5.0 | 20,443 | **7,905** |
| `fuse.js` (full) | 7.5.0 | 26,530 | **9,561** |

*(All measured locally with esbuild + gzip -9; the widely-quoted "24.2 KB / 29.1 KB" figures for
Fuse and MiniSearch are unminified.)*

### 3.2 Why hand-rolled wins here

Not primarily because of size — 6 KB is affordable. Three stronger reasons:

1. **Fuzzy matching is wrong for this app.** The user is typically *reading* a German text and
   looking up a word they can see. They know the spelling; they may not know how to type `ü`.
   That is a **normalization** problem, not a typo-tolerance problem. Fuse's fuzzy scoring on a
   3,000-word German corpus will surface `bestehen` for a query of `beste` — fine — but also
   `entstehen`, `verstehen` and `gestehen` for `bestehn`, which is noise in a reference tool.
2. **You must write the folding layer anyway.** No library handles `ue`↔`ü` expansion (§3.4).
   uFuzzy ships `latinize()` and MiniSearch takes a `processTerm`, but the German-specific rules
   are yours to write either way. Once you've written the hard part, the remaining index is
   ~40 lines.
3. **Scale is trivially small.** A few thousand records × ~30 chars. A `Map<string, Set<id>>`
   over folded 1–3-grams is sub-millisecond and costs a few hundred KB of heap. uFuzzy's own
   benchmarks show it beating Fuse by ~78× and MiniSearch by ~3×, but at n=3,000 all three are
   already imperceptible. Performance is not the deciding axis.

Keep **uFuzzy 1.0.19 (4.2 KB gz)** as the documented upgrade path if real usage shows people
typing genuine typos. It is the right library for that job: no index to build (<1 ms startup),
smallest of the three, and `latinize()` composes with your own folder. Note its constraint:
**all searches are case-insensitive, with no case-sensitive mode** — irrelevant here, but worth
knowing before you commit.

MiniSearch's advantage — BM25 relevance ranking across multiple fields — would matter if you
were searching example sentences too. If that becomes a feature, revisit. MiniSearch 7.2.0 was
last published 2025-09-16, so it's stable rather than actively evolving.

### 3.3 The folding function

Order matters, and the ß case is the trap:

```ts
export function fold(s: string): string {
  return s
    .toLowerCase()          // MUST be first: 'ß'.toUpperCase() === 'SS', so folding
                            // before lowercasing breaks round-tripping on 'STRASSE'
    .replace(/ß/g, 'ss')
    .normalize('NFD')       // decompose ü -> u + U+0308
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]/g, '');
}
// fold('üben')    === 'uben'
// fold('für')     === 'fur'
// fold('Straße')  === 'strasse'
// fold('STRASSE') === 'strasse'   <- both spellings converge. This is the win.
```

### 3.4 The `ue` problem — index two variants, not one

`fold()` alone does **not** satisfy the requirement. A German keyboard-less user types `ueben`,
not `uben`. Both must find `üben`. The clean solution is to index each headword under **two**
folded keys:

```ts
const EXPAND: Record<string, string> = {
  'ä':'ae', 'ö':'oe', 'ü':'ue', 'ß':'ss',
};
function foldExpanded(s: string): string {
  return s.toLowerCase().replace(/[äöüß]/g, c => EXPAND[c]).replace(/[^a-z0-9 ]/g, '');
}
// üben     -> fold: 'uben'     | foldExpanded: 'ueben'
// Straße   -> fold: 'strasse'  | foldExpanded: 'strasse'   (identical, dedupe)
```

Index both; dedupe when equal. Queries are folded with `fold()` **and** matched against both key
sets. This covers all three stated cases (`uben`, `ueben`, `üben`) plus `strasse`/`straße`, at a
cost of roughly 1.4× index size — negligible at this scale.

### 3.5 `sich`, sorting, and display

Three separate concerns that must not be conflated:

- **Storage:** `{ headword: 'freuen', reflexive: true }`. Never `headword: "sich freuen"`.
  Invariant #14 enforces this.
- **Sorting:** sort on `headword`, so `freuen` sits between `frei` and `fressen` where a learner
  will look for it — not in a lump of ~200 verbs under `s`. This is the concrete failure the
  requirement is warning about.
- **Search:** index the headword. Additionally accept a query of `sich freuen` by stripping a
  leading `sich ` from the query before folding. Cheap, and matches how people type.
- **Display:** render `sich freuen`, because that is the citation form a learner needs to
  memorize. Presentation concern only.

For alphabetical ordering use `new Intl.Collator('de', { sensitivity: 'base' })`, which
implements DIN 5007-1 (ä sorts as a, ß as ss) — correct for a dictionary. Do **not** use
`de-DE-u-co-phonebk` (DIN 5007-2, ä as ae); that is phone-book order and would surprise learners.

Note the deliberate asymmetry: **search folds `ü` to both `u` and `ue`; sort folds `ü` to `u`
only.** Two different jobs, two different functions. Test both.

**Recommendation: hand-rolled inverted index over dual-folded (`fold` + `foldExpanded`) keys,
~60 lines, zero dependencies, ~0.7 KB gz. Sort with `Intl.Collator('de', {sensitivity:'base'})`.
Store `sich` as a `reflexive` boolean, never in the headword. Adopt uFuzzy 1.0.19 (4.2 KB gz)
only if real usage shows genuine typo tolerance is needed. Confidence: High.**

---

## 4. Hosting and delivery

### 4.1 Free tiers, 2026

| | **GitHub Pages** | **Cloudflare** (Workers static assets) | **Netlify** | **Vercel** (Hobby) |
|---|---|---|---|---|
| Bandwidth | 100 GB/mo *soft* | **Unlimited** (static requests unmetered) | 100 GB/mo | 100 GB/mo |
| Site size | 1 GB published, 1 GB repo (rec.) | 20,000 assets/version (free plan), 25 MiB/file | — | — |
| Builds | 10/hr *soft* — **does not apply when using a custom Actions workflow** | 500 builds/mo, 20 min timeout, 1 concurrent | 300 credits/mo (~15/deploy) | — |
| CI minutes | **Free & unmetered on public repos** | — (or use Actions) | — | — |
| Custom domain | Yes, free, auto Let's Encrypt TLS | Yes, 100 per project | Yes | Yes |
| Commercial use | **Prohibited** for sites "primarily directed at facilitating commercial transactions" or SaaS | Allowed | Allowed | **Prohibited** on Hobby |
| Deploy timeout | 10 min | 20 min | — | — |

Two clarifications that matter:

- **GitHub Pages' "no commercial use" does not affect worauf.** The ToS prohibits running an
  online business, e-commerce, or commercial SaaS. A free, ad-free language-learning pet project
  is squarely within intended use. This is worth stating explicitly because the restriction is
  frequently misquoted as "no commercial *organizations*."
- **Cloudflare Pages is in maintenance, not deprecation.** Pages features are being absorbed
  into Workers; Cloudflare's own guidance is now *"Now that Workers supports both serving static
  assets and server-side rendering, you should start with Workers."* So the honest Cloudflare
  option in 2026 is **Workers with static assets**, not Pages — do not start a new project on
  Pages.

### 4.2 The recommendation, and the argument against it

**Choose GitHub Pages.** For a solo pet project explicitly framed as "not running
infrastructure," it has the lowest total surface: the repo is already on GitHub, Actions are free
and unmetered on public repos, there is no second account, no second dashboard, no API token to
rotate, and no `wrangler.toml` to maintain. Every limit in the table is 2–3 orders of magnitude
beyond what this app will ever use.

The honest case against: Cloudflare has genuinely unlimited bandwidth, a better global POP
footprint (relevant if your users are in Russia or Central Asia, which the RU glosses suggest),
and is where new features are landing. If you buy the domain through Cloudflare Registrar you
will have the account anyway, and `wrangler deploy` from Actions is ~10 lines.

That is a real argument, and it is why this is **Medium-High** confidence rather than High. But
it is a one-hour migration you can make later with zero lock-in — the build output is identical
static files. Do not pre-pay that cost now.

### 4.3 Domain: buy one, and buy it before Phase 0

RDAP check, 2026-09-02:

| Domain | Status | Porkbun price/yr |
|---|---|---|
| `worauf.de` | **REGISTERED** | (.de reg $5.49 / renew $4.07) |
| `worauf.com` | Available | $11.08 |
| **`worauf.app`** | **Available** | **$14.93** |
| **`worauf.eu`** | **Available** | **$5.88** |
| `worauf.dev` | Available | $12.87 |
| `worauf.io` / `.net` / `.org` / `.info` | Available | — |

`worauf.de` is gone, but the good ones are open. **`worauf.app`** is the aptest — and `.app` is
HSTS-preloaded, so HTTPS is enforced at the browser level with no configuration.
**`worauf.eu`** at $5.88 is the value pick.

This is not cosmetic. A custom domain serves the site at **root**, which means `base: '/'` in
Vite config. Deploying to `MaratKuzakhmetov.github.io/worauf/` forces `base: '/worauf/'`, and
that base path leaks into the service worker scope, the manifest `start_url`, every asset URL and
your `pushState` calls — a persistent, low-grade source of "works locally, breaks in prod" bugs.
**$6–15/yr to delete an entire bug class is the best-value line item in this document.**

### 4.4 Deploy workflow shape

Single workflow, `.github/workflows/deploy.yml`, using the official Pages Actions (no
`gh-pages` branch, no `peaceiris/actions-gh-pages`):

```
on: push to main  +  workflow_dispatch
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }

job build:
  - actions/checkout
  - actions/setup-node  (node 22, cache: npm)
  - npm ci
  - npm run lint
  - npm run typecheck          # tsc --noEmit
  - npm run test:data          # <- invariants gate the deploy
  - npm run test:run
  - npm run build              # tsx data build + vite build
  - actions/configure-pages
  - actions/upload-pages-artifact  (path: dist)

job deploy:
  needs: build
  environment: github-pages
  - actions/deploy-pages
```

Two deliberate choices:

- **Data invariants gate the deploy.** A bad `case` field must never reach a learner. This is the
  single most valuable line in the workflow.
- **A separate `pr.yml`** runs lint + typecheck + tests on pull requests without deploying, so
  you can use PRs for data edits and get the invariant check before merge.

Add `CNAME` to `public/` so Vite copies it into `dist/` on every build — otherwise the custom
domain setting is silently wiped on each deploy. This is the classic Pages+Actions footgun.

**Recommendation: GitHub Pages, deployed by a single GitHub Actions workflow using
`actions/upload-pages-artifact` + `actions/deploy-pages`, with data invariants as a required
gate. Buy `worauf.app` ($14.93/yr) or `worauf.eu` ($5.88/yr) and serve at root with `base: '/'`.
Documented escape hatch: Cloudflare Workers static assets via `wrangler` 4.128.0 — a one-hour
migration if bandwidth or geography ever demands it. Confidence: Medium-High.**

---

## 5. Offline / PWA

### 5.1 Is it worth it?

**Yes — this is close to the ideal PWA case, but do it in Phase 2, not Phase 0.**

The argument for is unusually strong. Consider when a Rektion lookup actually happens: on a
commute, in a classroom, in a café, on a phone with flaky reception, mid-sentence while writing
German. Those are precisely offline-ish moments. And the app is *architecturally* trivial to make
offline: a fixed set of hashed static assets plus one immutable JSON dataset. There is no
mutable server state to reconcile, no sync conflicts, no auth token to refresh. Precaching
everything is not a compromise — it is a complete solution.

The secondary win: installability. A home-screen icon changes a reference tool from "a site I'd
have to remember to visit" into "a thing on my phone," which materially affects whether a
learning habit forms.

### 5.2 Minimal setup

`vite-plugin-pwa` 1.3.0 (Workbox 7.4.1) with the default `generateSW` strategy, which requires
**zero hand-written service worker code**:

```ts
VitePWA({
  registerType: 'prompt',           // see below
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: { name: 'worauf', short_name: 'worauf', theme_color: '#…',
              start_url: '/', display: 'standalone', icons: [...] },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],  // include the dataset
    cleanupOutdatedCaches: true,
  },
})
```

That is genuinely the whole thing: ~15 lines, one dependency, no `sw.ts` to maintain. Avoid
`injectManifest` — it hands you a service worker file to write and debug, and you need none of
that flexibility.

### 5.3 The actual cost

The complexity is not in the setup, it is in **the update trap**, and it has a specific failure
mode for this app: you fix a wrong case in the dataset, deploy, and a returning user keeps seeing
the wrong answer because their service worker is still serving the precached old JSON. For a
*learning* app, silently serving stale wrong data is worse than being offline.

Mitigations, in order of importance:

1. Use `registerType: 'prompt'` with a visible "New version available — Reload" toast. This is
   ~20 lines with the `virtual:pwa-register` helper and makes updates explicit rather than
   mysterious. (`autoUpdate` is acceptable only if paired with a reload prompt.)
2. Stamp a `dataVersion` (git SHA or dataset hash) into the build and display it in an About
   panel, so a stale client is diagnosable in one screenshot.
3. Set `cleanupOutdatedCaches: true` (above) so old precaches are reaped.
4. Always test the *second* visit. Almost every PWA bug is invisible on first load.

Also note: the service worker scope is tied to the base path, which is the fourth good reason to
buy the domain (§4.3).

**Recommendation: yes, add a PWA — but in Phase 2, after the browser and trainer work.
`vite-plugin-pwa` 1.3.0, `generateSW` strategy, `registerType: 'prompt'` with a reload toast,
dataset included in `globPatterns`, `cleanupOutdatedCaches: true`. Budget half a day including
the update-prompt UI. Confidence: High (that it's worth it); Medium (on timing — defer it).**

---

## 6. Local persistence for SRS

### 6.1 Sizing the problem first

An SM-2 record is roughly `{ id, due, interval, easeFactor, repetitions, lapses }` ≈ 80–120 bytes
of JSON. At 3,000 items that is **~300 KB**, and realistically far less because only *reviewed*
items need records — a user who has studied 400 cards stores ~40 KB.

This is small. Every option below can technically hold it. So choose on ergonomics and failure
modes, not capacity.

### 6.2 The three options

**localStorage** — ~5 MB origin quota, synchronous, string-only.
It would work, and for an MVP it is defensible. The problems are real but graded: every write is
a synchronous main-thread `JSON.stringify` of the whole blob, which at 300 KB is a few ms of jank
on *every card review* — precisely the interaction that must feel instant. The 5 MB quota is also
shared with everything else on the origin, and it is the first thing browsers evict under storage
pressure. **Acceptable fallback, not the target.**

**IndexedDB — RECOMMENDED.** Asynchronous (no main-thread jank), quota in the hundreds of MB to
GB, survives eviction better, and structured. The usual objection is that the raw API is
unpleasant — solved by **`idb-keyval` 6.3.0 at a measured 748 bytes gz**:

```ts
import { get, set } from 'idb-keyval';
await set('srs-v1', { version: 1, updatedAt: Date.now(), cards });
const state = await get('srs-v1');
```

Store the whole progress object under one key, debounced ~500 ms after a review. You get async
writes and headroom for ~750 bytes. If you later want per-review history (which FSRS optimization
would want), promote to a real object store — or `dexie` 4.4.5 — without changing storage
engines. Do not reach for Dexie now; `idb-keyval` is the right size for the problem.

**Origin Private File System** — **No.** OPFS is designed for large binary files and
high-throughput writes (SQLite in the browser, video editing). It offers no indexing or querying,
the synchronous access handles require a Web Worker, and it is *more* opaque to debug than
IndexedDB. Using it for 40 KB of JSON is strictly worse on every axis. Rejected without
reservation.

### 6.3 Export/import — the part that actually matters

All three options share one fatal property: **"Clear browsing data" destroys everything, with no
warning and no recovery.** For a user who has built six months of review history, that is the
worst possible outcome, and it is not a hypothetical — it is a routine thing people do. This
section is more important than the storage-engine choice.

Design for it explicitly:

- **Export:** a versioned `worauf-progress-YYYY-MM-DD.json` containing
  `{ schemaVersion, exportedAt, appVersion, cards }`. Generate with `Blob` +
  `URL.createObjectURL` + a click on `<a download>`.
- **Import:** `<input type="file">`, validate with the **same Zod schema** used for the data
  pipeline (§2.3 — reuse pays off again), then merge rather than replace: for each card id keep
  the record with the later `updatedAt`. Merge-not-replace makes the export file usable for
  moving between phone and laptop, not just for disaster recovery.
- **Prompt for it.** A backup button nobody clicks is not a backup. Surface a gentle "you have
  N reviews unbacked-up — export?" after a threshold (e.g. 100 reviews or 30 days).
- **Call `navigator.storage.persist()`** on first review. It asks the browser not to evict under
  storage pressure and is granted silently in many cases. Three lines, meaningful protection.

### 6.4 A note on the algorithm

The brief specifies SM-2. Worth knowing before you implement it: **FSRS is now the better default
choice** — it schedules 20–30% fewer reviews for the same retention and has been Anki's
recommended default since late 2023. `ts-fsrs` 5.4.2 (published 2026-09-01, actively maintained)
is a measured **7.2 KB gz**.

You don't have to decide now, but you *do* have to decide the schema now. **Design the review
record to carry FSRS fields (`stability`, `difficulty`, `lastReview`) even if you populate only
SM-2 fields at first** — plus keep a raw `reviews: [{ ts, rating }]` log. That log is the
migration path: with it you can switch to FSRS later and replay history to seed the model.
Without it, switching means every user restarts from zero.

**Recommendation: IndexedDB via `idb-keyval` 6.3.0 (748 bytes gz), single debounced key, plus
`navigator.storage.persist()`. Versioned JSON export/import validated by the shared Zod schema,
merging on `updatedAt`, with a proactive backup prompt. Keep a raw review log and FSRS-shaped
fields in the schema from day one so `ts-fsrs` 5.4.2 remains a drop-in later. Skip OPFS entirely.
Confidence: High.**

---

## 7. Testing strategy

### 7.1 The governing principle

In most apps the code is the product and tests defend the code. **Here the dataset is the
product.** A React re-render bug is annoying; a wrong case on `warten auf` teaches a learner
something false and they will repeat it for years. The test budget should follow that asymmetry,
which is why this pyramid is unusually bottom-heavy on data.

### 7.2 The pyramid

| Layer | Share | Runner | What goes here |
|---|---:|---|---|
| **Data invariants** | **~45%** | Vitest, Node env | The 14 checks in §2.4. Fast, no DOM, run over the parsed YAML. These are also *content* tests — they grow as the dataset grows. |
| **Pure logic** | **~25%** | Vitest, Node env | `fold()`/`foldExpanded()` tables; search ranking; `encode`/`decode` URL round-trip; distractor selection; SM-2/FSRS scheduling arithmetic; da-/wo- derivation. |
| **Component** | **~20%** | Vitest + RTL 16.3.3 + jsdom 30.0.1 (or happy-dom 20.13.1) | Bidirectional filter behaviour; dimming; keyboard nav; `aria-disabled` and `aria-selected` states; trainer answer flow. |
| **E2E** | **~10%** | Playwright 1.62.1 | 3–5 journeys only. See §7.4. |

### 7.3 Specific high-value tests

**Search normalization — table-driven, one assertion per row.** This is where a single table of
~30 pairs buys enormous confidence:
`üben/uben/ueben/Üben → üben`; `für/fur/fuer`; `Straße/strasse/STRASSE/straße`;
`sich freuen → freuen`; `freuen → sich freuen` displayed. Cheap to write, catches the regressions
most likely to occur when you touch folding.

**URL round-trip — property-style.** Generate the cross-product of plausible states (word set ×
prep set × query set × case × pos, sampled) and assert `decode(encode(s))` deep-equals `s`. One
loop, ~200 cases, catches encoding bugs with umlauts in `?w=` that a handful of examples will
miss. Also assert the `pushState` vs `replaceState` policy from §1.4 explicitly — that one is
invisible to every other kind of test.

**Trainer distractor selection — the most under-tested and highest-risk logic in the app.**
Distractors must be *plausible but wrong*, and the failure modes are subtle:
- the correct answer must be present exactly once;
- no distractor may be an alternative correct answer for the same headword (`bestehen aus` vs
  `bestehen auf` — if the verb genuinely takes both, one cannot be a distractor for the other);
- distractors should be drawn from the same case pool when possible, so the question tests
  Rektion rather than being solvable by elimination;
- with a seeded RNG the whole thing is deterministic and trivially assertable.
Seed the RNG. Non-deterministic distractor tests are worse than none.

**Component tests — behaviour, not markup.** "Selecting `bestehen` leaves `aus`, `auf`, `in`
enabled and dims the rest" is a durable test. "The div has class `x`" is not.

### 7.4 Does Playwright earn its keep?

**Yes — but capped at 3–5 tests, and for a specific reason.** The instinct to skip E2E on a solo
pet project is usually right; here it isn't, because three of this app's core requirements are
*only* observable in a real browser:

1. **Deep link:** navigating directly to `/?w=bestehen&p=aus` renders the correct selected state.
2. **Back/forward:** select → search → select, then Back twice, and assert the state unwinds
   correctly. jsdom's History implementation is not a faithful enough model to trust here.
3. **Offline:** load, go offline (`context.setOffline(true)`), reload, assert the app still
   works. **This is untestable at any other layer**, and it is the entire justification for the
   PWA work in §5. Without this test, the service worker is unverified in perpetuity.
4. *(optional)* Trainer happy path: answer three questions, assert score.
5. *(optional)* Install `@axe-core/playwright` 4.13.0 and run one automated a11y sweep per page.

Five tests, maybe 200 lines, running in ~30 seconds on free unmetered public-repo Actions. That
is a good trade. The failure mode to avoid is letting the E2E suite grow — every test you add
past ~8 buys less and costs more, and a slow flaky suite on a pet project simply gets disabled.

Vitest 4.1.11's **Browser Mode is now stable** (with provider packages —
`@vitest/browser-playwright` 4.1.11 — plus visual regression testing). It is a plausible
alternative to jsdom for the component layer. Recommendation: **stay on jsdom for now.** It is
what `vocabulary-assistant` uses, it is faster, and Browser Mode's real payoff (visual regression)
matters more for a design system than for this app. Revisit if jsdom's gaps start biting.

### 7.5 What not to test

No snapshot tests (they rot and get blindly updated). No coverage threshold gate — measure with
`@vitest/coverage-v8` 4.1.11 for information, don't fail CI on a number, since chasing a
percentage on a pet project produces tests that assert nothing. No tests for Zustand store
internals; test through the components that use them.

**Recommendation: Vitest 4.1.11 + RTL 16.3.3 + jsdom 30.0.1, at roughly 45% data invariants /
25% pure logic / 20% component / 10% E2E. Playwright 1.62.1 capped at 3–5 tests, justified
primarily by offline verification and real History-API back/forward. Seed the RNG for distractor
tests. No snapshots, no coverage gate. Confidence: High.**

---

## 8. Accessibility and i18n

### 8.1 Keyboard navigation for the two-column browser

Model each column as a **listbox** (`role="listbox"` with `aria-label`, children `role="option"`
with `aria-selected`), using **roving tabindex**: exactly one option in each column carries
`tabindex="0"`, all others `tabindex="-1"`.

That gives the behaviour keyboard users expect, per the W3C APG Listbox pattern:
`Tab` moves *between* columns (2 stops, not 3,000); `↑`/`↓` move within a column;
`Home`/`End` jump to the ends; `Enter`/`Space` select; **typeahead** — typing `bes` jumps to
`bestehen`, using the folded form so typing `ub` reaches `üben`.

Add `Escape` to clear the current column's selection, and make sure focus is *managed* — when
filtering removes the focused option from view, move focus deliberately rather than letting the
browser drop it to `<body>`, which is the most common a11y regression in filtered lists.

One caveat worth flagging: a listbox is formally a *selection* widget, and your columns are
closer to a bidirectional facet filter. The listbox pattern is still the best available fit and
the one screen-reader users will recognize, but if the interaction drifts further from
"select one," reconsider a group of toggle buttons (`aria-pressed`) inside a labelled
`role="group"`.

### 8.2 Dimmed / unavailable options: `aria-disabled`, and keep them in the DOM

**Use `aria-disabled="true"` and leave the option in the list.** Do not remove it, and do not use
the HTML `disabled` attribute.

The reasoning is specific to this app rather than generic:

- **The dimming *is* the information.** The whole pedagogical point of showing `bestehen` next to
  a dimmed `mit` is: *this preposition exists, but not with this verb.* Removing it destroys the
  lesson. A sighted user gets that for free from the dimming; a screen-reader user gets it only
  if the option is still announced, as disabled.
- **List stability.** Removing options makes the list length change under the screen-reader
  cursor on every keystroke, destroying both spatial memory and the "3 of 47" position
  announcement. Dimming keeps the list stable and the mental map intact.
- **`aria-disabled` vs `disabled`:** the HTML `disabled` attribute removes the element from the
  tab order and, in some screen readers, from the virtual buffer entirely — the option becomes
  imperceptible, which is exactly the outcome to avoid. `aria-disabled` keeps it focusable and
  announced while communicating unavailability. (This is the standard ARIA guidance for options
  that should stay perceivable.)

Pair it with a **polite live region** announcing the result of each filter change:
`aria-live="polite"` on a visually-hidden element rendering
"47 words, 9 prepositions available" (debounced ~300 ms so typing doesn't flood the queue).
Without this, a screen-reader user filtering the list has no feedback that anything happened.

If a column ever becomes *entirely* dimmed, say so explicitly ("no prepositions available for
this combination — clear a filter") rather than leaving a silently grey list.

### 8.3 i18n: Russian-only now, structured for RU/EN/DE

**Ship RU-only. Do not install an i18n library. But make three structural choices now**, all of
which are free today and expensive to retrofit:

1. **No hardcoded strings in components.** One `src/ui/ru.ts` exporting a flat object, accessed
   through a `t('browser.noResults')` helper typed as `keyof typeof ru`. This costs nothing today
   and means adding English is "write a second file," not "audit 40 components." TypeScript will
   then tell you exactly which keys the new locale is missing — a compile-time translation
   completeness check, for free.
2. **Separate UI language from content language in the data schema.** `gloss` should be
   `{ ru: string; en?: string }`, not a bare `gloss: string`. Retrofitting this means touching
   every record in the dataset — do it before there are 3,000 of them. This is the single most
   important item in this section, because it is the one with a growing cost.
3. **Mark German text with `lang="de"`.** Set `<html lang="ru">` for the UI, and put `lang="de"`
   on every German word and example sentence. Screen readers switch pronunciation voice on this
   attribute — without it, a Russian-configured screen reader will read `Das Team besteht aus
   fünf Personen` with Russian phonetics, which is useless in a *pronunciation-adjacent language
   learning app*. This is nearly free and disproportionately valuable here.

Skip `react-i18next` and friends entirely: you have one locale, no pluralization complexity worth
a library, and no translator workflow. A typed object and a `t()` function is ~10 lines and
covers the realistic ceiling of this project.

Also consider — DE as a UI language is the least likely of the three to be needed (a German
speaker doesn't need a German Rektion trainer with Russian glosses), so plan for **RU + EN** and
treat DE as content-only.

**Recommendation: roving-tabindex listbox per column with typeahead over folded text and
`Tab` between columns; `aria-disabled="true"` on dimmed options, kept in the DOM, with a
debounced `aria-live="polite"` count announcement; RU-only UI shipped from a single typed
`ru.ts` string table, with `gloss: { ru, en? }` in the data schema from day one and `lang="de"`
on all German text. Confidence: High on the a11y mechanics; Medium on skipping an i18n library
(revisit if EN ships and pluralization gets messy).**

---

## Decisions to lock before Phase 0

| # | Decision | Choice | Confidence | What would change it |
|---|---|---|---|---|
| 1 | Framework | Vite 8.2.2 + React 19.2.8 + TS 7.0.2, SPA | **High** | A hard bundle-size requirement (→ SvelteKit or Preact/compat), or the app growing a real content/SEO surface (→ Astro 7) |
| 2 | Styling | CSS Modules (built into Vite, no plugin) | **High** | Nothing realistic; matches `vocabulary-assistant`'s Tailwind ban |
| 3 | State | Zustand 5.0.15 for filter state | **Medium-High** | If the derived-state graph stays as small as it looks, `useReducer` + `useMemo` would do — drop Zustand if it's carrying <3 slices |
| 4 | Routing / URL state | None. `URLSearchParams` + History API, ~40 LOC | **High** | A second real route (e.g. an articles section) would justify a router |
| 5 | Authoring format | YAML, `data/de/{a..z}.yaml`, grouped by **headword** | **High** | If per-letter files get unwieldy, split by part-of-speech instead — but never by preposition |
| 6 | Validation | Zod 4.5.4 in a `tsx` build script; JSON Schema emitted via `z.toJSONSchema()` for editor autocomplete | **High** | Only if you needed browser-side validation (you don't) |
| 7 | Data invariants | The 14 checks in §2.4, as Vitest tests, gating deploy | **High** | Nothing — this is the core risk control for a correctness-critical dataset |
| 8 | Search | Hand-rolled dual-folded inverted index (~0.7 KB gz) | **High** | Real evidence of users making genuine typos → uFuzzy 1.0.19 (4.2 KB gz). Searching example sentences → MiniSearch 7.2.0 |
| 9 | Sorting | `Intl.Collator('de', { sensitivity: 'base' })` (DIN 5007-1) | **High** | Nothing; phone-book order would be wrong for a dictionary |
| 10 | Hosting | GitHub Pages + Actions (`upload-pages-artifact` / `deploy-pages`) | **Medium-High** | Bandwidth or Russian/Central-Asian latency concerns → Cloudflare Workers static assets (`wrangler` 4.128.0), ~1 hour to migrate |
| 11 | Domain | Buy `worauf.app` ($14.93/yr) or `worauf.eu` ($5.88/yr); serve at root with `base: '/'` | **High** | Only budget. `worauf.de` is already registered |
| 12 | PWA | `vite-plugin-pwa` 1.3.0, `generateSW`, `registerType: 'prompt'` — **Phase 2** | **High** (worth it) / **Medium** (timing) | Ship it earlier if you start using the app on your own commute before Phase 2 lands |
| 13 | Persistence | IndexedDB via `idb-keyval` 6.3.0 + `navigator.storage.persist()` | **High** | Per-review history queries at scale → Dexie 4.4.5. Never OPFS |
| 14 | SRS algorithm | SM-2 now, but **FSRS-shaped schema + raw review log from day one** | **Medium-High** | Once the review log has real data, switch to `ts-fsrs` 5.4.2 (7.2 KB gz) and replay history |
| 15 | Export/import | Versioned JSON, Zod-validated, merge on `updatedAt`, proactive backup prompt | **High** | Nothing — this is the only defence against "Clear browsing data" |
| 16 | Testing | Vitest 4.1.11 + RTL 16.3.3 + jsdom 30.0.1; 45/25/20/10 split | **High** | jsdom gaps on focus management → Vitest 4 Browser Mode (`@vitest/browser-playwright`) |
| 17 | E2E | Playwright 1.62.1, capped at 3–5 tests | **Medium-High** | If the offline test proves flaky, cut to deep-link + back/forward only |
| 18 | Lint/format | ESLint 10.9.1 flat + typescript-eslint 8.69.0 + Prettier 3.9.6 | **High** | Only if `vocabulary-assistant` migrates to oxlint/Biome first — follow, don't lead |
| 19 | i18n | RU-only UI, typed `ru.ts` table, `gloss: { ru, en? }`, `lang="de"` on German | **High** (schema) / **Medium** (no library) | Shipping EN with real pluralization needs → reconsider a library |
| 20 | Dimmed options | `aria-disabled="true"`, kept in DOM, + `aria-live` count | **High** | Screen-reader testing showing the dimmed entries are genuinely noisy in practice |

---

## Appendix A — Version reference (npm registry, 2026-09-02)

| Package | Version | Published |
|---|---|---|
| `react` / `react-dom` | 19.2.8 | 2026-07-21 |
| `vite` | 8.2.2 | 2026-08-20 |
| `@vitejs/plugin-react` | 6.1.1 | 2026-08-28 |
| `typescript` | 7.0.2 | 2026-07-08 |
| `zustand` | 5.0.15 | 2026-08-13 |
| `zod` | 4.5.4 | 2026-08-29 |
| `yaml` | 2.9.0 | 2026-05-11 |
| `tsx` | 4.23.13 | 2026-08-30 |
| `vitest` / `@vitest/coverage-v8` | 4.1.11 | 2026-08-18 |
| `@testing-library/react` | 16.3.3 | 2026-08-27 |
| `jsdom` | 30.0.1 | 2026-07-29 |
| `happy-dom` | 20.13.1 | 2026-09-02 |
| `@playwright/test` | 1.62.1 | 2026-07-30 |
| `@axe-core/playwright` | 4.13.0 | 2026-08-11 |
| `eslint` | 10.9.1 | 2026-08-24 |
| `typescript-eslint` | 8.69.0 | 2026-08-31 |
| `prettier` | 3.9.6 | 2026-07-21 |
| `vite-plugin-pwa` | 1.3.0 | 2026-05-05 |
| `workbox-*` | 7.4.1 | 2026-05-04 |
| `idb-keyval` | 6.3.0 | 2026-07-08 |
| `ts-fsrs` | 5.4.2 | 2026-09-01 |
| *Considered, not selected* | | |
| `svelte` / `@sveltejs/kit` | 5.57.0 / 2.70.3 | 2026-08-28 / 2026-08-18 |
| `@sveltejs/adapter-static` | 3.0.10 (4.0.0-next.4) | 2025-10-02 |
| `astro` | 7.2.10 | 2026-08-31 |
| `next` | 16.3.4 | 2026-08-31 |
| `solid-js` | 1.9.15 | 2026-08-17 |
| `preact` | 10.29.8 | 2026-08-01 |
| `fuse.js` | 7.5.0 | 2026-07-13 |
| `minisearch` | 7.2.0 | 2025-09-16 |
| `@leeoniya/ufuzzy` | 1.0.19 | 2025-08-22 |
| `dexie` | 4.4.5 | 2026-08-14 |
| `valibot` / `ajv` | 1.4.2 / 8.20.0 | 2026-06-28 / 2026-04-24 |
| `wrangler` | 4.128.0 | 2026-09-01 |

## Appendix B — Measurement method

Bundle figures marked *(measured)* were produced on 2026-09-02 as follows:

```
npm pack <package>                                   # official published tarball
esbuild 0.28.2 <entry> --bundle --minify --format=esm \
  --define:process.env.NODE_ENV='"production"'
gzip -9 -c <output> | wc -c
```

React and Preact figures are from a real minimal stateful app (a `useState` counter with a
click handler and `createRoot`/`render`), not from summing package sizes — the latter
overstates by including server renderers and dev-only code.

Domain availability was checked via RDAP (`rdap.org`, `rdap.denic.de`); a 404 indicates no
registration record. Prices are Porkbun list prices, USD/yr, read 2026-09-02.

## Appendix C — Sources

- npm registry — https://registry.npmjs.org (all versions, 2026-09-02)
- Vite 8 release — https://vite.dev/blog/announcing-vite8
- TypeScript 7.0 GA — https://www.theregister.com/devops/2026/07/09/speedier-type-checks-in-typescript-70/5268828 · https://github.com/microsoft/typescript-go
- Vitest 4.0 — https://voidzero.dev/posts/announcing-vitest-4
- Zod 4 / Zod Mini — https://zod.dev/v4 · https://zod.dev/packages/mini
- uFuzzy (benchmarks, limitations) — https://github.com/leeoniya/uFuzzy
- Fuse.js — https://github.com/krisk/fuse
- MiniSearch — https://github.com/lucaong/minisearch
- GitHub Pages limits & prohibited uses — https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub Actions billing (public repos unmetered) — https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions
- Cloudflare Workers pricing / static assets — https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Pages → Workers migration guidance — https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/
- Cloudflare increased static asset limits — https://developers.cloudflare.com/changelog/2025-09-02-increased-static-asset-limits/
- Cloudflare Pages Functions pricing — https://developers.cloudflare.com/pages/functions/pricing/
- vite-plugin-pwa (generateSW) — https://vite-pwa-org.netlify.app/workbox/generate-sw.html · https://vite-pwa-org.netlify.app/guide/service-worker-precache
- W3C APG Listbox pattern — https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- MDN `listbox` role — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/listbox_role
- MDN `option` role — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/option_role
- MDN `Intl.Collator` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
- ts-fsrs — https://github.com/open-spaced-repetition/ts-fsrs
- FSRS vs SM-2 — https://www.antiagent.io/blog/fsrs-vs-sm-2
- Porkbun domain pricing — https://porkbun.com/products/domains
