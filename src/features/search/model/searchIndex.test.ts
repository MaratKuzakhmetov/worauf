import { describe, expect, it } from 'vitest';
import { rektionen } from '@/entities/rektion';
import { indexFor, search } from './searchIndex';

/** Real records, never invented German (CLAUDE.md). */
function find(query: string, locale: 'en' | 'ru' = 'en'): readonly string[] {
  return search(indexFor(locale), query).patterns.map((p) => `${p.lemma} ${p.prep}`);
}

function isApproximate(query: string, locale: 'en' | 'ru' = 'en'): boolean {
  return search(indexFor(locale), query).approximate;
}

describe('search', () => {
  it('finds a word by its exact lemma', () => {
    expect(find('warten')[0]).toBe('warten auf');
  });

  it('finds a word from a prefix, because people type while thinking', () => {
    expect(find('bes').join(' | ')).toContain('bestehen');
  });

  it('finds an umlaut word typed without an umlaut, both ways', () => {
    expect(find('gehoren')).toContain('gehören zu');
    expect(find('gehören')).toContain('gehören zu');
    expect(find('gehoeren')).toContain('gehören zu');
  });

  it('finds words by the preposition they govern', () => {
    expect(find('aus')).toContain('bestehen aus');
  });

  it('returns one row per pattern, so a minimal pair arrives as a pair', () => {
    const hits = find('freuen');
    expect(hits).toContain('freuen auf');
    expect(hits).toContain('freuen über');
  });

  it('requires every token to match', () => {
    expect(find('warten auf')).toEqual(['warten auf']);
    expect(find('warten aus')).toEqual([]);
  });

  it('puts the headword itself above a gloss-only match', () => {
    expect(find('denken')[0]).toBe('denken an');
  });

  it('returns nothing for an empty query — the panes behind the box are the whole list', () => {
    expect(find('   ')).toEqual([]);
  });

  it('caps the dropdown', () => {
    expect(find('a').length).toBeLessThanOrEqual(8);
  });

  it('keeps the terms array sorted the way the binary search compares', () => {
    const terms = indexFor('en').terms;
    expect(terms).toEqual([...terms].sort());
  });
});

describe('one index per locale', () => {
  it('searches the English gloss in the English interface, and not the Russian one', () => {
    expect(find('wait', 'en')).toContain('warten auf');
    expect(find('wait', 'ru')).toEqual([]);
  });

  it('searches the Russian gloss in the Russian interface, and not the English one', () => {
    expect(find('ждать', 'ru')).toContain('warten auf');
    expect(find('ждать', 'en')).toEqual([]);
  });

  it('keeps German findable in both — the subject does not translate', () => {
    expect(find('warten', 'en')).toEqual(find('warten', 'ru'));
    expect(find('über', 'ru').length).toBeGreaterThan(0);
  });

  it('indexes every pattern in both locales', () => {
    expect(indexFor('en').patterns).toHaveLength(rektionen.length);
    expect(indexFor('ru').patterns).toHaveLength(rektionen.length);
  });
});

describe('the typo pass', () => {
  it('recovers a German word from a slip, and says the match is approximate', () => {
    expect(find('sprechem')).toContain('sprechen mit');
    expect(isApproximate('sprechem')).toBe(true);
  });

  it('recovers a typo in the gloss too, not only in the German', () => {
    expect(find('waitt')).toContain('warten auf');
    expect(find('ждатъ', 'ru')).toContain('warten auf');
  });

  it('never runs when the exact pass found something', () => {
    expect(isApproximate('warten')).toBe(false);
    expect(isApproximate('bes')).toBe(false);
  });

  it('stays out of short words, where one edit reaches half the preposition table', () => {
    // `aur` is one edit from both `auf` and `aus`. Guessing between them is not help.
    expect(find('aur')).toEqual([]);
  });

  it('gives up rather than guessing wildly', () => {
    expect(find('qwertyuiop')).toEqual([]);
    expect(isApproximate('qwertyuiop')).toBe(false);
  });
});
