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
    expect(isSavedRun(null)).toBe(false);
    expect(isSavedRun({ version: 2, seed: 1, patterns: 1, log: [] })).toBe(false);
    expect(isSavedRun({ version: 1, seed: 1, patterns: 1, log: [{ type: 'boom' }] })).toBe(false);
    expect(isSavedRun({ version: 1, seed: 1, patterns: 1, log: [{ type: 'next' }] })).toBe(true);
  });
});
