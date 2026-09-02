# CLAUDE.md — worauf

Project instructions for every Claude agent working in this repository.

---

## Project Purpose

A web reference and trainer for **German Rektion** — which preposition goes with which verb,
adjective or noun, and in which case. It answers one question in one second:
`warten` → `auf` → *Akkusativ*.

**Primary user:** an adult learner at A2–C1 who already knows the word and is failing specifically
on its government. This is not vocabulary learning — the word is known; the preposition and the case
are not. The interface runs in **English by default**, with Russian as the second locale.

**Not this project:** a general German course, a conjugation table (Verbformen.de does that),
a dictionary, or a full valency lexicon (E-VALBU does that).

---

## The One Idea Everything Follows From

**The central entity is the pattern (Rektion), not the word and not the preposition.**

- One word holds several patterns with different meanings: `sich freuen auf` ≠ `sich freuen über`; `bestehen auf / aus / in`; `denken an` ≠ `denken über`.
- The case belongs to the pattern, not to the preposition. `auf` is a Wechselpräposition, but `warten auf` is always Akkusativ and `bestehen auf` is always Dativ. The *wo / wohin* rule does not apply to prepositional objects — the case is lexical and must be known, not derived. This is the entire reason the app exists.
- Verbs, adjectives and nouns share one entity with a `pos` field. They are not three subsystems.

Full schema and invariants: `docs/DATA_MODEL.md`.

---

## Required Technology Stack

Locked in `docs/research/STACK.md`. Do not propose alternatives without a critical blocker.

| Role | Technology |
|---|---|
| Framework | **Next.js 16 with the App Router**, `output: 'export'` (static) — see `docs/adr/0001-nextjs-app-router.md` |
| UI | React 19 + TypeScript 6 (`strict`, `noUncheckedIndexedAccess`) — **not** 7: `typescript-eslint` 8.69, the latest, peer-requires `typescript <6.1.0` |
| Styling | CSS Modules only |
| State | Zustand 5 — only if it carries ≥3 slices; otherwise `useReducer` |
| Routing | App Router file routes: `/[lang]/[word]/[prep]/` — scheme frozen in `docs/adr/0002-url-and-slug-scheme.md`. No query-param state, no router library |
| Search | Hand-rolled normalized inverted index. No search library |
| i18n | RU + EN, typed string tables, no i18n library. Glosses are data, not UI strings |
| Data authoring | YAML per headword initial, validated by Zod at build time |
| Tests | Vitest 4 + React Testing Library 16 + jsdom 30; Playwright for 3–5 E2E |
| Lint/format | ESLint 10 flat + typescript-eslint 8 + Prettier 3 |
| Runtime | Node 22 (`.nvmrc`). Node 20 reached end of life in April 2026, and jsdom 30 needs 22 anyway |
| Hosting | GitHub Pages + GitHub Actions |

**Never used here:**
- Tailwind, any CSS framework, CSS-in-JS, any UI kit
- Redux, MobX
- A search library, an animation library, an i18n library
- Server-side features `output: 'export'` forbids: middleware, ISR, route handlers, `next/image` optimization (`images.unoptimized: true`)
- Any backend, account system, telemetry or error reporting
- Any runtime network call whatsoever — the dataset is compiled into the bundle

---

## Data and Licensing

Sources, coverage and the full strategy: `docs/research/DATA_SOURCES.md`.

| Layer | Source | Use |
|---|---|---|
| Seed | en.wiktionary via kaikki/wiktextract (`+obj` template) | Automated import, CC BY-SA 4.0 |
| Seed | de.wiktionary raw wikitext (`Prä=` / `Kas=`) | Automated import, CC BY-SA 4.0 |
| Enrichment | UD_German-HDT | Frequency ranking only; publish counts, not text |
| Enrichment | Tatoeba | Example sentences, CC BY, keep sentence IDs |
| Validation | E-VALBU, DWDS, IDS VmP A1/A2 lists | **Read-only reference. Import nothing.** |

- **Dataset licence: CC BY-SA 4.0.** Share-alike comes from Wiktionary and is not negotiable.
- **Code licence: MIT.** Share-alike does not reach application code.
- `ATTRIBUTION.md` is mandatory, and every pattern record carries a `sources` field.
- **Excluded on licence grounds:** DWDS (§ 44b UrhG TDM reservation), E-VALBU / grammis (all rights reserved), Leipzig Wortschatz (CC BY-NC, incompatible), Goethe-Institut word lists.

---

## MVP Scope

**In scope:** the two-column browser (words × prepositions) with bidirectional filtering; all
patterns of a selected word shown at once; German search with umlaut folding; deep-linkable URL
state; full keyboard operation; a trainer whose distractors lead with the same preposition in a
different case; light and dark themes; mobile layout.

**Out of scope for MVP:** conjugation and declension tables, full valency frames, free prepositional
phrases (`am Montag` is not government), audio, accounts or cloud sync, any language pair other than
DE→RU, sentence translation.

---

## Code Conventions

**TypeScript** — no `any`; use `unknown` and narrow. Explicit return types on exported functions.
`type` for data shapes, `interface` only for React props.

**React** — function components only. `useMemo` / `useCallback` only when profiling shows a need.
Props interfaces named `{ComponentName}Props`.

