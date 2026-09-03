import type { GrammaticalCase, Rektion } from './schema';
import { rektionen } from './dataset.generated';

/**
 * The case is shown as a short tag — Akk / Dat / Gen — everywhere it has to fit in a row.
 *
 * It used to be the German school numeral (4. Fall), which is real vernacular and compact.
 * It failed the only test that counts: the first reader asked what the number meant. A
 * label nobody can read is not a signature, it is a cipher. The numbering survives in the
 * full label on the card, where there is room to teach it: "AKKUSATIV · 4. FALL".
 */
const CASE_NUMBER: Record<GrammaticalCase, number> = { gen: 2, dat: 3, akk: 4 };
const CASE_LABEL: Record<GrammaticalCase, string> = {
  gen: 'Genitiv',
  dat: 'Dativ',
  akk: 'Akkusativ',
};

const CASE_TAG: Record<GrammaticalCase, string> = { gen: 'Gen', dat: 'Dat', akk: 'Akk' };

export function caseNumber(value: GrammaticalCase): number {
  return CASE_NUMBER[value];
}

/** German in both locales — the learner meets Akkusativ and Dativ under those names. */
export function caseTag(value: GrammaticalCase): string {
  return CASE_TAG[value];
}

/** German in both locales: that is how the learner will meet it in a textbook. */
export function caseLabel(value: GrammaticalCase): string {
  return CASE_LABEL[value];
}

export function findRektion(id: string): Rektion | undefined {
  return rektionen.find((r) => r.id === id);
}
