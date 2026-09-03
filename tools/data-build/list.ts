import { caseNumber } from '@/entities/rektion';
import { compile } from './compile';
import { loadAuthoredFiles } from './load';

/**
 * Reads the dataset out loud, because until phase 2 there is no browser to look at it in.
 *   npm run data:list
 *   npm run data:list -- --lang=ru --prep=auf
 *   npm run data:list -- --multi
 */

const args = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const lang = flag('lang') === 'ru' ? 'ru' : 'en';
const onlyPrep = flag('prep');
const onlyMulti = args.includes('--multi');

const files = loadAuthoredFiles();
const inputs = files.flatMap(({ entries }) =>
  Object.entries(entries).map(([lemma, entry]) => ({ lemma, entry })),
);
const { rektionen } = compile(inputs);

const byWord = new Map<string, typeof rektionen>();
for (const r of rektionen) {
  const key = `${r.lemma}|${r.pos}`;
  byWord.set(key, [...(byWord.get(key) ?? []), r]);
}

const POS_MARK: Record<string, string> = { verb: '', adj: ' (adj)', noun: '' };
let shown = 0;

for (const [, group] of [...byWord].sort((a, b) => a[0].localeCompare(b[0], 'de'))) {
  const patterns = onlyPrep ? group.filter((r) => r.prep === onlyPrep) : group;
  if (patterns.length === 0) continue;
  if (onlyMulti && group.length < 2) continue;

  const first = group[0];
  if (!first) continue;

  const article = first.article ? `${first.article} ` : '';
  const reflexive = first.reflexive ? 'sich ' : '';
  const multi = group.length > 1 ? `  ⁝${group.length}` : '';
  const headword = `${article}${reflexive}${first.lemma}${POS_MARK[first.pos] ?? ''}`;

  console.log(`\n${headword}${multi}`);
  for (const r of patterns) {
    shown += 1;
    const government = `${r.prep}${caseNumber(r.case)}`.padEnd(10);
    console.log(`  ${government}${r.gloss[lang]}`);
    if (r.senseNote) console.log(`  ${' '.repeat(10)}└ ${r.senseNote[lang]}`);
    console.log(`  ${' '.repeat(10)}  ${r.examples[0]?.de ?? ''}`);
    console.log(`  ${' '.repeat(10)}  /${lang}/${r.slug.word}/${r.slug.prep}/`);
  }
}

const multiCount = [...byWord.values()].filter((g) => g.length > 1).length;
console.log(
  `\n${shown} patterns shown · ${byWord.size} words · ${multiCount} of them govern more than one preposition`,
);
