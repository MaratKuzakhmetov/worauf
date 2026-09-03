import type { Rektion } from '@/entities/rektion/model';
import type { Random } from './build';
import { reduce, startSession, type Session, type SessionAction, type SessionConfig } from './session';

/**
 * A session that can be rebuilt from almost nothing.
 *
 * The trainer used to hold its session in component state, so changing the interface
 * language — or looking a word up in the browser and coming back — threw away a session in
 * progress and started a new one. Neither is a decision to abandon a drill; both are one
 * click.
 *
 * What gets stored is a SEED and the list of actions taken, never the items themselves. The
 * items are derived: same seed, same dataset, same twelve items in the same order. That
 * keeps the stored record tiny, keeps it independent of the interface language (every
 * answer is German), and means the shape never has to migrate when an item gains a field.
 */

export type Run = {
  readonly seed: number;
  readonly session: Session;
  readonly log: readonly SessionAction[];
};

/**
 * A linear congruential generator — the ZX81 constants. Not for anything that needs to be
 * unguessable; needed here only because `Math.random` cannot be replayed.
 */
export function seededRandom(seed: number): Random {
  let state = Math.abs(Math.floor(seed)) % 233280 || 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 233280) + 1;
}

export function startRun(
  all: readonly Rektion[],
  config: SessionConfig,
  seed: number = newSeed(),
): Run {
  return { seed, session: startSession(all, config, seededRandom(seed)), log: [] };
}

export function advance(run: Run, action: SessionAction): Run {
  return { ...run, session: reduce(run.session, action), log: [...run.log, action] };
}

export type SavedRun = {
  readonly version: 1;
  readonly seed: number;
  /** Discards a run saved against a different dataset — a replayed seed would not match. */
  readonly patterns: number;
  readonly log: readonly SessionAction[];
};

export function serialiseRun(run: Run, all: readonly Rektion[]): SavedRun {
  return { version: 1, seed: run.seed, patterns: all.length, log: run.log };
}

export function restoreRun(
  saved: SavedRun,
  all: readonly Rektion[],
  config: SessionConfig,
): Run | null {
  if (saved.version !== 1 || saved.patterns !== all.length) return null;
  let run = startRun(all, config, saved.seed);
  for (const action of saved.log) run = advance(run, action);
  return run;
}

/** Narrows unknown parsed JSON — storage is not a trusted source, even our own. */
export function isSavedRun(value: unknown): value is SavedRun {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    typeof candidate.seed === 'number' &&
    typeof candidate.patterns === 'number' &&
    Array.isArray(candidate.log) &&
    candidate.log.every(
      (action: unknown) =>
        typeof action === 'object' &&
        action !== null &&
        ((action as SessionAction).type === 'next' ||
          (action as SessionAction).type === 'finish' ||
          ((action as SessionAction).type === 'answer' &&
            typeof (action as { given?: unknown }).given === 'string')),
    )
  );
}
