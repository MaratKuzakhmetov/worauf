import { z } from 'zod';

/**
 * The stored progress record (ADR 0005).
 *
 * Validated by the same Zod that validates the dataset pipeline, because an imported file is
 * not a trusted source even when this application wrote it — and neither is our own
 * IndexedDB, which a previous version of this code may have filled.
 */

export const PROGRESS_SCHEMA_VERSION = 1;

/**
 * The FSRS scale, 1–4 (again / hard / good / easy), even though the trainer only ever
 * produces a binary verdict today.
 *
 * This is the one decision in the file that cannot be revisited later: a log written in its
 * own binary vocabulary can never be replayed into a model that expects four grades, while a
 * binary log recorded in the 1–4 vocabulary widens for free. Room for `hard` and `easy` costs
 * nothing today and is unreachable in hindsight.
 */
export const reviewRating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type ReviewRating = z.infer<typeof reviewRating>;

export const reviewEntry = z.object({
  ts: z.number().int().nonnegative(),
  rating: reviewRating,
});

export const card = z.object({
  /** `Rektion.id` — `warten-auf-akk`. The case is part of it, and ADR 0005 depends on that. */
  id: z.string().min(1),
  /** The merge unit on import: per card, the later write wins. */
  updatedAt: z.number().int().nonnegative(),

  // SM-2 — populated now.
  due: z.number().int().nonnegative(),
  interval: z.number().nonnegative(),
  ease: z.number().positive(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),

  /*
   * FSRS-shaped, and deliberately null for the whole SM-2 era. The temptation is to write
   * something "roughly right" here; it must be named and refused. `ts-fsrs` seeds its model
   * from populated fields and skips replaying the log, so an invented value quietly corrupts
   * the model for the rest of that progress file's life. Null honestly says "no data, read
   * `reviews`".
   */
  stability: z.number().nullable(),
  difficulty: z.number().nullable(),
  lastReview: z.number().int().nonnegative().nullable(),

  /** Never truncated: the one asset here that cannot be recomputed. */
  reviews: z.array(reviewEntry),
});
export type Card = z.infer<typeof card>;

export const progressFile = z.object({
  schemaVersion: z.number().int().positive(),
  updatedAt: z.number().int().nonnegative(),
  datasetVersion: z.string(),
  cards: z.record(z.string(), card),
});
export type ProgressFile = z.infer<typeof progressFile>;

/** The export envelope (ADR 0005). `cards` is the same shape, so a file merges card by card. */
export const progressExport = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.number().int().nonnegative(),
  appVersion: z.string(),
  datasetVersion: z.string(),
  cards: z.record(z.string(), card),
});
export type ProgressExport = z.infer<typeof progressExport>;
