import { describe, expect, it } from 'vitest';
import { foldVariants, tokenize } from './fold';

describe('foldVariants', () => {
  it('gives an umlaut both foldings, so all three keyboards find the word', () => {
    expect(foldVariants('über')).toEqual(['uber', 'ueber']);
    expect(foldVariants('ärgern')).toEqual(['argern', 'aergern']);
    expect(foldVariants('gehören')).toEqual(['gehoren', 'gehoeren']);
  });

  it('gives a word without an umlaut exactly one', () => {
    expect(foldVariants('warten')).toEqual(['warten']);
  });

  it('folds ß to ss only — there is no competing convention', () => {
    expect(foldVariants('Straße')).toEqual(['strasse']);
  });

  it('treats a decomposed umlaut as an umlaut', () => {
    expect(foldVariants('über')).toEqual(foldVariants('über'));
  });

  it('leaves Cyrillic alone', () => {
    expect(foldVariants('ждать')).toEqual(['ждать']);
  });

  it('returns nothing for blank input', () => {
    expect(foldVariants('   ')).toEqual([]);
  });
});

describe('tokenize', () => {
  it('splits on punctuation and keeps both alphabets', () => {
    expect(tokenize('ждать, надеяться')).toEqual(['ждать', 'надеяться']);
    expect(tokenize('to wait for (someone)')).toEqual(['to', 'wait', 'for', 'someone']);
  });

  it('drops empties rather than returning blanks', () => {
    expect(tokenize('  —  ')).toEqual([]);
  });
});
