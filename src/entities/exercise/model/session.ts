import type { Rektion } from '@/entities/rektion/model';
import { buildItem, isCorrect, kindsFor, shuffle, type Random } from './build';
import type { Item, Result } from './schema';

/**
 * A session, and still deliberately not a scheduler.
 *
 * Kim & Webb (2022) found equal and expanding spacing statistically equivalent, which means
 * a queue that brings a missed item back a few items later captures most of the spacing
 * effect. Phase 6 added stored history on top (ADR 0005), but only the quiet half of it: a
 * weight may make a missed pattern likelier to appear, and that is all. There is no due
 * queue, no backlog and no debt — the loop `docs/TRAINER.md` §6 argued against is still not
 * built, and this file is where that would have to happen if it ever were.
 */

export const SESSION_LENGTH = 12;

/**
 * How many items pass before a missed one returns. Three is far enough that the answer is
 * no longer in mind and near enough to land inside a twelve-item session.
 */
export const RETRY_GAP = 3;

export type SessionConfig = {
  readonly length: number;
};

export const defaultConfig: SessionConfig = { length: SESSION_LENGTH };

export type Session = {
  readonly queue: readonly Item[];
  readonly current: Item | null;
  /** null while the current item is unanswered — the debrief is what `given` turns on. */
  readonly given: string | null;
  readonly results: readonly Result[];
  /** How many NEW items have been served. A retry does not advance it. */
  readonly asked: number;
  readonly planned: number;
  readonly retried: readonly string[];
};

/**
 * How much likelier one pattern is to be drawn than an unseen one. Supplied from outside:
 * this entity has no idea that stored progress exists, and `entities/progress` has no idea
 * the trainer exists. The widget above both is what joins them (ADR 0005).
 */
export type PatternWeight = (patternId: string) => number;

/** A random source per pattern rather than one shared stream — see `streamsFor` in `run.ts`. */
export type StreamFor = (patternId: string) => Random;

/** Below this a weight would divide by ~zero and a pattern would become unreachable. */
const MIN_WEIGHT = 0.001;

/**
 * The order the session draws from.
 *
 * Without weights this is the plain shuffle it always was. With them it is weighted sampling
 * without replacement (Efraimidis & Spirakis): each pattern takes the key `u ** (1 / w)`, and
 * sorting by that key descending draws in proportion to `w`. A heavier pattern is likelier to
 * come early — never certain to, which matters: a deterministic "hardest first" would turn
 * every session into the same twelve failures.
 */
export function orderCandidates(
  all: readonly Rektion[],
  random: Random,
  weight?: PatternWeight,
): Rektion[] {
  if (!weight) return shuffle(all, random);

  return all
    .map((pattern) => ({
      pattern,
      key: Math.pow(random(), 1 / Math.max(weight(pattern.id), MIN_WEIGHT)),
    }))
    .sort((a, b) => b.key - a.key)
    .map((keyed) => keyed.pattern);
}

/**
 * Two patterns of one lemma never share a session. `sich freuen auf` answered as Akkusativ
 * hands over most of `sich freuen über`, and an item whose answer was just given tests
 * recognition of the last screen rather than knowledge of the language. This is a judgement
 * call about leakage, not a finding: the contrastive-learning literature would argue the
 * opposite, and the browser already shows the pair side by side, which is where the contrast
 * belongs (docs/TRAINER.md).
 *
 * Candidates come in already ordered, and each item is built from its OWN random stream. That
 * second part is what lets a run be restored from a list of pattern ids: an item's options
 * depend on its pattern and the seed, never on how many patterns were considered and skipped
 * before it.
 */
export function planItems(
  candidates: readonly Rektion[],
  all: readonly Rektion[],
  config: SessionConfig,
  streamFor: StreamFor,
): Item[] {
  const items: Item[] = [];
  const usedLemmas = new Set<string>();

  for (const pattern of candidates) {
    if (items.length >= config.length) break;
    if (usedLemmas.has(pattern.lemma)) continue;

    const random = streamFor(pattern.id);
    const kind = shuffle(kindsFor(pattern, all), random)[0];
    if (!kind) continue;

    const item = buildItem(pattern, kind, all, random);
    if (!item) continue;

    items.push(item);
    usedLemmas.add(pattern.lemma);
  }
  return items;
}

export function sessionFrom(items: readonly Item[]): Session {
  const [first, ...rest] = items;
  return {
    queue: rest,
    current: first ?? null,
    given: null,
    results: [],
    asked: first ? 1 : 0,
    planned: items.length,
    retried: [],
  };
}

export function startSession(
  all: readonly Rektion[],
  config: SessionConfig,
  selection: Random,
  streamFor: StreamFor,
  weight?: PatternWeight,
): Session {
  return sessionFrom(planItems(orderCandidates(all, selection, weight), all, config, streamFor));
}

/**
 * Rebuilds a session from the pattern ids it was planned with, skipping selection entirely.
 * Returns null if the dataset no longer has one of them.
 */
export function resumeSession(
  patternIds: readonly string[],
  all: readonly Rektion[],
  config: SessionConfig,
  streamFor: StreamFor,
): Session | null {
  const byId = new Map(all.map((pattern) => [pattern.id, pattern]));
  const patterns: Rektion[] = [];
  for (const id of patternIds) {
    const pattern = byId.get(id);
    if (!pattern) return null;
    patterns.push(pattern);
  }
  return sessionFrom(planItems(patterns, all, config, streamFor));
}

export type SessionAction =
  | { type: 'answer'; given: string }
  | { type: 'next' }
  /** Ends the session on demand, before the queue is empty — see `docs/TRAINER.md` §6. */
  | { type: 'finish' };

export function reduce(session: Session, action: SessionAction): Session {
  if (action.type === 'finish') {
    // Whatever was already answered stays in `results` and counts toward the score; the
    // item on screen, if any, is simply dropped rather than being forced to a verdict —
    // it was never attempted, so `score()` must not count it either way.
    return { ...session, current: null, given: null, queue: [] };
  }

  if (action.type === 'answer') {
    const item = session.current;
    if (!item || session.given !== null) return session;

    const verdict = isCorrect(item, action.given) ? 'right' : 'wrong';
    const result: Result = { item, given: action.given, verdict };

    // A missed item comes back once. Twice would turn a session into a war of attrition
    // over the one pattern the learner does not know yet, which is not what spacing is.
    const repeat = verdict === 'wrong' && !session.retried.includes(item.id);
    const queue = repeat
      ? [
          ...session.queue.slice(0, RETRY_GAP),
          item,
          ...session.queue.slice(RETRY_GAP),
        ]
      : session.queue;

    return {
      ...session,
      given: action.given,
      results: [...session.results, result],
      queue,
      retried: repeat ? [...session.retried, item.id] : session.retried,
    };
  }

  const [next, ...rest] = session.queue;
  if (!next) return { ...session, current: null, given: null };

  const isRetry = session.retried.includes(next.id);
  return {
    ...session,
    queue: rest,
    current: next,
    given: null,
    asked: isRetry ? session.asked : session.asked + 1,
  };
}

export function isFinished(session: Session): boolean {
  return session.current === null;
}

export function score(session: Session): { right: number; total: number } {
  // Only the FIRST answer to an item counts. A retry that finally lands is the queue doing
  // its job, not evidence the pattern was known.
  const seen = new Set<string>();
  let right = 0;
  for (const result of session.results) {
    if (seen.has(result.item.id)) continue;
    seen.add(result.item.id);
    if (result.verdict === 'right') right += 1;
  }
  return { right, total: seen.size };
}
