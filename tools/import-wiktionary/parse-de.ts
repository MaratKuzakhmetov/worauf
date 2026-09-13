import type { GrammaticalCase, PartOfSpeech } from '@/entities/rektion/model';

/**
 * `{{K|…|Prä=auf|Kas=Akkusativ|…}}` sense-qualifiers in raw de.wiktionary wikitext
 * (DATA_SOURCES.md §2, extraction path (a) — the structured one). Must be parsed from raw
 * wikitext, not from kaikki's German-edition extract: that extract renders the template to
 * prose and drops `Prä`/`Kas` entirely (verified in the research — `warten`'s kaikki record
 * carries no government field at all).
 *
 * Paths (b) (the free-text gloss hedge, e.g. `"selten Akkusativ"`) and (c) (case inferred
 * from `etwas/jemandem` vs `etwas/jemanden` in noun collocations) are NOT attempted here —
 * they are brittle regex-over-prose extraction the research flagged as a second pass, not
 * part of the structured seed.
 */

const CASE_WORDS: Readonly<Record<string, GrammaticalCase>> = {
  akkusativ: 'akk',
  dativ: 'dat',
  genitiv: 'gen',
};

const POS_WORDS: Readonly<Record<string, PartOfSpeech>> = {
  Verb: 'verb',
  Adjektiv: 'adj',
  Substantiv: 'noun',
};

export type ParsedDeSense = {
  readonly pos: PartOfSpeech;
  readonly prep: string;
  readonly case: GrammaticalCase;
  readonly gloss: string;
};

// A page title is not a language: de.wiktionary documents foreign words too — `řadit` is a
// CZECH verb explained in German, sitting under `== řadit ({{Sprache|Tschechisch}}) ==` with
// its own `=== {{Wortart|Verb|Tschechisch}} ===` and even its own `{{K|…}}` government
// templates, using the identical shape as a genuine German entry. A first version of this
// parser did not check the language section at all and quietly ingested Czech, Slovak and
// Polish rektion as if it were German (caught by the merge report's "unsupported preposition"
// bucket showing `do`, `k`, `na`, `proti`, `z`… next to lemmas like `řadit`, `dát se`).
const LANGUAGE_SECTION = /==\s*[^=\n]*\(\{\{Sprache\|([^}|]+)/g;
const WORTART = /===\s*\{\{Wortart\|([^|}]+)/g;
const K_TEMPLATE = /\{\{K\|([^}]*)\}\}([^\n]*)/g;

function templateArg(body: string, key: string): string | undefined {
  const match = new RegExp(`${key}=([^|]+)`).exec(body);
  return match?.[1]?.trim();
}

/**
 * Walks the page linearly, tracking the nearest `== word ({{Sprache|…}}) ==` and
 * `=== {{Wortart|…}} ===` headers above each `{{K|…}}` sense line. A page can hold several
 * language sections (a genuine homograph across languages) and, within the German one,
 * several word-type sections for homographs — a sense belongs to whichever pair of headers
 * it physically sits under, and only `Sprache=Deutsch` is ever extracted.
 */
export function parseDeWikitext(wikitext: string): readonly ParsedDeSense[] {
  const languages: { index: number; language: string }[] = [];
  for (const match of wikitext.matchAll(LANGUAGE_SECTION)) {
    const language = match[1]?.trim();
    if (language) languages.push({ index: match.index, language });
  }

  const posMarkers: { index: number; pos: PartOfSpeech }[] = [];
  for (const match of wikitext.matchAll(WORTART)) {
    const pos = POS_WORDS[match[1] ?? ''];
    if (pos) posMarkers.push({ index: match.index, pos });
  }

  function languageAt(index: number): string | undefined {
    let current: string | undefined;
    for (const marker of languages) {
      if (marker.index > index) break;
      current = marker.language;
    }
    return current;
  }

  function posAt(index: number): PartOfSpeech | undefined {
    let current: PartOfSpeech | undefined;
    for (const marker of posMarkers) {
      if (marker.index > index) break;
      current = marker.pos;
    }
    return current;
  }

  const found: ParsedDeSense[] = [];
  for (const match of wikitext.matchAll(K_TEMPLATE)) {
    const body = match[1] ?? '';
    const index = match.index ?? 0;
    if (languageAt(index) !== 'Deutsch') continue;
    const pos = posAt(index);
    if (!pos) continue;

    for (const [prepKey, kasKey] of [
      ['Prä', 'Kas'],
      ['Prä2', 'Kas2'],
    ] as const) {
      const prep = templateArg(body, prepKey)?.toLowerCase();
      const kasRaw = templateArg(body, kasKey)?.toLowerCase();
      const kase = kasRaw ? CASE_WORDS[kasRaw] : undefined;
      if (!prep || !kase) continue;

      found.push({
        pos,
        prep,
        case: kase,
        gloss: (match[2] ?? '').replace(/^\s*/, '').slice(0, 200),
      });
    }
  }
  return found;
}
