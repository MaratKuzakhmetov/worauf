import { describe, expect, it } from 'vitest';
import { words } from '@/entities/rektion';
import { nearest } from './suggest';

function lemmas(query: string): readonly string[] {
  return nearest(words, query).map((word) => word.lemma);
}

describe('nearest', () => {
  it('recovers a word from a one-letter slip', () => {
    expect(lemmas('bestehn')).toContain('bestehen');
  });

  it('recovers a word typed without its umlaut', () => {
    expect(lemmas('argern')).toContain('ärgern');
  });

  it('suggests nothing for a short query — every short word is one edit from another', () => {
    expect(nearest(words, 'an')).toEqual([]);
    expect(nearest(words, 'aus')).toEqual([]);
  });

  it('suggests nothing when the query resembles nothing in the base', () => {
    expect(nearest(words, 'qwertyuiop')).toEqual([]);
  });

  it('returns at most three, closest first', () => {
    const hits = nearest(words, 'warteb');
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits[0]?.lemma).toBe('warten');
  });
});
