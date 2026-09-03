import { describe, expect, it } from 'vitest';
import { rektionen } from '@/entities/rektion';
import { isFinished, planItems, reduce, score, startSession, RETRY_GAP } from './session';
import type { Session } from './session';

const config = { length: 12 };
/**
 * A deterministic source that actually spreads. The first version normalised before feeding
 * back — `(value * 9301 + 49297) % 233280 / 233280` with `value` already in [0,1) — which
 * pins every draw into [0.211, 0.251]. Every shuffle in the suite was then an identity, and
 * the tests that passed were testing one arrangement each.
 */
function source(seed = 1): () => number {
  let state = Math.floor(seed * 233280) || 1;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function answer(session: Session, given: string): Session {
  return reduce(reduce(session, { type: 'answer', given }), { type: 'next' });
}

describe('planning', () => {
  it('fills a full session from the real dataset', () => {
    expect(planItems(rektionen, config, source())).toHaveLength(12);
  });

  it('never puts two patterns of one lemma in the same session', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const lemmas = planItems(rektionen, config, source(seed / 21)).map((i) => i.pattern.lemma);
      expect(new Set(lemmas).size).toBe(lemmas.length);
    }
  });

  it('reaches every kind of item across a run of sessions', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const item of planItems(rektionen, config, source(seed / 21))) kinds.add(item.kind);
    }
    expect([...kinds].sort()).toEqual(['article', 'case', 'preposition']);
  });
});

describe('a session played to the end', () => {
  it('completes twelve items when every answer is right', () => {
    let session = startSession(rektionen, config, source());
    let guard = 0;
    while (!isFinished(session) && guard < 50) {
      session = answer(session, session.current?.answer ?? '');
      guard += 1;
    }
    expect(isFinished(session)).toBe(true);
    expect(score(session)).toEqual({ right: 12, total: 12 });
  });

  it('completes when every answer is wrong, and asks each missed item once more', () => {
    let session = startSession(rektionen, config, source(0.7));
    let served = 0;
    let guard = 0;
    while (!isFinished(session) && guard < 80) {
      served += 1;
      session = answer(session, 'definitely wrong');
      guard += 1;
    }
    expect(isFinished(session)).toBe(true);
    // Twelve items, each seen twice: once missed, once retried — never a third time.
    expect(served).toBe(24);
    expect(score(session)).toEqual({ right: 0, total: 12 });
  });
});

describe('the missed queue', () => {
  it('brings a missed item back after intervening items, not immediately', () => {
    const session = startSession(rektionen, config, source());
    const missed = session.current;
    const after = reduce(session, { type: 'answer', given: 'wrong' });
    expect(after.queue[RETRY_GAP]?.id).toBe(missed?.id);
    expect(after.queue[0]?.id).not.toBe(missed?.id);
  });

  it('does not count a retry as a new item', () => {
    let session = startSession(rektionen, config, source());
    const first = session.asked;
    session = answer(session, 'wrong');
    for (let i = 0; i < RETRY_GAP; i += 1) session = answer(session, session.current?.answer ?? '');
    expect(session.asked).toBe(first + RETRY_GAP);
    expect(session.planned).toBe(12);
  });

  it('scores the first answer, never the retry that finally lands', () => {
    let session = startSession(rektionen, config, source());
    const missed = session.current;
    session = answer(session, 'wrong');
    for (let i = 0; i < RETRY_GAP; i += 1) session = answer(session, session.current?.answer ?? '');
    expect(session.current?.id).toBe(missed?.id);
    session = answer(session, missed?.answer ?? '');
    expect(score(session).right).toBe(RETRY_GAP);
  });
});

describe('the reducer', () => {
  it('ignores a second answer to the same item', () => {
    const session = startSession(rektionen, config, source());
    const once = reduce(session, { type: 'answer', given: 'wrong' });
    const twice = reduce(once, { type: 'answer', given: once.current?.answer ?? '' });
    expect(twice.results).toHaveLength(1);
  });
});

describe('finishing early', () => {
  it('ends the session immediately — isFinished is true with items still unasked', () => {
    const session = startSession(rektionen, config, source());
    expect(isFinished(session)).toBe(false);
    const finished = reduce(session, { type: 'finish' });
    expect(isFinished(finished)).toBe(true);
    expect(finished.queue).toEqual([]);
  });

  it('keeps whatever was already answered in the score', () => {
    let session = startSession(rektionen, config, source());
    session = answer(session, session.current?.answer ?? '');
    session = answer(session, 'wrong');
    const finished = reduce(session, { type: 'finish' });
    expect(score(finished)).toEqual({ right: 1, total: 2 });
  });

  it('drops the item on screen when it was never answered', () => {
    let session = startSession(rektionen, config, source());
    session = answer(session, session.current?.answer ?? '');
    // The next item is now current but unanswered — finishing must not force a verdict on it.
    const totalBefore = score(session).total;
    const finished = reduce(session, { type: 'finish' });
    expect(score(finished).total).toBe(totalBefore);
  });

  it('still counts an answer given right before finishing, even if Next was never pressed', () => {
    const session = startSession(rektionen, config, source());
    const answered = reduce(session, { type: 'answer', given: 'wrong' });
    const finished = reduce(answered, { type: 'finish' });
    expect(score(finished)).toEqual({ right: 0, total: 1 });
  });

  it('does nothing further once already finished', () => {
    const session = startSession(rektionen, config, source());
    const finished = reduce(session, { type: 'finish' });
    const again = reduce(finished, { type: 'finish' });
    expect(again).toEqual(finished);
  });
});
