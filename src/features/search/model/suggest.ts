import type { WordEntry } from '@/entities/rektion';
import { editDistance, typoTolerance } from './distance';
import { foldVariants } from './fold';

/**
 * "Nothing found" is a dead end; the nearest spellings are navigation (docs/DESIGN.md §8).
 * A learner who half-remembers a word misspells it by a letter or two — `bestehn`,
 * `sich freun` — and the honest answer is not silence but the word they meant.
 */

export function nearest(
  words: readonly WordEntry[],
  query: string,
  limit = 3,
): readonly WordEntry[] {
  const variants = foldVariants(query);
  const first = variants[0];
  if (first === undefined || first.length < 3) return [];

  const allowed = typoTolerance(first.length);
  if (allowed === 0) return [];

  const scored: { word: WordEntry; score: number }[] = [];
  words.forEach((word) => {
    let best = allowed + 1;
    for (const head of foldVariants(word.lemma)) {
      for (const variant of variants) {
        best = Math.min(best, editDistance(variant, head, allowed));
      }
    }
    if (best <= allowed) scored.push({ word, score: best });
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(({ word }) => word);
}
