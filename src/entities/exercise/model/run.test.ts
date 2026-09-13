import { describe, expect, it } from 'vitest';
import { rektionen } from '@/entities/rektion';
import { isFinished, score } from './session';
import {
  advance,
  isSavedRun,
  restoreRun,
  seededRandom,
  serialiseRun,
  startRun,
  type Run,
} from './run';

const config = { length: 12 };

function play(run: Run, answers: readonly string[]): Run {
  let next = run;
  for (const given of answers) {
    next = advance(next, { type: 'answer', given });
    next = advance(next, { type: 'next' });
  }
  return next;
}

describe('seededRandom', () => {
  it('repeats exactly for the same seed and differs for another', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(Array.from({ length: 5 }, () => c())).not.toEqual(first);
  });

  it('spreads across the unit interval rather than sitting in a band', () => {
    const random = seededRandom(3);
    const draws = Array.from({ length: 200 }, () => random());
    expect(Math.min(...draws)).toBeLessThan(0.1);
    expect(Math.max(...draws)).toBeGreaterThan(0.9);
  });
});

describe('a run rebuilt from its seed', () => {
  it('deals the same twelve items in the same order', () => {
    const a = startRun(rektionen, config, 4242);
    const b = startRun(rektionen, config, 4242);
    expect(b.session.current?.id).toBe(a.session.current?.id);
    expect(b.session.queue.map((i) => i.id)).toEqual(a.session.queue.map((i) => i.id));
  });
});

describe('saving and restoring mid-session', () => {
  it('comes back on the same item, with the same score behind it', () => {
    const started = startRun(rektionen, config, 99);
    const played = play(started, ['wrong', 'wrong', 'wrong']);

    const restored = restoreRun(serialiseRun(played, rektionen), rektionen, config);
    expect(restored).not.toBeNull();
    expect(restored?.session.current?.id).toBe(played.session.current?.id);
    expect(restored?.session.asked).toBe(played.session.asked);
    expect(restored && score(restored.session)).toEqual(score(played.session));
  });

  it('comes back on the debrief when the answer was given but Next was not pressed', () => {
    const started = startRun(rektionen, config, 5);
    const answered = advance(started, { type: 'answer', given: 'wrong' });
    const restored = restoreRun(serialiseRun(answered, rektionen), rektionen, config);
    expect(restored?.session.given).toBe('wrong');
  });

  it('keeps the missed queue, so a retry still comes back after restoring', () => {
    const started = startRun(rektionen, config, 11);
    const missed = started.session.current;
    const played = play(started, ['wrong']);
    const restored = restoreRun(serialiseRun(played, rektionen), rektionen, config);
    expect(restored?.session.queue.map((i) => i.id)).toContain(missed?.id);
    expect(restored?.session.retried).toEqual(played.session.retried);
  });

  it('restores a finished run as finished', () => {
    let run = startRun(rektionen, config, 21);
    let guard = 0;
    while (!isFinished(run.session) && guard < 80) {
      run = play(run, [run.session.current?.answer ?? '']);
      guard += 1;
    }
    const restored = restoreRun(serialiseRun(run, rektionen), rektionen, config);
    expect(restored && isFinished(restored.session)).toBe(true);
  });
});

describe('replaying a run that was finished early', () => {
  it('comes back finished, even though it never reached the last item', () => {
    const started = startRun(rektionen, config, 55);
    const finished = advance(started, { type: 'finish' });
    const restored = restoreRun(serialiseRun(finished, rektionen), rektionen, config);
    expect(restored && isFinished(restored.session)).toBe(true);
    expect(restored && score(restored.session)).toEqual(score(finished.session));
  });
});