**CSS Modules** — one `.module.css` per component; camelCase class names; no `!important`.
**Every colour comes from a token.** A literal hex in a component is a bug. The three case colours
are reserved for case; selection and focus are ink/paper inversion, never a fourth colour.

**Files — Feature-Sliced Design** (`docs/adr/0003-feature-sliced-design.md`). Next routes live in
the **root** `app/` and contain re-exports only; every line of application code lives in `src/`.
FSD's `app` and `pages` layers are renamed `_app` and `_pages` to avoid colliding with Next's
routing directory.

```
app/[lang]/…            routing only — one re-export per file
src/_app/               root layout, fonts, global styles and tokens
src/_pages/<slice>/     a page as a composition of widgets
src/widgets/<slice>/    composite UI blocks
src/features/<slice>/   one user action each
src/entities/<slice>/   business entities — appears in Phase 1, not before
src/shared/             i18n, lib, ui — reusable, owns nothing domain-specific
```

A layer may import only from layers **strictly below** it. Inside a slice, segments are
`ui / model / api / lib / config`, and only `index.ts` is public — never deep-import past it.
The rule is enforced by review for now; a linter for it is a dependency, so it needs approval.

Build-time tooling in `tools/`, never shipped. Tests co-located. No `utils.ts` catch-alls.

**Comments** — only where the *why* is non-obvious. Never comment the *what*.

**Data files** — YAML grouped by lemma and sorted by lemma. **Grouping by preposition is
forbidden**: it is what caused 21 missing patterns out of 196 in the prototype, because a word's
second preposition sat invisibly two screens away from its first.

**Slugs are frozen data, not a derived value.** Every pattern carries `slug: {word, prep}`, assigned
once and never recomputed. Folding for URLs uses exactly one variant (`ü → ue`, `ß → ss`), unlike
search, which indexes both. A slug collision is a page silently overwriting another page at build
time, so uniqueness is a data invariant (12–14), and invariant 14 diffs against git history because
there is no server to redirect an old URL.

**German handling** — German text gets `lang="de"`. Reflexive `sich` is a separate field, never part
of the lemma string. Sorting uses `Intl.Collator('de', { sensitivity: 'base' })`.

**Two UI languages, EN (default) and RU.** The language is the first path segment — `/en/…`,
`/ru/…` — and it is **always present**, including for the default locale: a default with no segment
produces two URLs for one page and breaks both `hreflang` and caching. Crucially this is **not** an interface-localisation task: the UI has
about fifteen strings. The cost is in the **data** — every pattern carries `gloss: {ru, en}`,
`senseNote: {ru, en}` and a translation of every example. No record enters the dataset with one
language filled and the other empty (invariant 10a). German material is never translated or
switched — only the explanation layer is. Case names stay German (`Akkusativ`, `Dativ`) in both
locales, because that is how the learner will meet them in a textbook.

**CEFR levels are not a UI feature.** The A1–C1 scale needs explaining before it pays off. Learning
order comes from the corpus frequency rank instead. `level` stays as an optional data field, filled
only where a published source states it (the IDS VmP lists cover A1/A2, ~72 patterns) — never by
intuition.

**Document language** — product, design and data documents are written in Russian (the user reads
them). `CLAUDE.md` and `.claude/agents/*.md` are written in English (agents read them). Keep it that way.

---

## Testing Requirements

The dataset is the product, so the suite is invariant-heavy: ~45 % data invariants, ~25 % pure
logic, ~20 % component, ~10 % end-to-end.

- Every invariant in `docs/DATA_MODEL.md` §5 runs in CI and **gates deploy**. A failing invariant is a red build.
- A failing invariant is never fixed by weakening the invariant.
- Fixtures use real records. Never invent German.
- Coverage matters on the data checks and pure logic. It does not matter on presentational components.

---

## Agent Behaviour Rules

- **Never install a dependency** without explicit user approval, including a small one.
- **Never write implementation code for a phase that has not been unlocked** in `PLAN.md`.
- Research and design agents write `.md` and mockups only, never `src/`.
- The agent that decides does not implement; the agent that implements does not decide.
  A silent or self-contradictory spec is a question for its owner, not a gap to fill with a guess.
- Never edit the dataset to make something else pass.
- Never commit or push unless asked.
- Report verification honestly: quote the command and its output. If tests fail, say so.

---

## Repository Map

```
worauf/
├── CLAUDE.md                    ← this file
├── PLAN.md                      ← phases, ownership, what is not re-opened
├── docs/
│   ├── DATA_MODEL.md            ← schema, authoring format, invariants
│   ├── DESIGN.md                ← design language, tokens, screen states
│   ├── adr/                     ← architecture decision records
│   └── research/
│       ├── DATA_SOURCES.md      ← sources, coverage, licensing
│       ├── PRIOR_ART.md         ← competing tools, learner pain points, method evidence
│       └── STACK.md             ← stack evaluation and the locked decision table
├── .claude/agents/              ← subagent definitions
├── *.dc.html + canvas.json      ← design canvas artboards
├── app/[lang]/                  ← Next routing, re-exports only
├── src/                         ← Feature-Sliced Design layers
│   ├── _app/  _pages/  widgets/  features/  shared/
│   └── entities/                (Phase 1)
├── data/de/{a..z}.yaml          (not yet created)
└── tools/                       (not yet created)
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
