/**
 * Search folding — deliberately the opposite compromise from the URL folding in
 * `shared/lib/slug`.
 *
 * A URL needs exactly ONE spelling per page, so there `ü` becomes `ue` and nothing else.
 * A search box needs the reverse. Three people look for the same word: one with a German
 * keyboard types `über`, one without types `uber`, and one who knows the convention types
 * `ueber`. All three have to find it, so every German string is indexed under BOTH foldings
 * and the query is folded both ways too.
 *
 * `ß` has only one folding (`ss`) because there is no competing convention for it.
 */

type Table = ReadonlyArray<readonly [RegExp, string]>;

const BASE: Table = [
  [/ä/g, 'a'],
  [/ö/g, 'o'],
  [/ü/g, 'u'],
  [/ß/g, 'ss'],
];

const DIGRAPH: Table = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/ß/g, 'ss'],
];

function fold(value: string, table: Table): string {
  // NFC first: an umlaut typed as `u` + combining diaeresis is the same letter to the
  // reader and would slip past these patterns untouched.
  let folded = value.normalize('NFC').toLowerCase();
  for (const [pattern, replacement] of table) folded = folded.replace(pattern, replacement);
  // Whatever else carries a diacritic — loan words, a pasted Latin-1 gloss — loses it.
  return folded.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** One entry for a word with no umlaut, two for a word with one. Never empty strings. */
export function foldVariants(input: string): readonly string[] {
  const trimmed = input.trim();
  if (trimmed === '') return [];
  const base = fold(trimmed, BASE);
  const digraph = fold(trimmed, DIGRAPH);
  return base === digraph ? [base] : [base, digraph];
}

/** Splits on anything that is not a letter or a digit, so Cyrillic survives untouched. */
export function tokenize(input: string): readonly string[] {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token !== '');
}
