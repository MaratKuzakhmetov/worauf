import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { DATA_DIR } from './load';

/**
 * One-time import of the original prototype dataset. German and Russian come from the
 * prototype; the English gloss and the English translation of every example were written
 * for this import, because the prototype had neither and the schema requires both.
 *
 * Parses the YAML directly rather than through the validated loader: it has to read the
 * old shape and write the new one, so it cannot depend on either being valid.
 *
 * Run once: `npx tsx tools/data-build/import-prototype.ts /tmp/import.txt`
 */

type Pattern = Record<string, unknown>;
type Entry = { pos: string; article?: string; patterns: Pattern[] };

const ARTICLES = ['der', 'die', 'das'];
const POS = { v: 'verb', a: 'adj', n: 'noun' } as const;

function splitHeadword(raw: string): { lemma: string; article?: string; reflexive?: 'akk' } {
  const [first, ...rest] = raw.split(' ');
  if (first === 'sich') return { lemma: rest.join(' '), reflexive: 'akk' };
  if (first && ARTICLES.includes(first)) return { lemma: rest.join(' '), article: first };
  return { lemma: raw };
}

function fileFor(lemma: string): string {
  const letter = lemma
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 1);
  return `${/[a-z]/.test(letter) ? letter : 'a'}.yaml`;
}

// --- load what is already authored, lifting reflexive from the word onto its patterns ---
const byFile = new Map<string, Record<string, Entry>>();
for (const file of readdirSync(DATA_DIR).filter((n) => n.endsWith('.yaml'))) {
  const parsed = parse(readFileSync(join(DATA_DIR, file), 'utf8')) as Record<string, Entry> | null;
  const entries: Record<string, Entry> = {};
  for (const [lemma, entry] of Object.entries(parsed ?? {})) {
    const { reflexive, ...rest } = entry as Entry & { reflexive?: string };
    entries[lemma] = {
      ...rest,
      patterns: entry.patterns.map((p) => (reflexive ? { ...p, reflexive } : p)),
    };
  }
  byFile.set(file, entries);
}

const findEntry = (lemma: string) => {
  for (const entries of byFile.values()) if (entries[lemma]) return entries[lemma];
  return undefined;
};

// --- merge the import ---
const source = process.argv[2] ?? '/tmp/import.txt';
let added = 0;
let skipped = 0;

for (const line of readFileSync(source, 'utf8').trim().split('\n')) {
  const [pos, headword, prep, kase, ru, en, de, exRu, exEn] = line.split('|');
  if (!pos || !headword || !prep || !kase || !ru || !en || !de || !exRu || !exEn) {
    throw new Error(`malformed line: ${line}`);
  }
  const { lemma, article, reflexive } = splitHeadword(headword);

  const existing = findEntry(lemma);
  if (existing?.patterns.some((p) => p['prep'] === prep && p['case'] === kase)) {
    skipped += 1;
    continue;
  }

  const pattern: Pattern = {
    prep,
    case: kase,
    ...(reflexive && pos === 'v' ? { reflexive } : {}),
    gloss: { ru, en },
    examples: [{ de, ru: exRu, en: exEn }],
    sources: ['prototype'],
  };

  if (existing) {
    existing.patterns.push(pattern);
  } else {
    const file = fileFor(lemma);
    const entries = byFile.get(file) ?? {};
    entries[lemma] = {
      pos: POS[pos as keyof typeof POS],
      ...(article ? { article } : {}),
      patterns: [pattern],
    };
    byFile.set(file, entries);
  }
  added += 1;
}

// --- emit, sorted by lemma so a word's second preposition cannot hide (DATA_MODEL §2) ---
const HEADER = '# yaml-language-server: $schema=../../schema/rektion.schema.json\n';
const collator = new Intl.Collator('de', { sensitivity: 'base' });

for (const [file, entries] of byFile) {
  const sorted = Object.keys(entries).sort((a, b) => collator.compare(a, b));
  const body = sorted
    .map((lemma) => {
      const entry = entries[lemma];
      if (!entry) return '';
      entry.patterns.sort((a, b) => String(a['prep']).localeCompare(String(b['prep']), 'de'));
      return stringify({ [lemma]: entry }, { lineWidth: 0, defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN' });
    })
    .join('\n');
  writeFileSync(join(DATA_DIR, file), `${HEADER}\n${body}`);
}

console.log(`imported ${added} patterns, skipped ${skipped} already present`);
console.log(`${byFile.size} files rewritten`);
