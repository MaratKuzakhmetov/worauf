import { describe, expect, it } from 'vitest';
import { strings } from './strings';
import { pluralRu } from './plural';

describe('pluralRu', () => {
  const form = (n: number): string => pluralRu(n, 'связка', 'связки', 'связок');

  it('agrees by the last digit', () => {
    expect(form(1)).toBe('связка');
    expect(form(3)).toBe('связки');
    expect(form(7)).toBe('связок');
  });

  it('sends the whole teens range to the last form', () => {
    expect(form(11)).toBe('связок');
    expect(form(12)).toBe('связок');
    expect(form(14)).toBe('связок');
  });

  it('agrees by the last two digits, not by size', () => {
    expect(form(21)).toBe('связка');
    expect(form(23)).toBe('связки');
    expect(form(111)).toBe('связок');
    expect(form(203)).toBe('связки');
  });
});

describe('counted nouns', () => {
  it('counts the real dataset the way a Russian speaker would', () => {
    expect(strings.ru.patterns(203)).toBe('203 связки');
    expect(strings.ru.words(167)).toBe('167 слов');
    expect(strings.ru.prepositions(16)).toBe('16 предлогов');
    expect(strings.ru.patterns(3)).toBe('3 связки');
  });

  it('still says "1 pattern" in English', () => {
    expect(strings.en.patterns(1)).toBe('1 pattern');
    expect(strings.en.patterns(3)).toBe('3 patterns');
  });
});
