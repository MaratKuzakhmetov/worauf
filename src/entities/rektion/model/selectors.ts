import type { GrammaticalCase, Rektion } from './schema';
import { rektionen } from './dataset.generated';

/**
 * The German school numbering — 1. Nominativ, 2. Genitiv, 3. Dativ, 4. Akkusativ. It is
 * live vernacular, not our invention, and it is what lets a case fit inside a list row
 * (docs/DESIGN.md §4). Colour is never the only carrier; this numeral is the other one.
 */
const CASE_NUMBER: Record<GrammaticalCase, number> = { gen: 2, dat: 3, akk: 4 };
const CASE_LABEL: Record<GrammaticalCase, string> = {
  gen: 'Genitiv',
  dat: 'Dativ',
  akk: 'Akkusativ',
};

export function caseNumber(value: GrammaticalCase): number {
  return CASE_NUMBER[value];
}

/** German in both locales: that is how the learner will meet it in a textbook. */
export function caseLabel(value: GrammaticalCase): string {
  return CASE_LABEL[value];
}

export function findRektion(id: string): Rektion | undefined {
  return rektionen.find((r) => r.id === id);
}
