import { describe, expect, it } from 'vitest';
import { assignSlug, foldForSlug, isValidSlug } from './fold';

describe('foldForSlug', () => {
  it('transliterates umlauts through the ue variant, not the bare vowel', () => {
    expect(foldForSlug('über')).toBe('ueber');
    expect(foldForSlug('für')).toBe('fuer');
    expect(foldForSlug('zählen')).toBe('zaehlen');
    expect(foldForSlug('gehören')).toBe('gehoeren');
  });

  it('folds eszett to ss', () => {
    expect(foldForSlug('heißen')).toBe('heissen');
    expect(foldForSlug('Straße')).toBe('strasse');
  });

  it('drops reflexive sich — it is data, not identity', () => {
    expect(foldForSlug('sich freuen')).toBe('freuen');
    expect(foldForSlug('sich unterhalten')).toBe('unterhalten');
  });

  it('drops the noun article', () => {
    expect(foldForSlug('die Angst')).toBe('angst');
    expect(foldForSlug('das Recht')).toBe('recht');
  });

  it('does not mistake a word that merely starts with an article for an article', () => {
    expect(foldForSlug('dienen')).toBe('dienen');
    expect(foldForSlug('sichern')).toBe('sichern');
    expect(foldForSlug('denken')).toBe('denken');
  });

  it('produces only URL-safe characters', () => {
    for (const word of ['sich beklagen', 'die Angst', 'über', 'heißen', 'zusammenhängen']) {
      expect(isValidSlug(foldForSlug(word))).toBe(true);
    }
  });
});

describe('the sixteen prepositions', () => {
  // ADR 0002 claims all sixteen fold to distinct slugs. This is that claim, as a test.
  const prepositions = [
    'auf', 'an', 'über', 'mit', 'für', 'von', 'zu', 'in',
    'um', 'nach', 'aus', 'bei', 'vor', 'gegen', 'unter', 'zwischen',
  ];

  it('fold to sixteen distinct slugs', () => {
    const slugs = prepositions.map(foldForSlug);
    expect(new Set(slugs).size).toBe(prepositions.length);
  });

  it('all fold to valid slugs', () => {
    for (const slug of prepositions.map(foldForSlug)) {
      expect(isValidSlug(slug)).toBe(true);
    }
  });
});

describe('assignSlug', () => {
  it('returns the base slug when nothing has claimed it', () => {
    expect(assignSlug('schreiben', new Set())).toBe('schreiben');
  });

  it('suffixes numerically on collision', () => {
    expect(assignSlug('an', new Set(['an']))).toBe('an-2');
    expect(assignSlug('an', new Set(['an', 'an-2']))).toBe('an-3');
  });

  it('takes the lowest number never assigned', () => {
    expect(assignSlug('leben', new Set(['leben', 'leben-3']))).toBe('leben-2');
  });

  it('does not resurrect a retired slug', () => {
    // `taken` carries retired slugs too. Handing a freed slug to a different pattern would
    // make an old shared link resolve to the wrong thing — worse than not resolving at all.
    const everAssigned = new Set(['leben', 'leben-2' /* retired */]);
    expect(assignSlug('leben', everAssigned)).toBe('leben-3');
  });
});
