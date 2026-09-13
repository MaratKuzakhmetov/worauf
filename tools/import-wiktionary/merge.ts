import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { prepositionKeys } from '@/entities/preposition';
import type { GrammaticalCase, PartOfSpeech } from '@/entities/rektion/model';
import { loadAuthoredFiles } from '../data-build/load';
import type { Sighting } from './types';

/**
 * Layer 1's merge step (PLAN.md phase 5, DATA_SOURCES.md). Combines the two Wiktionary
 * editions' sightings, cross-checks against what `data/de/*.yaml` already holds, and writes
 * a CANDIDATES report — never the authored dataset itself.
 *
 * "Скрипт предлагает, а не добавляет": nothing here is added to `data/`. Promoting a
 * candidate requires the two-independent-source verification `rektion-data-agent` is bound
 * to (`.claude/agents/rektion-data-agent.md`) — this script's merge of two Wiktionary
 * editions is NOT that verification, since both come from the same source family. A
 * candidate marked `high` here still needs an outside check (E-VALBU, DWDS, or a second
 * dictionary) before it can enter `data/`.
 */

const EN_ARG = process.argv[2];
const DE_ARG = process.argv[3];
const OUT_DIR_ARG = process.argv[4];
if (!EN_ARG || !DE_ARG || !OUT_DIR_ARG) {
  throw new Error('usage: tsx merge.ts <en.json> <de.json> <out-dir>');
}
const EN: string = EN_ARG;
const DE: string = DE_ARG;
const OUT_DIR: string = OUT_DIR_ARG;

type Key = string;
function keyOf(lemma: string, pos: PartOfSpeech, prep: string, kase: GrammaticalCase): Key {
  return `${lemma} ${pos} ${prep} ${kase}`;
}
function prepKeyOf(lemma: string, pos: PartOfSpeech, prep: string): Key {
  return `${lemma} ${pos} ${prep}`;
}

type Group = {
  readonly lemma: string;
  readonly pos: PartOfSpeech;
  readonly prep: string;
  /** Every case sighted for this (lemma, pos, prep), each with its own supporting sightings. */
  readonly byCase: Map<GrammaticalCase, Sighting[]>;
};

function loadSightings(path: string): readonly Sighting[] {
  const data = JSON.parse(readFileSync(path, 'utf8')) as { sightings: Sighting[] };
  return data.sightings;
}

function existingKeys(): Set<Key> {
  const keys = new Set<Key>();
  for (const { entries } of loadAuthoredFiles()) {
    for (const [lemma, entry] of Object.entries(entries)) {
      for (const pattern of entry.patterns) {
        keys.add(keyOf(lemma, entry.pos, pattern.prep, pattern.case));
      }
    }
  }
  return keys;
}

function existingLemmas(): Map<string, PartOfSpeech> {
  const map = new Map<string, PartOfSpeech>();
  for (const { entries } of loadAuthoredFiles()) {
    for (const [lemma, entry] of Object.entries(entries)) map.set(lemma, entry.pos);
  }
  return map;
}

type Row = {
  lemma: string;
  pos: PartOfSpeech;
  prep: string;
  case: GrammaticalCase;
  confidence: 'high' | 'medium';
  editions: string[];
  status: 'already-have' | 'new-prep-for-existing-word' | 'new-word';
  sources: { edition: string; url: string; gloss?: string }[];
  /** From en.wiktionary's own `reflexive` tag — see `types.ts`. Absent, never guessed. */
  reflexive?: boolean;
};

