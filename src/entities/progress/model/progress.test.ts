import { describe, expect, it } from 'vitest';
import {
  WEIGHT_RESTING,
  WEIGHT_UNSEEN,
  emptyProgress,
  liveCards,
  orphans,
  ratingFor,
  recordReview,
  reviewCount,
  selectionWeight,
} from './progress';
import { DAY_MS } from './sm2';

const T0 = 1_700_000_000_000;
const V = 'abc123def456';

describe('recordReview', () => {
  it('creates a card the first time a pattern is answered', () => {
    const progress = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    expect(Object.keys(progress.cards)).toEqual(['warten-auf-akk']);
    expect(progress.cards['warten-auf-akk']?.reviews).toHaveLength(1);
  });

  it('accumulates the log across sessions', () => {
    let progress = emptyProgress(V, T0);
    progress = recordReview(progress, 'warten-auf-akk', 1, T0);
    progress = recordReview(progress, 'warten-auf-akk', 3, T0 + DAY_MS);

    expect(progress.cards['warten-auf-akk']?.reviews).toEqual([
      { ts: T0, rating: 1 },
      { ts: T0 + DAY_MS, rating: 3 },
    ]);
  });

  it('does not disturb other cards', () => {
    let progress = recordReview(emptyProgress(V, T0), 'a-auf-akk', 3, T0);
    const before = progress.cards['a-auf-akk'];
    progress = recordReview(progress, 'b-an-dat', 3, T0 + 1000);
    expect(progress.cards['a-auf-akk']).toBe(before);
  });
});

describe('ratingFor', () => {
  it('maps the binary verdict into the four-grade scale', () => {
    expect(ratingFor(true)).toBe(3);
    expect(ratingFor(false)).toBe(1);
  });
});

describe('selectionWeight', () => {
  it('gives an unseen pattern the baseline weight', () => {
    expect(selectionWeight(emptyProgress(V, T0), 'never-seen-akk', T0)).toBe(WEIGHT_UNSEEN);
  });

  it('damps a pattern that is not due yet, but never to zero', () => {
    const progress = recordReview(emptyProgress(V, T0), 'a-auf-akk', 3, T0);
    const weight = selectionWeight(progress, 'a-auf-akk', T0 + 1000);
    expect(weight).toBe(WEIGHT_RESTING);
    expect(weight).toBeGreaterThan(0);
  });

  it('raises a pattern that has been missed, so it comes back more often', () => {
    let progress = emptyProgress(V, T0);
    progress = recordReview(progress, 'hard-auf-akk', 1, T0);
    progress = recordReview(progress, 'hard-auf-akk', 1, T0 + DAY_MS);

    const later = T0 + 10 * DAY_MS;
    expect(selectionWeight(progress, 'hard-auf-akk', later)).toBeGreaterThan(WEIGHT_UNSEEN);
  });

  it('caps the bonus so one much-missed pattern cannot own the session', () => {
    let progress = emptyProgress(V, T0);
    for (let i = 0; i < 30; i += 1) progress = recordReview(progress, 'x-auf-akk', 1, T0 + i * DAY_MS);
    expect(selectionWeight(progress, 'x-auf-akk', T0 + 100 * DAY_MS)).toBeLessThanOrEqual(5);
  });
});

describe('dataset migration', () => {
  it('keeps the record of a pattern the dataset no longer has', () => {
    // Phase 5 rejected and re-added patterns repeatedly; a deleted history never comes back.
    const progress = recordReview(emptyProgress(V, T0), 'dropped-auf-akk', 3, T0);
    const known = new Set(['still-here-an-dat']);

    expect(orphans(progress, known).map((c) => c.id)).toEqual(['dropped-auf-akk']);
    expect(progress.cards['dropped-auf-akk']).toBeDefined();
  });

  it('excludes an orphan from the live set that scheduling sees', () => {
    let progress = recordReview(emptyProgress(V, T0), 'dropped-auf-akk', 3, T0);
    progress = recordReview(progress, 'live-an-dat', 3, T0);

    expect(liveCards(progress, new Set(['live-an-dat'])).map((c) => c.id)).toEqual(['live-an-dat']);
  });

  it('treats a newly added pattern as simply unseen', () => {
    const progress = recordReview(emptyProgress(V, T0), 'old-auf-akk', 3, T0);
    expect(progress.cards['brand-new-um-akk']).toBeUndefined();
    expect(selectionWeight(progress, 'brand-new-um-akk', T0)).toBe(WEIGHT_UNSEEN);
  });

  it('handles a corrected case as a removal plus an addition, orphaning the poisoned history', () => {
    /*
     * ADR 0005, finding 1: the case is inside the id, so `warten auf` moving from Akkusativ
     * to Dativ cannot mutate a record in place — it destroys one id and creates another. The
     * history the learner built on the wrong answer is left behind, not carried forward.
     */
    const progress = recordReview(emptyProgress(V, T0), 'warten-auf-akk', 3, T0);
    const afterCorrection = new Set(['warten-auf-dat']);

    expect(orphans(progress, afterCorrection).map((c) => c.id)).toEqual(['warten-auf-akk']);
    expect(selectionWeight(progress, 'warten-auf-dat', T0)).toBe(WEIGHT_UNSEEN);
  });
});

describe('reviewCount', () => {
  it('totals the log across every card', () => {
    let progress = recordReview(emptyProgress(V, T0), 'a-auf-akk', 3, T0);
    progress = recordReview(progress, 'a-auf-akk', 3, T0 + DAY_MS);
    progress = recordReview(progress, 'b-an-dat', 1, T0);
    expect(reviewCount(progress)).toBe(3);
  });
});