describe('a saved run that cannot be trusted', () => {
  it('is discarded when the dataset it was built against has changed', () => {
    const run = startRun(rektionen, config, 3);
    const saved = { ...serialiseRun(run, rektionen), patterns: 999 };
    expect(restoreRun(saved, rektionen, config)).toBeNull();
  });

  it('is rejected before parsing when the shape is wrong', () => {
    const ok = { version: 2, seed: 1, patterns: 1, patternIds: ['warten-auf-akk'], log: [] };
    expect(isSavedRun(null)).toBe(false);
    expect(isSavedRun(ok)).toBe(true);
    expect(isSavedRun({ ...ok, log: [{ type: 'next' }] })).toBe(true);
    expect(isSavedRun({ ...ok, log: [{ type: 'boom' }] })).toBe(false);
    expect(isSavedRun({ ...ok, patternIds: [42] })).toBe(false);
  });

  it('discards a run written by the previous version rather than misreading it', () => {
    // v1 had no `patternIds`, so its twelve items cannot be re-derived now that selection
    // depends on stored history. A dropped run costs one drill; a misread one deals a
    // different session halfway through the one it claims to be restoring.
    expect(isSavedRun({ version: 1, seed: 1, patterns: 1, log: [{ type: 'next' }] })).toBe(false);
  });

  it('discards a run whose pattern is no longer in the dataset', () => {
    const run = startRun(rektionen, config, 3);
    const saved = { ...serialiseRun(run, rektionen), patternIds: ['no-such-pattern-akk'] };
    expect(restoreRun(saved, rektionen, config)).toBeNull();
  });
});

describe('weighted selection', () => {
  it('draws a heavily weighted pattern more often than an unweighted one', () => {
    const favoured = rektionen[100]?.id ?? '';
    let withWeight = 0;
    let without = 0;

    for (let seed = 1; seed <= 60; seed += 1) {
      const heavy = startRun(rektionen, config, seed, (id) => (id === favoured ? 200 : 1));
      if (heavy.patternIds.includes(favoured)) withWeight += 1;
      if (startRun(rektionen, config, seed).patternIds.includes(favoured)) without += 1;
    }

    expect(withWeight).toBeGreaterThan(without);
  });

  it('still fills a whole session, and still never repeats a lemma', () => {
    // A weight must not be able to starve the session: everything stays reachable.
    const run = startRun(rektionen, config, 7, () => 0.25);
    const lemmas = [run.session.current, ...run.session.queue].map((i) => i?.pattern.lemma);
    expect(run.session.planned).toBe(12);
    expect(new Set(lemmas).size).toBe(lemmas.length);
  });

  it('restores a weighted run exactly, even though the weights have since changed', () => {
    /*
     * The reason `patternIds` is stored at all. History changes with every answer, so
     * re-running selection at restore time would deal a different twelve — mid-session.
     */
    const started = startRun(rektionen, config, 31, (id) => (id.endsWith('-akk') ? 50 : 1));
    const played = play(started, ['wrong', 'wrong']);
    const restored = restoreRun(serialiseRun(played, rektionen), rektionen, config);

    expect(restored?.patternIds).toEqual(played.patternIds);
    expect(restored?.session.current?.id).toBe(played.session.current?.id);
    expect(restored?.session.queue.map((i) => i.id)).toEqual(
      played.session.queue.map((i) => i.id),
    );
  });

  it('builds an item identically wherever it lands in the order', () => {
    // Per-pattern streams: an item's options must not depend on how many patterns were
    // considered and skipped before it.
    const a = startRun(rektionen, config, 12);
    const b = startRun(rektionen, config, 12, (id) => (id === a.patternIds[5] ? 500 : 1));

    const target = a.patternIds[5];
    const fromA = [a.session.current, ...a.session.queue].find((i) => i?.pattern.id === target);
    const fromB = [b.session.current, ...b.session.queue].find((i) => i?.pattern.id === target);

    expect(fromB).toBeDefined();
    expect(fromB?.id).toBe(fromA?.id);
    expect(fromB?.options.map((o) => o.label)).toEqual(fromA?.options.map((o) => o.label));
  });
});
