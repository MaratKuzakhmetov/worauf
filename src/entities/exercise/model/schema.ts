import type { GrammaticalCase, Rektion } from '@/entities/rektion';

/**
 * An item is built from one pattern and always asks for something the learner cannot
 * derive. That is the whole design constraint: `mit` is always Dativ, so asking its case
 * tests nothing, and an item that tests nothing costs a slot in a twelve-item session.
 */
export type ItemKind =
  /** A real sentence with the preposition AND its article gapped — both retrievals at once. */
  | 'article'
  /** Which preposition does this word govern? */
  | 'preposition'
  /** Which case does this preposition take here? Only where the case is genuinely open. */
  | 'case';

export type Option = {
  readonly id: string;
  readonly label: string;
  readonly correct: boolean;
  /** The case this option would imply — shown in the debrief, not before the answer. */
  readonly case: GrammaticalCase;
  /**
   * True for the option that carries the whole design: the same preposition in a different
   * case. Little, Bjork, Bjork & Angello (2012) — a multiple-choice item only teaches when
   * its wrong alternatives are competitive (docs/TRAINER.md).
   */
  readonly competitive: boolean;
};

export type Item = {
  readonly id: string;
  readonly kind: ItemKind;
  readonly pattern: Rektion;
  /** The sentence with a gap, for the kinds that use one. */
  readonly sentence?: { readonly before: string; readonly after: string };
  readonly options: readonly Option[];
  /** The one right answer, as typed text — `auf den`, `auf`, `Akkusativ`. */
  readonly answer: string;
};

export type Verdict = 'right' | 'wrong';

export type Result = {
  readonly item: Item;
  readonly given: string;
  readonly verdict: Verdict;
};
