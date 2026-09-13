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
  /** The primary form's part of speech — chosen by `FORM_ORDER`, never by dataset order. */
  readonly pos: PartOfSpeech;
  /** Every part of speech sharing this slug, in `FORM_ORDER`. One element for all but a few. */
  readonly forms: readonly PartOfSpeech[];
  readonly article?: 'der' | 'die' | 'das';
  /** True only when EVERY pattern is reflexive: `sorgen für` is plain, `sich sorgen um` is not. */
  readonly alwaysReflexive: boolean;
  readonly patterns: readonly Rektion[];
  readonly prepositions: readonly string[];
};

const collator = new Intl.Collator('de', { sensitivity: 'base' });

/**
 * Which form leads when one slug carries several, and the order they are listed in.
 * Fixed and explicit on purpose: reading the primary form off `patterns[0]` would hand the
 * decision to YAML file order, so the page title could change because a pattern moved.
 */
const FORM_ORDER: readonly PartOfSpeech[] = ['verb', 'noun', 'adj'];

function build(): WordEntry[] {
  /*
   * Grouped by the word slug ALONE, because the slug is the page: `/[lang]/[word]/` can
   * answer for exactly one word. Grouping per (slug, pos) made two entries for `vertrauen`
   * — the verb and the noun `Vertrauen` fold to the same slug — and `bySlug` below then
   * silently kept whichever came last, leaving the other reachable in no way at all while
   * it still rendered a row and a link. One slug, one entry, every pattern shown (ADR 0002).
   */
  const grouped = new Map<string, Rektion[]>();
  for (const r of rektionen) {
    grouped.set(r.slug.word, [...(grouped.get(r.slug.word) ?? []), r]);
  }

  const entries: WordEntry[] = [];
  for (const [slug, patterns] of grouped) {
    const forms = FORM_ORDER.filter((pos) => patterns.some((p) => p.pos === pos));
    const primaryPos = forms[0];
    if (primaryPos === undefined) continue;

    // The headword shown for the group is the primary form's, so the fields that build it
    // are read from that form's patterns — `sich` and the article belong to a form, not to
    // the slug. A noun's `das` must not end up on a verb's title.
    const primary = patterns.filter((p) => p.pos === primaryPos);
    const first = primary[0];
    if (first === undefined) continue;

    const sorted = [...patterns].sort(
      (a, b) =>
        FORM_ORDER.indexOf(a.pos) - FORM_ORDER.indexOf(b.pos) || collator.compare(a.prep, b.prep),
    );

    entries.push({
      slug,
      lemma: first.lemma,
      pos: primaryPos,
      forms,
      ...(first.article ? { article: first.article } : {}),
      alwaysReflexive: primary.every((p) => p.reflexive !== undefined),
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
