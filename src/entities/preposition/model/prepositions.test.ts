import { describe, expect, it } from 'vitest';
import { daForm, prepositions, prepositionSlug, woForm } from './prepositions';

describe('the preposition table', () => {
  it('holds sixteen prepositions with unique keys', () => {
    expect(prepositions).toHaveLength(16);
    expect(new Set(prepositions.map((p) => p.key)).size).toBe(16);
  });

  it('folds to sixteen distinct slugs — a collision would be one page overwriting another', () => {
    const slugs = prepositions.map((p) => prepositionSlug(p.key));
    expect(new Set(slugs).size).toBe(16);
  });
});

describe('da- and wo- compounds', () => {
  it('inserts r before a vowel', () => {
    expect(daForm('auf')).toBe('darauf');
    expect(woForm('auf')).toBe('worauf');
    expect(daForm('über')).toBe('darüber');
    expect(woForm('an')).toBe('woran');
    expect(daForm('in')).toBe('darin');
    expect(daForm('unter')).toBe('darunter');
  });

  it('joins directly before a consonant', () => {
    expect(daForm('mit')).toBe('damit');
    expect(woForm('mit')).toBe('womit');
    expect(daForm('für')).toBe('dafür');
    expect(daForm('von')).toBe('davon');
    expect(woForm('nach')).toBe('wonach');
  });

  it('covers every preposition in the table without exception', () => {
    for (const { key } of prepositions) {
      expect(daForm(key).startsWith('da')).toBe(true);
      expect(woForm(key).startsWith('wo')).toBe(true);
    }
  });

  // The app is named after one of these forms, so it had better be right.
  it('produces the name of the app', () => {
    expect(woForm('auf')).toBe('worauf');
  });
});
