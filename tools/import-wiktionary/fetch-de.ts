import { mkdirSync, writeFileSync } from 'node:fs';
import { searchTitles } from './mediawiki';
import { mapPool } from './pool';
import { parseDeWikitext } from './parse-de';
import type { Sighting } from './types';

/**
 * Layer 1, German Wiktionary half (DATA_SOURCES.md §2). Finds every page carrying a
 * `{{K|…Prä=…}}` sense-qualifier and parses the RAW WIKITEXT — kaikki's German-edition
 * extract drops this field entirely, so it cannot be used here (see `parse-de.ts`).
 */

const OUT_ARG = process.argv[2];
if (!OUT_ARG) throw new Error('usage: tsx fetch-de.ts <output.json>');
const OUT: string = OUT_ARG;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * de.wiktionary's article-serving path — unlike kaikki.org's static JSONL files — throttles
 * concurrent requests (HTTP 429 on more than a few in flight; observed live). Backed off
 * with retries rather than raised as a fetch limit: the pool concurrency is already low.
 */
async function fetchPage(title: string): Promise<{ title: string; sightings: Sighting[]; error?: string }> {
  const url = `https://de.wiktionary.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  try {
    let res = await fetch(url);
    for (let attempt = 0; res.status === 429 && attempt < 5; attempt += 1) {
      await sleep(1500 * (attempt + 1));
      res = await fetch(url);
    }
    if (!res.ok) return { title, sightings: [], error: `HTTP ${res.status}` };
    const wikitext = await res.text();

    const sightings = parseDeWikitext(wikitext).map(
      (parsed): Sighting => ({
        lemma: title,
        pos: parsed.pos,
        prep: parsed.prep,
        case: parsed.case,
        edition: 'de.wiktionary',
        url: `https://de.wiktionary.org/wiki/${encodeURIComponent(title)}`,
        gloss: parsed.gloss || undefined,
      }),
    );
    return { title, sightings };
  } catch (error) {
    return { title, sightings: [], error: String(error) };
  }
}

async function main(): Promise<void> {
  console.log('searching de.wiktionary for {{K|…Prä=…}} …');
  const titles = await searchTitles('de.wiktionary.org', '\\{\\{K\\|[^}]*Prä=');
  // The literal "ä" is correct here, not a percent-escape: `URLSearchParams` (inside
  // `searchTitles`) does its own UTF-8 percent-encoding, so escaping it here first would
  // double-encode it into a query MediaWiki does not recognise. Verified live.
  console.log(`  ${titles.length} candidate pages`);

  const results = await mapPool(titles, 3, fetchPage);
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
