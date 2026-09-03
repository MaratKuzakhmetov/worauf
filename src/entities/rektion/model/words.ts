import { prepositionKeys } from '@/entities/preposition';
import { rektionen } from './dataset.generated';
import type { PartOfSpeech, Rektion } from './schema';

/**
 * The word index. Derived at module load from the compiled dataset — never stored, because
 * a stored grouping is a second source of truth for something the array already decides
 * (docs/DATA_MODEL.md §4).
 */
export type WordEntry = {
  readonly slug: string;
  readonly lemma: string;
  readonly pos: PartOfSpeech;
  readonly article?: 'der' | 'die' | 'das';
  /** True only when EVERY pattern is reflexive: `sorgen für` is plain, `sich sorgen um` is not. */
  readonly alwaysReflexive: boolean;
  readonly patterns: readonly Rektion[];
  readonly prepositions: readonly string[];
};

const collator = new Intl.Collator('de', { sensitivity: 'base' });

function build(): WordEntry[] {
  const grouped = new Map<string, Rektion[]>();
  for (const r of rektionen) {
    const key = `${r.slug.word}|${r.pos}`;
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }

  const entries: WordEntry[] = [];
  for (const patterns of grouped.values()) {
    const first = patterns[0];
    if (!first) continue;
    const sorted = [...patterns].sort((a, b) => collator.compare(a.prep, b.prep));
    entries.push({
      slug: first.slug.word,
      lemma: first.lemma,
      pos: first.pos,
      ...(first.article ? { article: first.article } : {}),
      alwaysReflexive: patterns.every((p) => p.reflexive !== undefined),
      patterns: sorted,
      prepositions: sorted.map((p) => p.prep),
    });
  }

  // Sorted by the bare lemma: `sich` and the article are separate fields precisely so that
  // half the verbs do not pile up under S (docs/DATA_MODEL.md §3.1).
  return entries.sort((a, b) => collator.compare(a.lemma, b.lemma));
}

export const words: readonly WordEntry[] = build();

const bySlug = new Map(words.map((w) => [w.slug, w]));

export function findWord(slug: string): WordEntry | undefined {
  return bySlug.get(slug);
}

export function findPattern(wordSlug: string, prepSlug: string): Rektion | undefined {
  return findWord(wordSlug)?.patterns.find((p) => p.slug.prep === prepSlug);
}

export function wordsWithPreposition(prep: string): readonly WordEntry[] {
  return words.filter((w) => w.prepositions.includes(prep));
}

/** How many words each preposition governs. Drives the count in the preposition pane. */
export function prepositionCounts(): Readonly<Record<string, number>> {
  const counts: Record<string, number> = Object.fromEntries(prepositionKeys.map((k) => [k, 0]));
  for (const word of words) {
    for (const prep of new Set(word.prepositions)) counts[prep] = (counts[prep] ?? 0) + 1;
  }
  return counts;
}

/** `die Angst`, `sich freuen`, `warten` — the form a learner would look up. */
export function headword(word: WordEntry): string {
  if (word.article) return `${word.article} ${word.lemma}`;
  return word.alwaysReflexive ? `sich ${word.lemma}` : word.lemma;
}
