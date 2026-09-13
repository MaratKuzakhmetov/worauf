import { mkdirSync, writeFileSync } from 'node:fs';
import { searchTitles } from './mediawiki';
import { mapPool } from './pool';
import { parseObjArg } from './parse-en';
import type { Sighting } from './types';
import type { PartOfSpeech } from '@/entities/rektion/model';

/**
 * Layer 1, English Wiktionary half (DATA_SOURCES.md §1). Finds every German page carrying a
 * `{{+obj|de|:…}}` prepositional argument, fetches kaikki.org's per-word JSONL (18–27 KB
 * each — nowhere near the 10 MB ceiling), and extracts every `(prep, case)` pair it can.
 *
 * Never touches the bulk kaikki dump (310 MB–1 GB+): per-word JSONL is the "curated word
 * list of a few hundred entries" path the research recommended, and it is what this is.
 */

const OUT_ARG = process.argv[2];
if (!OUT_ARG) throw new Error('usage: tsx fetch-en.ts <output.json>');
const OUT: string = OUT_ARG;

type KaikkiSense = {
  info_templates?: { name: string; args?: Record<string, string> }[];
  glosses?: string[];
  tags?: string[];
};
type KaikkiEntry = { word: string; pos: string; senses?: KaikkiSense[] };

const POS_MAP: Readonly<Record<string, PartOfSpeech>> = { verb: 'verb', adj: 'adj', noun: 'noun' };

function kaikkiUrl(word: string): string {
  const first = word[0];
  const two = word.slice(0, 2);
  return `https://kaikki.org/dictionary/German/meaning/${first}/${two}/${encodeURIComponent(word)}.jsonl`;
}

async function fetchWord(title: string): Promise<{ title: string; sightings: Sighting[]; error?: string }> {
  const url = kaikkiUrl(title);
  try {
    const res = await fetch(url);
    if (!res.ok) return { title, sightings: [], error: `HTTP ${res.status}` };
    const text = await res.text();

    const sightings: Sighting[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line) as KaikkiEntry;
      const pos = POS_MAP[entry.pos];
      if (!pos || entry.word !== title) continue;

      for (const sense of entry.senses ?? []) {
        for (const template of sense.info_templates ?? []) {
          if (template.name !== '+obj' || template.args?.['1'] !== 'de') continue;
          const raw = template.args?.['2'];
          if (!raw) continue;

          for (const parsed of parseObjArg(raw)) {
            sightings.push({
              lemma: entry.word,
              pos,
              prep: parsed.prep,
              case: parsed.case,
              edition: 'en.wiktionary',
              url: `https://en.wiktionary.org/wiki/${encodeURIComponent(title)}#German`,
              gloss: parsed.gloss ?? sense.glosses?.[0],
              reflexive: sense.tags?.includes('reflexive') || undefined,
            });
          }
        }
      }
    }
    return { title, sightings };
  } catch (error) {
    return { title, sightings: [], error: String(error) };
  }
}

async function main(): Promise<void> {
  console.log('searching en.wiktionary for {{+obj|de|:…}} …');
  const titles = await searchTitles('en.wiktionary.org', '\\{\\{\\+obj\\|de\\|:');
  console.log(`  ${titles.length} candidate pages`);

  const results = await mapPool(titles, 10, fetchWord);
  const errors = results.filter((r) => r.error);
  const sightings = results.flatMap((r) => r.sightings);

  console.log(`  fetched: ${results.length - errors.length} ok, ${errors.length} failed`);
  console.log(`  extracted ${sightings.length} sightings`);
  if (errors.length > 0) {
    console.log('  failures:', errors.slice(0, 10).map((e) => `${e.title} (${e.error})`).join(', '));
  }

  mkdirSync(OUT.substring(0, OUT.lastIndexOf('/')), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ sightings, titleCount: titles.length, errors }, null, 2));
  console.log(`  written to ${OUT}`);
}

void main();
