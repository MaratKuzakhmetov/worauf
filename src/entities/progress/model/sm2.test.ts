import { describe, expect, it } from 'vitest';
import { DAY_MS, MIN_EASE, newCard, nextEase, nextInterval, reviewCard } from './sm2';

const T0 = 1_700_000_000_000;

describe('newCard', () => {
  it('starts unseen, due now, with the textbook ease', () => {
    const card = newCard('warten-auf-akk', T0);
    expect(card).toMatchObject({ reps: 0, lapses: 0, interval: 0, ease: 2.5, due: T0 });
  });

  it('leaves the FSRS fields null rather than guessing them', () => {
    // The whole migration path depends on this: ts-fsrs seeds from populated fields and
    // skips the log, so a plausible-looking value here corrupts the model permanently.
    const card = newCard('warten-auf-akk', T0);
    expect(card.stability).toBeNull();
    expect(card.difficulty).toBeNull();
    expect(card.lastReview).toBeNull();
  });
});

describe('nextInterval', () => {
  it('walks 1 day, 6 days, then multiplies by ease', () => {
    expect(nextInterval(1, 0, 2.5)).toBe(1);
    expect(nextInterval(2, 1, 2.5)).toBe(6);
    expect(nextInterval(3, 6, 2.5)).toBe(15);
  });
});

describe('nextEase', () => {
  it('rises on an easy answer and falls on a poor one', () => {
    expect(nextEase(2.5, 5)).toBeCloseTo(2.6, 5);
    expect(nextEase(2.5, 4)).toBeCloseTo(2.5, 5);
    expect(nextEase(2.5, 2)).toBeLessThan(2.5);
  });

  it('never drops below the 1.3 floor', () => {
    let ease = 2.5;
    for (let i = 0; i < 50; i += 1) ease = nextEase(ease, 2);
    expect(ease).toBe(MIN_EASE);
  });
});

describe('reviewCard', () => {
  it('schedules a correct first answer one day out', () => {
    const card = reviewCard(newCard('a-auf-akk', T0), 3, T0);
    expect(card.reps).toBe(1);
    expect(card.interval).toBe(1);
    expect(card.due).toBe(T0 + DAY_MS);
    expect(card.lapses).toBe(0);
  });

  it('grows the interval across a streak', () => {
    let card = newCard('a-auf-akk', T0);
    card = reviewCard(card, 3, T0);
    card = reviewCard(card, 3, T0 + DAY_MS);
    expect(card.interval).toBe(6);
    card = reviewCard(card, 3, T0 + 7 * DAY_MS);
    expect(card.interval).toBeGreaterThan(6);
  });

  it('resets the streak and counts a lapse on a wrong answer', () => {
    let card = newCard('a-auf-akk', T0);
    card = reviewCard(card, 3, T0);
    card = reviewCard(card, 3, T0 + DAY_MS);
    const lapsed = reviewCard(card, 1, T0 + 2 * DAY_MS);

    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.ease).toBeLessThan(card.ease);
  });

  it('appends every review to the log in the 1-4 scale, and never truncates it', () => {
    let card = newCard('a-auf-akk', T0);
    for (let i = 0; i < 40; i += 1) card = reviewCard(card, i % 3 === 0 ? 1 : 3, T0 + i * DAY_MS);

    expect(card.reviews).toHaveLength(40);
    expect(card.reviews[0]).toEqual({ ts: T0, rating: 1 });
    expect(card.reviews.every((r) => r.rating >= 1 && r.rating <= 4)).toBe(true);
  });

  it('still refuses to invent the FSRS fields after many reviews', () => {
    let card = newCard('a-auf-akk', T0);
    for (let i = 0; i < 10; i += 1) card = reviewCard(card, 3, T0 + i * DAY_MS);
    expect(card.stability).toBeNull();
    expect(card.difficulty).toBeNull();
  });
});
