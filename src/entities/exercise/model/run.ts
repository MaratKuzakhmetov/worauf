import type { Rektion } from '@/entities/rektion/model';
import type { Random } from './build';
import {
  reduce,
  resumeSession,
  startSession,
  type PatternWeight,
  type Session,
  type SessionAction,
  type SessionConfig,
  type StreamFor,
} from './session';

/**
 * A session that can be rebuilt from almost nothing.
 *
 * The trainer used to hold its session in component state, so changing the interface
 * language — or looking a word up in the browser and coming back — threw away a session in
 * progress and started a new one. Neither is a decision to abandon a drill; both are one
 * click.
 *
 * What gets stored is a SEED, the twelve pattern ids that were dealt, and the actions taken —
 * never the items themselves. The items are derived: same seed, same patterns, same items.
 * That keeps the stored record tiny, keeps it independent of the interface language (every
 * answer is German), and means the shape never has to migrate when an item gains a field.
 *
 * The pattern ids joined the record in phase 6. Selection now leans on stored history
 * (ADR 0005), and history changes with every answer — so a run that re-derived its twelve
 * patterns from the seed alone would deal a DIFFERENT twelve on restore, halfway through the
 * session it was restoring. Recording what was dealt is what keeps replay honest; twelve
 * short strings is a cheap price for it.
 */

export type Run = {
  readonly seed: number;
  /** The patterns this run was dealt, in order — the part selection cannot reproduce later. */
  readonly patternIds: readonly string[];
  readonly session: Session;
  readonly log: readonly SessionAction[];
};

const LCG_MODULUS = 233280;

/**
 * A linear congruential generator — the ZX81 constants. Not for anything that needs to be
 * unguessable; needed here only because `Math.random` cannot be replayed.
 */
export function seededRandom(seed: number): Random {
  let state = Math.abs(Math.floor(seed)) % LCG_MODULUS || 1;
  return () => {
    state = (state * 9301 + 49297) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * LCG_MODULUS) + 1;
}

/** FNV-1a, folded into the generator's range. Any stable string→number would do. */
function hashId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % LCG_MODULUS;
}

/**
 * One random stream per pattern, derived from the seed and the pattern's own id.
 *
 * The alternative — a single stream shared by every item — makes an item's options depend on
 * how many patterns happened to be considered and rejected before it. That is invisible until
 * something changes the order of consideration, and then a restored session quietly deals
 * different distractors than the one it replaced.
 */
export function streamsFor(seed: number): StreamFor {
  return (patternId: string) => seededRandom(seed + hashId(patternId));
}

export function startRun(
  all: readonly Rektion[],
  config: SessionConfig,
  seed: number = newSeed(),
  weight?: PatternWeight,
): Run {
  const streamFor = streamsFor(seed);
  const session = startSession(all, config, seededRandom(seed), streamFor, weight);
  return { seed, patternIds: patternIdsOf(session), session, log: [] };
}

/**
 * The patterns actually dealt, in order. Read off the fresh session rather than off the
 * planner, because the planner drops candidates that cannot make an item and only the
 * survivors matter.
 */
function patternIdsOf(session: Session): string[] {
  const items = session.current ? [session.current, ...session.queue] : [...session.queue];
  return items.map((item) => item.pattern.id);
}

export function advance(run: Run, action: SessionAction): Run {
  return { ...run, session: reduce(run.session, action), log: [...run.log, action] };
}

export type SavedRun = {
  readonly version: 2;
  readonly seed: number;
  /** Discards a run saved against a different dataset — a replayed seed would not match. */
  readonly patterns: number;
  /** What was dealt. Restoring re-derives the items from these, not from selection. */
  readonly patternIds: readonly string[];
  readonly log: readonly SessionAction[];
};

export function serialiseRun(run: Run, all: readonly Rektion[]): SavedRun {
  return {
    version: 2,
    seed: run.seed,
    patterns: all.length,
    patternIds: run.patternIds,
    log: run.log,
  };
}

export function restoreRun(
  saved: SavedRun,
  all: readonly Rektion[],
  config: SessionConfig,
): Run | null {
  if (saved.version !== 2 || saved.patterns !== all.length) return null;

  const session = resumeSession(saved.patternIds, all, config, streamsFor(saved.seed));
  if (!session) return null;

  let run: Run = { seed: saved.seed, patternIds: saved.patternIds, session, log: [] };
  for (const action of saved.log) run = advance(run, action);
  return run;
}

/** Narrows unknown parsed JSON — storage is not a trusted source, even our own. */
export function isSavedRun(value: unknown): value is SavedRun {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 2 &&
    typeof candidate.seed === 'number' &&
    typeof candidate.patterns === 'number' &&
    Array.isArray(candidate.patternIds) &&
    candidate.patternIds.every((id: unknown) => typeof id === 'string') &&
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
