import type { Card, ReviewRating } from './schema';

/**
 * SM-2, textbook version. Chosen by `PLAN.md` phase 6; FSRS is the better default in 2026 and
 * is exactly why the record is FSRS-shaped and the log is written in the 1–4 scale — swapping
 * the scheduler later is a code change, not a data migration (ADR 0005).
 */

export const DAY_MS = 86_400_000;

/** The ease factor floor from the original algorithm: below it, intervals stop growing. */
export const MIN_EASE = 1.3;
const START_EASE = 2.5;

/**
 * FSRS grade → SM-2 quality. SM-2 counts anything under 3 as a lapse, so `again` has to land
 * below that line and the other three above it.
 */
const QUALITY: Record<ReviewRating, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };

export function newCard(id: string, now: number): Card {
  return {
    id,
    updatedAt: now,
    due: now,
    interval: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0,
    stability: null,
    difficulty: null,
    lastReview: null,
    reviews: [],
  };
}

/** The ease update from the original SM-2 paper, applied on every review, floored at 1.3. */
export function nextEase(ease: number, quality: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return Math.max(MIN_EASE, ease + delta);
}

export function nextInterval(reps: number, interval: number, ease: number): number {
  if (reps <= 1) return 1;
  if (reps === 2) return 6;
  return Math.round(interval * ease);
}

/**
 * One review. Pure: the caller supplies `now`, so every schedule in the tests is exact rather
 * than approximately today.
 */
export function reviewCard(card: Card, rating: ReviewRating, now: number): Card {
  const quality = QUALITY[rating];
  const failed = quality < 3;

  const ease = nextEase(card.ease, quality);
  const reps = failed ? 0 : card.reps + 1;
  const interval = failed ? 1 : nextInterval(reps, card.interval, ease);

  return {
    ...card,
    updatedAt: now,
    ease,
    reps,
    interval,
    lapses: failed ? card.lapses + 1 : card.lapses,
    due: now + interval * DAY_MS,
    lastReview: now,
    // Still null: see the comment on the field in `schema.ts`.
    stability: card.stability,
    difficulty: card.difficulty,
    reviews: [...card.reviews, { ts: now, rating }],
  };
}
