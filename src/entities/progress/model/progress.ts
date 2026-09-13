import { newCard, reviewCard } from './sm2';
import { PROGRESS_SCHEMA_VERSION, type Card, type ProgressFile, type ReviewRating } from './schema';

export function emptyProgress(datasetVersion: string, now: number): ProgressFile {
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, updatedAt: now, datasetVersion, cards: {} };
}

/** A binary trainer verdict in the four-grade vocabulary the log is kept in (ADR 0005). */
export function ratingFor(correct: boolean): ReviewRating {
  return correct ? 3 : 1;
}

export function recordReview(
  progress: ProgressFile,
  id: string,
  rating: ReviewRating,
  now: number,
): ProgressFile {
  const existing = progress.cards[id] ?? newCard(id, now);
  return {
    ...progress,
    updatedAt: now,
    cards: { ...progress.cards, [id]: reviewCard(existing, rating, now) },
  };
}

/**
 * How much more often a pattern should come up than an unseen one.
 *
 * This is the whole of what stored history is allowed to do to the interface (ADR 0005, and
 * the 2026-09-09 update to `docs/TRAINER.md` §6): it reorders the pool quietly. There is no
 * due count, no backlog, no streak, and nothing here is ever rendered. A learner who opens
 * the trainer sees twelve items exactly as before — the ones they keep missing are simply
 * likelier to be among them.
 *
 * A seen-and-not-due pattern is damped, never excluded. Zero would make sessions unfillable
 * once most of the dataset is known, and would turn "what is due" into a hard gate — which is
 * the review-debt loop wearing a different hat.
 */
export const WEIGHT_UNSEEN = 1;
export const WEIGHT_RESTING = 0.25;
const MAX_LAPSE_BONUS = 4;

export function selectionWeight(progress: ProgressFile, id: string, now: number): number {
  const card = progress.cards[id];
  if (!card) return WEIGHT_UNSEEN;
  if (card.due > now) return WEIGHT_RESTING;
  return 1 + Math.min(card.lapses, MAX_LAPSE_BONUS);
}

/**
 * Migration when the dataset changes (ADR 0005). There is no code path here for "the case was
 * corrected": the case is part of `Rektion.id`, so that edit arrives as a removal plus an
 * addition and is handled by the two rules that do exist. The poisoned history orphans
 * itself.
 */

/** A pattern the dataset no longer has. Kept — this project re-adds patterns it once dropped. */
export function orphans(progress: ProgressFile, knownIds: ReadonlySet<string>): readonly Card[] {
  return Object.values(progress.cards).filter((card) => !knownIds.has(card.id));
}

/** Cards that still correspond to a live pattern; the only ones scheduling may consider. */
export function liveCards(progress: ProgressFile, knownIds: ReadonlySet<string>): readonly Card[] {
  return Object.values(progress.cards).filter((card) => knownIds.has(card.id));
}

export function reviewCount(progress: ProgressFile): number {
  return Object.values(progress.cards).reduce((total, card) => total + card.reviews.length, 0);
}