function main(): void {
  const sightings = [...loadSightings(EN), ...loadSightings(DE)];

  const supported = sightings.filter((s) => prepositionKeys.includes(s.prep));
  const unsupported = sightings.filter((s) => !prepositionKeys.includes(s.prep));

  const groups = new Map<Key, Group>();
  for (const s of supported) {
    const pk = prepKeyOf(s.lemma, s.pos, s.prep);
    let group = groups.get(pk);
    if (!group) {
      group = { lemma: s.lemma, pos: s.pos, prep: s.prep, byCase: new Map() };
      groups.set(pk, group);
    }
    const list = group.byCase.get(s.case) ?? [];
    list.push(s);
    group.byCase.set(s.case, list);
  }

  const already = existingKeys();
  const lemmas = existingLemmas();

  const rows: Row[] = [];
  const conflicts: { lemma: string; pos: PartOfSpeech; prep: string; cases: string[] }[] = [];

  for (const group of groups.values()) {
    if (group.byCase.size > 1) {
      // Same (lemma, pos, prep), different case reported by different sightings — could be a
      // real alternation (bestehen auf: Dat usually, Akk rarely) or a genuine conflict.
      // Either way it needs a human, not a merge rule, so every case is reported and none
      // is silently chosen here.
      conflicts.push({
        lemma: group.lemma,
        pos: group.pos,
        prep: group.prep,
        cases: [...group.byCase.keys()],
      });
    }

    for (const [kase, list] of group.byCase) {
      const editions = [...new Set(list.map((s) => s.edition))];
      const status: Row['status'] = already.has(keyOf(group.lemma, group.pos, group.prep, kase))
        ? 'already-have'
        : lemmas.has(group.lemma)
          ? 'new-prep-for-existing-word'
          : 'new-word';

      rows.push({
        lemma: group.lemma,
        pos: group.pos,
        prep: group.prep,
        case: kase,
        confidence: editions.length > 1 ? 'high' : 'medium',
        editions,
        status,
        sources: list.map((s) => ({ edition: s.edition, url: s.url, gloss: s.gloss })),
        reflexive: list.some((s) => s.reflexive) || undefined,
      });
    }
  }

  const actionable = rows.filter((r) => r.status !== 'already-have');
  const byStatus = {
    already: rows.filter((r) => r.status === 'already-have').length,
    newPrep: rows.filter((r) => r.status === 'new-prep-for-existing-word').length,
    newWord: rows.filter((r) => r.status === 'new-word').length,
  };
  const byConfidence = {
    high: actionable.filter((r) => r.confidence === 'high').length,
    medium: actionable.filter((r) => r.confidence === 'medium').length,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    `${OUT_DIR}/candidates.json`,
    JSON.stringify({ rows: actionable, conflicts, unsupported }, null, 2),
  );

  const lines: string[] = [];
  lines.push('# Wiktionary seed candidates (Layer 1)');
  lines.push('');
  lines.push(
    `Generated by tools/import-wiktionary. ${sightings.length} raw sightings ` +
      `(${supported.length} using one of the app's 16 prepositions, ${unsupported.length} not) ` +
      `collapsed to ${groups.size} distinct (lemma, pos, preposition) groups.`,
  );
  lines.push('');
  lines.push('Nothing here is in data/ yet. Every row still needs the two-independent-source');
  lines.push(
    'check rektion-data-agent requires before a pattern is trusted. Agreement between the ' +
      'English and German Wiktionary editions raises confidence to "high" but is not itself ' +
      'that check, since both come from the same source family.',
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Already in data/de/: ${byStatus.already}`);
  lines.push(`- New preposition for a word we already have: ${byStatus.newPrep}`);
  lines.push(`- Entirely new word: ${byStatus.newWord}`);
  lines.push(
    `- Actionable total: ${actionable.length} (high confidence: ${byConfidence.high}, medium: ${byConfidence.medium})`,
  );
  lines.push(`- Case conflicts needing arbitration: ${conflicts.length}`);
  lines.push(`- Sightings using an unsupported preposition: ${unsupported.length}`);
  lines.push('');

  if (conflicts.length > 0) {
    lines.push('## Case conflicts — needs a human decision, not a merge rule');
    lines.push('');
    lines.push('| Lemma | POS | Prep | Cases sighted |');
    lines.push('|---|---|---|---|');
    for (const c of conflicts.sort((a, b) => a.lemma.localeCompare(b.lemma))) {
      lines.push(`| ${c.lemma} | ${c.pos} | ${c.prep} | ${c.cases.join(', ')} |`);
    }
    lines.push('');
  }

  const unsupportedPreps = [...new Set(unsupported.map((s) => s.prep))].sort();
  if (unsupportedPreps.length > 0) {
    lines.push('## Unsupported prepositions sighted');
    lines.push('');
    lines.push(
      `Not one of the app's 16 prepositions (${prepositionKeys.join(', ')}). Extending the ` +
        'preposition table is a decision for a human, not something this script does silently.',
    );
    lines.push('');
    for (const prep of unsupportedPreps) {
      const count = unsupported.filter((s) => s.prep === prep).length;
      const examples = [
        ...new Set(unsupported.filter((s) => s.prep === prep).map((s) => s.lemma)),
      ]
        .slice(0, 5)
        .join(', ');
      lines.push(`- \`${prep}\` — ${count} sightings, e.g. ${examples}`);
    }
    lines.push('');
  }

  lines.push('## New words, high confidence (both editions agree)');
  lines.push('');
  lines.push(
    '`sich` marks a reflexive sense per en.wiktionary\'s own `reflexive` tag — the real ' +
      'lemma to author is `sich vergreifen`, not `vergreifen`, or the headword would be ' +
      'wrong on entry. Not detected from de.wiktionary in this pass; a row with no `sich` is ' +
      'not a claim that the verb is non-reflexive, only that reflexivity was not sighted.',
  );
  lines.push('');
  lines.push('| Lemma | POS | Prep | Case | Sources |');
  lines.push('|---|---|---|---|---|');
  for (const r of actionable
    .filter((row) => row.status === 'new-word' && row.confidence === 'high')
    .sort((a, b) => a.lemma.localeCompare(b.lemma))) {
    const lemma = r.reflexive ? `sich ${r.lemma}` : r.lemma;
    lines.push(`| ${lemma} | ${r.pos} | ${r.prep} | ${r.case} | ${r.editions.join(' + ')} |`);
  }
  lines.push('');

  lines.push('## New prepositions for existing words, high confidence');
  lines.push('');
  lines.push('| Lemma | POS | Prep | Case | Sources |');
  lines.push('|---|---|---|---|---|');
  for (const r of actionable
    .filter((row) => row.status === 'new-prep-for-existing-word' && row.confidence === 'high')
    .sort((a, b) => a.lemma.localeCompare(b.lemma))) {
    const lemma = r.reflexive ? `sich ${r.lemma}` : r.lemma;
    lines.push(`| ${lemma} | ${r.pos} | ${r.prep} | ${r.case} | ${r.editions.join(' + ')} |`);
  }
  lines.push('');

  lines.push(
    `Medium-confidence rows (${byConfidence.medium}, one edition only) and their sources are ` +
      'in candidates.json, not reproduced here in full.',
  );
  lines.push('');

  writeFileSync(`${OUT_DIR}/SEED_REPORT.md`, lines.join('\n'));

  console.log(
    `rows: ${rows.length} (${byStatus.already} already have, ${actionable.length} actionable)`,
  );
  console.log(`  new-word: ${byStatus.newWord}, new-prep: ${byStatus.newPrep}`);
  console.log(`  confidence: high ${byConfidence.high}, medium ${byConfidence.medium}`);
  console.log(
    `  conflicts: ${conflicts.length}, unsupported-preposition sightings: ${unsupported.length}`,
  );
  console.log(`written ${OUT_DIR}/candidates.json and ${OUT_DIR}/SEED_REPORT.md`);
}

main();
